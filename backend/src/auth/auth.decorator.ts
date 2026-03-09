import { SetMetadata } from '@nestjs/common';

export const CLAIMS_KEY = 'claims';
export const IS_PUBLIC_KEY = 'isPublic';
export const ANY_CLAIMS_KEY = 'anyClaims';
/**
 * Decorator to specify required claims for a route
 * @param claims - Array of required claims (all must be present)
 */
export const RequireClaims = (
  ...claims: string[]
): ReturnType<typeof SetMetadata> => SetMetadata(CLAIMS_KEY, claims);

/**
 * Decorator to specify claims where ANY of them can satisfy the requirement
 * @param claims - Array of claims (user needs at least one)
 */
export const RequireAnyClaims = (
  ...claims: string[]
): ReturnType<typeof SetMetadata> => SetMetadata(ANY_CLAIMS_KEY, claims);

export const Public = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Decorator to specify a single claim requirement
 * @param claim - Single required claim
 */
export const RequireClaim = (claim: string): ReturnType<typeof SetMetadata> =>
  SetMetadata(CLAIMS_KEY, [claim]);

export const TazamaClaims = {
  EDITOR: 'editor',
  APPROVER: 'approver',
  PUBLISHER: 'publisher',
  EXPORTER: 'exporter',
  MANAGE_ACCOUNT: 'manage-account',
  MANAGE_ACCOUNT_LINKS: 'manage-account-links',
  VIEW_PROFILE: 'view-profile',
  DEFAULT_ROLES_TAZAMA_CMS: 'default-roles-tazama-cms',
  OFFLINE_ACCESS: 'offline_access',
  UMA_AUTHORIZATION: 'uma_authorization',
} as const;

export const RequireEditorRole = (): ReturnType<typeof SetMetadata> =>
  RequireClaim(TazamaClaims.EDITOR);
export const RequireApproverRole = (): ReturnType<typeof SetMetadata> =>
  RequireClaim(TazamaClaims.APPROVER);
export const RequireExporterRole = (): ReturnType<typeof SetMetadata> =>
  RequireClaim(TazamaClaims.EXPORTER);
export const RequirePublisherRole = (): ReturnType<typeof SetMetadata> =>
  RequireClaim(TazamaClaims.PUBLISHER);
export const RequireAccountManagement = (): ReturnType<typeof SetMetadata> =>
  RequireClaims(TazamaClaims.MANAGE_ACCOUNT, TazamaClaims.MANAGE_ACCOUNT_LINKS);
