import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { type IAuditService, IAuditLogInput, EventPhase } from '@tazama-lf/audit-lib';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * Audit interceptor for logging critical user actions
 * Implements fire-and-forget pattern to ensure audit failures don't block operations
 */
interface EventMetadata {
    description: string;
    eventType: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditInterceptor.name);

    constructor(@Inject('AUDIT_LOGGER') private readonly auditService: IAuditService) { }

    /**
     * Intercepts HTTP requests to critical endpoints and logs audit information
     */
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        this.logger.log('AuditInterceptor triggered');
        const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
        const response = context.switchToHttp().getResponse<Response>();
        const { user } = request;
        const startTime = Date.now();

        const correlationId = randomUUID();

        const baseAuditData = this.buildBaseAuditData(context, request, response, user);

        this.logAuditAsync(baseAuditData, EventPhase.INTENT, correlationId);

        return next.handle().pipe(
            tap((responseData) => {
                const auditData = {
                    ...baseAuditData,
                    outcome: {
                        statusCode: response.statusCode,
                        executionTimeMs: Date.now() - startTime,
                        responseSize: JSON.stringify(responseData ?? {}).length,
                        responseData: this.sanitizeData(responseData),
                    },
                };

                this.logAuditAsync(auditData, EventPhase.SUCCESS, correlationId);
            }),
            catchError((error) => {
                const auditData = {
                    ...baseAuditData,
                    outcome: {
                        error: error.message,
                        statusCode: error.status ?? 500,
                        executionTimeMs: Date.now() - startTime,
                    },
                };

                this.logAuditAsync(auditData, EventPhase.FAILED, correlationId);

                throw new Error(error);
            }),
        );
    }

    /**
     * Builds the base audit data from request context
     * @private
     */
    private buildBaseAuditData(
        context: ExecutionContext,
        request: Request,
        response: Response,
        user?: AuthenticatedUser,
    ): Omit<IAuditLogInput, 'correlationId' | 'eventPhase' | 'outcome'> {
        const { method, url, body, params, query, headers } = request;
        const handler = context.getHandler().name;
        const controller = context.getClass().name;
        const eventMeta = this.buildEventMetadata(method, url, handler);

        return {
            // User identification
            actorId: user?.userId ?? 'anonymous',
            actorName: this.extractUserName(user),
            actorRole: this.extractUserRole(user),

            // Resource information
            resourceId: this.extractResourceIdFromRequest(request) ?? this.extractResourceIdFromResponse(response),
            resourceType: this.mapControllerToResourceType(controller),

            // Request metadata
            sourceIp: this.extractSourceIp(request),

            description: eventMeta.description,
            eventType: eventMeta.eventType,
            tenantId: user?.tenantId ?? 'default',

            actionPerformed: {
                method,
                endpoint: url,
                handler,
                controller,
                userAgent: headers['user-agent'],
                requestBody: this.sanitizeData(body),
                pathParameters: params,
                queryParameters: query,
                timestamp: new Date().toISOString(),
            },
        };
    }

    /**
     * Extracts user role from authentication token
     * @private
     */
    private extractUserRole(user?: AuthenticatedUser): string {
        if (!user) return 'anonymous';

        if (user.validClaims.length > 0) {
            return user.validClaims[0];
        }

        if (user.token.claims.length > 0) {
            return user.token.claims[0];
        }

        return 'user';
    }

    /**
     * Extracts user display name from authentication token
     * @private
     */
    private extractUserName(user?: AuthenticatedUser): string {
        if (!user) return 'Anonymous User';

        return user.userId;
    }

    /**
     * Extracts resource ID from request parameters
     * @private
     */
    private extractResourceIdFromRequest(request: Request): string | undefined {
        const params = request.params as Record<string, string>;

        // Common resource ID parameter names
        return params.id || params.endpointId || params.tenantId || params.tenant_id || params.schedule_id || params.job_id || params.jobId || params.config_id || params.configId || params.schedule_id;
    }

    /**
     * Extracts resource ID from response data
     * @private
     */
    private extractResourceIdFromResponse(response: Response): string | undefined {
        const responseData = response.body;
        if (!responseData || typeof responseData !== 'object') return undefined;
        return responseData.id ?? responseData.endpointId ?? responseData.tenantId ?? responseData.tenant_id ?? responseData.schedule_id ?? responseData.job_id ?? responseData.jobId ?? responseData.config_id ?? responseData.configId ?? responseData.schedule_id;
    }

    /**
     * Extracts the real client IP address
     * @private
     */
    private extractSourceIp(request: Request): string {
        // Check various headers for real IP (load balancer, proxy scenarios)
        const xForwardedFor = request.headers['x-forwarded-for'] as string;
        const xRealIp = request.headers['x-real-ip'] as string;

        if (xForwardedFor) {
            return xForwardedFor.split(',')[0].trim();
        }

        if (xRealIp) {
            return xRealIp;
        }

        if (request.ip) {
            return request.ip;
        }

        return request.socket.remoteAddress ?? 'unknown';
    }

    /**
     * Maps controller class names to resource types
     * @private
     */
    private mapControllerToResourceType(controllerName: string): string {
        const resourceMapping: Record<string, string> = {
            AuthController: 'authentication',
            ConfigController: 'configuration',
            JobController: 'job',
            SchedulerController: 'scheduler',
            SftpController: 'sftp',
            SimulationController: 'simulation',
            TazamaDataModelController: 'tazama-data-model',
        };
        return resourceMapping[controllerName] ?? 'unknown';
    }

    /**
     * Builds human-readable description of the action
     * @private
     */
    private buildEventMetadata(method: string, url: string, handler: string): EventMetadata {
        const actionMap: Record<string, EventMetadata | undefined> = {
            login: {
                description: 'User authentication attempt',
                eventType: 'USER_AUTHENTICATION_ATTEMPT',
            },

            addMapping: {
                description: 'Added a new mapping to configuration',
                eventType: 'MAPPING_CREATED',
            },

            removeMapping: {
                description: 'Removed a mapping from configuration',
                eventType: 'MAPPING_DELETED',
            },

            createConfig: {
                description: 'Created a new configuration',
                eventType: 'CONFIGURATION_CREATED',
            },

            updateConfig: {
                description: 'Updated an existing configuration',
                eventType: 'CONFIGURATION_UPDATED',
            },

            addFunction: {
                description: 'Added a new function to configuration',
                eventType: 'FUNCTION_CREATED',
            },

            removeFunction: {
                description: 'Removed a function from configuration',
                eventType: 'FUNCTION_DELETED',
            },

            workflow: {
                description: 'Performed a workflow action on configuration',
                eventType: 'WORKFLOW_ACTION',
            },

            updateConfigStatus: {
                description: 'Updated configuration status',
                eventType: 'CONFIGURATION_STATUS_UPDATED',
            },

            updatePublishingStatus: {
                description: 'Updated configuration publishing status',
                eventType: 'CONFIGURATION_PUBLISHING_STATUS_UPDATED',
            },

            getAllConfigs: {
                description: 'Retrieved all configurations',
                eventType: 'CONFIGURATION_LISTED',
            },

            createPushJob: {
                description: 'Created a new push job',
                eventType: 'PUSH_JOB_CREATED',
            },

            createPullJob: {
                description: 'Created a new pull job',
                eventType: 'PULL_JOB_CREATED',
            },

            updateJob: {
                description: 'Updated an existing job',
                eventType: 'JOB_UPDATED',
            },

            updateJobStatus: {
                description: 'Updated job status',
                eventType: 'JOB_STATUS_UPDATED',
            },

            updateJobActivation: {
                description: 'Updated job activation status',
                eventType: 'JOB_ACTIVATION_STATUS_UPDATED',
            },

            createSchedule: {
                description: 'Created a new scheduled job',
                eventType: 'SCHEDULED_JOB_CREATED',
            },

            updateSchedule: {
                description: 'Updated an existing scheduled job',
                eventType: 'SCHEDULED_JOB_UPDATED',
            },

            updateScheduleStatus: {
                description: 'Updated scheduled job status',
                eventType: 'SCHEDULED_JOB_STATUS_UPDATED',
            },

            simulateMapping: {
                description: 'Simulated a mapping with test payload',
                eventType: 'MAPPING_SIMULATION_RUN',
            },

            putDataModelJson: {
                description: 'Updated the Tazama data model JSON',
                eventType: 'DATA_MODEL_UPDATED',
            },

        } as const satisfies Record<string, EventMetadata>;

        if (actionMap[handler]) { return actionMap[handler]; }

        return {
            description: `${method} request to ${url}`,
            eventType: 'UNKNOWN_EVENT',
        };
    }
    /**
     * Removes sensitive information from request body
     * @private
     */
    private sanitizeData(body: unknown): unknown {
        if (!body || typeof body !== 'object') {
            return body;
        }

        // Remove sensitive fields that should never be logged
        const { password, token, secret, key, auth, credential, ...cleanBody } = body as Record<string, unknown>;;

        // Truncate large payloads to prevent storage bloat
        const serialized = JSON.stringify(cleanBody);
        if (serialized.length > 10000) {
            return { _truncated: true, _originalSize: serialized.length };
        }
        return cleanBody;
    }
    /**
     * Logs audit data asynchronously without blocking the main operation
     * @private
     */
    private logAuditAsync(auditData: Omit<IAuditLogInput, 'correlationId' | 'eventPhase'>, eventPhase: EventPhase, correlationId: string,): void {
        const auditInput: IAuditLogInput = { ...auditData, correlationId, eventPhase, };

        this.auditService.log(auditInput).catch((error: unknown) => {
            const errorMessage = error instanceof Error ? error.message : String(error);

            this.logger.error(`Audit logging failed for ${auditData.eventType} by ${auditData.actorName}`,
                {
                    error: errorMessage,
                    eventPhase,
                    correlationId,
                },
            );
        });
    }
}