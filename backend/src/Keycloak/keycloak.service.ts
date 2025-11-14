import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface KeycloakUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
}

interface KeycloakGroup {
  id: string;
  name: string;
  path: string;
}

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private readonly keycloakUrl: string;
  private readonly keycloakRealm: string;
  private readonly keycloakClientId: string;
  private readonly keycloakClientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.keycloakUrl =
      this.configService.get<string>('KEYCLOAK_URL') || 'http://localhost:8080';
    this.keycloakRealm =
      this.configService.get<string>('KEYCLOAK_REALM') || 'tazama';
    this.keycloakClientId =
      this.configService.get<string>('KEYCLOAK_CLIENT_ID') || 'admin-cli';
    this.keycloakClientSecret =
      this.configService.get<string>('KEYCLOAK_CLIENT_SECRET') || '';
  }

  private async getAdminToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const tokenUrl = `${this.keycloakUrl}/realms/${this.keycloakRealm}/protocol/openid-connect/token`;
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.keycloakClientId,
        client_secret: this.keycloakClientSecret,
      });

      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      if (!this.accessToken) {
        throw new Error('Failed to obtain access token from Keycloak');
      }

      return this.accessToken;
    } catch (error) {
      this.logger.error(`Failed to get Keycloak admin token: ${error}`);
      throw error;
    }
  }

  async getUsersInTenant(tenantId: string): Promise<KeycloakUser[]> {
    try {
      const token = await this.getAdminToken();
      this.logger.log(`Looking for tenant group: ${tenantId}`);

      const groupsUrl = `${this.keycloakUrl}/admin/realms/${this.keycloakRealm}/groups?briefRepresentation=false`;

      const groupsResponse = await firstValueFrom(
        this.httpService.get(groupsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      const groups = groupsResponse.data as KeycloakGroup[];

      const tenantGroup = groups.find(
        (g) =>
          g.name === tenantId ||
          g.name.toLowerCase() === tenantId.toLowerCase() ||
          g.path === `/${tenantId}` ||
          g.path.toLowerCase() === `/${tenantId.toLowerCase()}`,
      );

      if (!tenantGroup) {
        this.logger.warn(`Tenant group not found: ${tenantId}`);
        this.logger.debug(
          `Available groups: ${groups.map((g) => `${g.name} (${g.path})`).join(', ')}`,
        );
        return [];
      }

      this.logger.log(
        `Found tenant group: ${tenantGroup.name} (ID: ${tenantGroup.id})`,
      );

      const usersUrl = `${this.keycloakUrl}/admin/realms/${this.keycloakRealm}/groups/${tenantGroup.id}/members`;
      const usersResponse = await firstValueFrom(
        this.httpService.get(usersUrl, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      return usersResponse.data as KeycloakUser[];
    } catch (error) {
      this.logger.error(`Failed to get users in tenant ${tenantId}: ${error}`);
      return [];
    }
  }

  async getUsersByRole(
    tenantId: string,
    role: string,
  ): Promise<KeycloakUser[]> {
    try {
      const allUsers = await this.getUsersInTenant(tenantId);
      const token = await this.getAdminToken();
      const usersWithRole: KeycloakUser[] = [];

      for (const user of allUsers) {
        const rolesUrl = `${this.keycloakUrl}/admin/realms/${this.keycloakRealm}/users/${user.id}/role-mappings/realm/composite`;
        const rolesResponse = await firstValueFrom(
          this.httpService.get(rolesUrl, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        );

        const roles = rolesResponse.data as Array<{ name: string }>;
        if (roles.some((r) => r.name === role)) {
          usersWithRole.push(user);
        }
      }

      return usersWithRole;
    } catch (error) {
      this.logger.error(`Failed to get users by role ${role}: ${error}`);
      return [];
    }
  }

  async getEmailsByRole(tenantId: string, role: string): Promise<string[]> {
    const users = await this.getUsersByRole(tenantId, role);
    this.logger.log(
      `Fetched ${users.length} users for role '${role}' in tenant '${tenantId}'`,
    );
    return users
      .filter((u) => u.email && u.email.trim() !== '')
      .map((u) => u.email!);
  }

  async getAllEmails(tenantId: string): Promise<string[]> {
    this.logger.log(`Fetching all users in tenant '${tenantId}'`);
    const users = await this.getUsersInTenant(tenantId);
    this.logger.log(`Fetched ${users.length} users in tenant '${tenantId}'`);
    return users
      .filter((u) => u.email && u.email.trim() !== '')
      .map((u) => u.email!);
  }
}
