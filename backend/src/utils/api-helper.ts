import { HttpException, HttpStatus } from '@nestjs/common';
import type { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export async function executeHttpRequest<T>(
  httpService: HttpService,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  baseUrl: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const url = `${baseUrl}${path}`;

  const headers = {
    Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
  };

  try {
    let response;

    switch (method) {
      case 'GET':
        response = await firstValueFrom(httpService.get(url, { headers }));
        break;

      case 'POST':
        response = await firstValueFrom(
          httpService.post(url, body, { headers }),
        );
        break;

      case 'PUT':
        response = await firstValueFrom(
          httpService.put(url, body, { headers }),
        );
        break;

      case 'DELETE':
        response = await firstValueFrom(
          httpService.delete(url, {
            headers,
            data: body,
          }),
        );
        break;

      case 'PATCH':
        response = await firstValueFrom(
          httpService.patch(url, body, { headers }),
        );
        break;
    }

    return response.data as T;
  } catch (error) {
    handleError(error);
  }
}

function handleError(error: unknown): never {
  const err = error as {
    response?: { status: number; data: unknown };
    request?: unknown;
    message: string;
  };
  if (err.response) {
    const { status, data } = err.response;
    const message =
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : 'DEAPI service returned an error response';
    throw new HttpException(message, status || HttpStatus.BAD_GATEWAY);
  }

  if (err.request) {
    throw new HttpException(
      'Service is unavailable',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  throw new HttpException(
    'Internal server error',
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
