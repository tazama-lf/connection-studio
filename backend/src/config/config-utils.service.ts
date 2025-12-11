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
    error: any,
    msgFam: string,
    transactionType: string,
    version: string,
  ): string {
    let userMessage =
      'Failed to create configuration. Please check your input and try again.';

    const isDuplicateKey =
      error.message?.includes('duplicate key value') ?? false;
    const isUniqueConstraint =
      error.message?.includes('unique constraint') ?? false;

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- logical OR needed for boolean values
    if (isDuplicateKey || isUniqueConstraint) {
      userMessage = `A configuration with Message Family '${msgFam}', Transaction Type '${transactionType}', and Version '${version}' already exists. Please use different values.`;
    } else if (error.message?.includes('validation')) {
      userMessage = `Validation error: ${error.message}`;
    } else if (error.message?.includes('schema')) {
      userMessage = `Schema error: ${error.message}`;
    } else if (error.message) {
      userMessage = error.message;
    }

    return userMessage;
  }
}
