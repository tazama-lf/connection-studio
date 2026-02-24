import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigUtilsService {
  generateEndpointPath(
    tenantId: string,
    version: string,
    transactionType: string,
    msgFam?: string,
  ): string {
    const basePath = `/${tenantId}/${version}`;
    if (msgFam?.trim()) {
      return `${basePath}/${msgFam}/${transactionType}`;
    }
    return `${basePath}/${transactionType}`;
  }

  buildDuplicateConfigMessage(
    msgFam: string,
    transactionType: string,
    version: string,
  ): string {
    return `Config with message family '${msgFam}', transaction type '${transactionType}', and version '${version}' already exists for this tenant. Please use different values.`;
  }

  buildUserErrorMessage(
    error: unknown,
    msgFam: string,
    transactionType: string,
    version: string,
  ): string {
    let userMessage =
      'Failed to create configuration. Please check your input and try again.';

    const errorMessage = error instanceof Error ? error.message : undefined;

    const isDuplicateKey =
      errorMessage?.includes('duplicate key value') ?? false;
    const isUniqueConstraint =
      errorMessage?.includes('unique constraint') ?? false;

     
    if (isDuplicateKey || isUniqueConstraint) {
      userMessage = `A configuration with Message Family '${msgFam}', Transaction Type '${transactionType}', and Version '${version}' already exists. Please use different values.`;
    } else if (errorMessage?.includes('validation')) {
      userMessage = `Validation error: ${errorMessage}`;
    } else if (errorMessage?.includes('schema')) {
      userMessage = `Schema error: ${errorMessage}`;
    } else if (errorMessage) {
      userMessage = errorMessage;
    }

    return userMessage;
  }
}
