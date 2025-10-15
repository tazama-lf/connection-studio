import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { StartProcessDto } from './dto/start-process.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';

@Injectable()
export class FlowableService {
  private readonly logger = new Logger(FlowableService.name);
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly debug: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const flowableUrl = this.configService.get<string>('FLOWABLE_URL');
    const flowableUser = this.configService.get<string>('FLOWABLE_USER');
    const flowablePass = this.configService.get<string>('FLOWABLE_PASS');
    this.debug = this.configService.get<string>('FLOWABLE_DEBUG') === 'true';

    if (!flowableUrl || !flowableUser || !flowablePass) {
      this.logger.warn(
        'Flowable configuration incomplete. Set FLOWABLE_URL, FLOWABLE_USER, and FLOWABLE_PASS environment variables.',
      );
    }

    this.baseUrl = flowableUrl
      ? `${flowableUrl}/flowable-rest/service`
      : 'http://localhost:8080/flowable-rest/service';

    const credentials = Buffer.from(`${flowableUser}:${flowablePass}`).toString(
      'base64',
    );
    this.authHeader = `Basic ${credentials}`;

    this.logger.log(
      `Flowable service initialized with base URL: ${this.baseUrl}`,
    );
  }

  async startProcess(dto: StartProcessDto, configData?: any): Promise<any> {
    const url = `${this.baseUrl}/runtime/process-instances`;

    const variables: any[] = [
      { name: 'configId', value: dto.configId },
      { name: 'tenantId', value: dto.tenantId },
      { name: 'initiator', value: dto.initiator },
    ];

    if (configData) {
      variables.push(
        { name: 'msgFam', value: configData.msgFam || '' },
        { name: 'transactionType', value: configData.transactionType },
        { name: 'endpointPath', value: configData.endpointPath },
        { name: 'version', value: configData.version },
        { name: 'contentType', value: configData.contentType },
        {
          name: 'schema',
          value: JSON.stringify(configData.schema),
          type: 'string',
        },
        {
          name: 'mapping',
          value: configData.mapping ? JSON.stringify(configData.mapping) : null,
          type: 'string',
        },
        {
          name: 'fieldAdjustments',
          value: configData.fieldAdjustments
            ? JSON.stringify(configData.fieldAdjustments)
            : null,
          type: 'string',
        },
        {
          name: 'originalPayload',
          value: configData.originalPayload,
          type: 'string',
        },
        { name: 'createdBy', value: configData.createdBy },
        { name: 'workflowStatus', value: 'pending_approval' },
      );
    }

    const payload = {
      processDefinitionKey: 'config-approval-process',
      businessKey: `config-${dto.configId}`,
      variables,
    };

    if (this.debug) {
      this.logger.debug(`[START PROCESS] URL: ${url}`);
      this.logger.debug(
        `[START PROCESS] Payload: ${JSON.stringify(payload, null, 2)}`,
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/json',
          },
        }),
      );

      if (this.debug) {
        this.logger.debug(
          `[START PROCESS] Response: ${JSON.stringify(response.data, null, 2)}`,
        );
      }

      this.logger.log(
        `Process started: ${response.data.id} for config ${dto.configId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to start process: ${error.message}`,
        error.stack,
      );

      // Log the full error response from Flowable
      if (error.response) {
        this.logger.error(
          `Flowable error response: ${JSON.stringify(error.response.data, null, 2)}`,
        );
      }

      throw new Error(`Flowable API error: ${error.message}`);
    }
  }

  async getTasksForRole(role: string): Promise<any[]> {
    const url = `${this.baseUrl}/runtime/tasks`;
    const params = { candidateGroup: role };

    if (this.debug) {
      this.logger.debug(`[GET TASKS] URL: ${url}`);
      this.logger.debug(`[GET TASKS] Params: ${JSON.stringify(params)}`);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params,
          headers: {
            Authorization: this.authHeader,
          },
        }),
      );

      if (this.debug) {
        this.logger.debug(
          `[GET TASKS] Response: ${JSON.stringify(response.data, null, 2)}`,
        );
      }

      this.logger.log(
        `Retrieved ${response.data.data?.length || 0} tasks for role: ${role}`,
      );
      return response.data.data || [];
    } catch (error) {
      this.logger.error(
        `Failed to get tasks for role ${role}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Flowable API error: ${error.message}`);
    }
  }

  async completeTask(dto: CompleteTaskDto): Promise<any> {
    const url = `${this.baseUrl}/runtime/tasks/${dto.taskId}`;
    const payload = {
      action: 'complete',
      variables: Object.entries(dto.variables).map(([name, value]) => ({
        name,
        value,
      })),
    };

    if (this.debug) {
      this.logger.debug(`[COMPLETE TASK] URL: ${url}`);
      this.logger.debug(
        `[COMPLETE TASK] Payload: ${JSON.stringify(payload, null, 2)}`,
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/json',
          },
        }),
      );

      if (this.debug) {
        this.logger.debug(
          `[COMPLETE TASK] Response: ${JSON.stringify(response.data, null, 2)}`,
        );
      }

      this.logger.log(`Task completed: ${dto.taskId}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to complete task ${dto.taskId}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Flowable API error: ${error.message}`);
    }
  }
  async startWorkflowWithDraft(
    configData: any,
    tenantId: string,
    userId: string,
  ): Promise<{ processInstanceId: string; configId: string }> {
    try {
      const configId =
        configData.configId ||
        `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const startDto: StartProcessDto = {
        configId,
        tenantId,
        initiator: userId,
      };

      const flowableConfigData = {
        msgFam: configData.msgFam || '',
        transactionType: configData.transactionType,
        endpointPath: configData.endpointPath,
        version: configData.version,
        contentType: configData.contentType,
        schema: configData.schema,
        mapping: configData.mapping,
        fieldAdjustments: configData.fieldAdjustments,
        originalPayload: configData.originalPayload,
        createdBy: userId,
      };

      const processResponse = await this.startProcess(
        startDto,
        flowableConfigData,
      );
      const processInstanceId = processResponse.id;

      this.logger.log(
        `Started workflow process: ${processInstanceId} for config ${configId}`,
      );

      return { processInstanceId, configId };
    } catch (error) {
      this.logger.error(
        `Failed to start workflow with draft: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getProcessInstanceById(processInstanceId: string): Promise<any> {
    const url = `${this.baseUrl}/runtime/process-instances/${processInstanceId}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: this.authHeader,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to get process instance: ${error.message}`,
        error.stack,
      );
      throw new Error(`Flowable API error: ${error.message}`);
    }
  }

  async getProcessVariables(processInstanceId: string): Promise<any[]> {
    const url = `${this.baseUrl}/runtime/process-instances/${processInstanceId}/variables`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: this.authHeader,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to get process variables: ${error.message}`,
        error.stack,
      );
      throw new Error(`Flowable API error: ${error.message}`);
    }
  }

  async getConfigFromProcess(processInstanceId: string): Promise<any> {
    try {
      const variables = await this.getProcessVariables(processInstanceId);

      const configData: any = {};
      variables.forEach((v: any) => {
        configData[v.name] = v.value;
      });

      if (configData.schema && typeof configData.schema === 'string') {
        try {
          configData.schema = JSON.parse(configData.schema);
        } catch (e) {
          this.logger.warn(`Failed to parse schema JSON: ${e.message}`);
        }
      }

      if (configData.mapping && typeof configData.mapping === 'string') {
        try {
          configData.mapping = JSON.parse(configData.mapping);
        } catch (e) {
          this.logger.warn(`Failed to parse mapping JSON: ${e.message}`);
        }
      }

      if (
        configData.fieldAdjustments &&
        typeof configData.fieldAdjustments === 'string'
      ) {
        try {
          configData.fieldAdjustments = JSON.parse(configData.fieldAdjustments);
        } catch (e) {
          this.logger.warn(
            `Failed to parse fieldAdjustments JSON: ${e.message}`,
          );
        }
      }

      return configData;
    } catch (error) {
      this.logger.error(
        `Failed to get config from process: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getActiveProcesses(tenantId?: string): Promise<any[]> {
    const url = `${this.baseUrl}/runtime/process-instances`;

    try {
      const params: any = {
        processDefinitionKey: 'config-approval-process',
      };

      if (tenantId) {
        params.tenantId = tenantId;
      }

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: this.authHeader,
          },
          params,
        }),
      );

      return response.data?.data || [];
    } catch (error) {
      this.logger.error(
        `Failed to get active processes: ${error.message}`,
        error.stack,
      );
      throw new Error(`Flowable API error: ${error.message}`);
    }
  }

  async getTasksForUser(userId: string): Promise<any[]> {
    const url = `${this.baseUrl}/runtime/tasks`;
    const params = { assignee: userId };

    if (this.debug) {
      this.logger.debug(`[GET USER TASKS] URL: ${url}`);
      this.logger.debug(`[GET USER TASKS] Params: ${JSON.stringify(params)}`);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params,
          headers: {
            Authorization: this.authHeader,
          },
        }),
      );

      if (this.debug) {
        this.logger.debug(
          `[GET USER TASKS] Response: ${JSON.stringify(response.data, null, 2)}`,
        );
      }

      this.logger.log(
        `Retrieved ${response.data.data?.length || 0} tasks for user: ${userId}`,
      );
      return response.data.data || [];
    } catch (error) {
      this.logger.error(
        `Failed to get tasks for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Flowable API error: ${error.message}`);
    }
  }
}
