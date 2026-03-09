import {
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { map, type Observable } from 'rxjs';

type Constructor<T> = new (...args: any[]) => T;

export function Serialize<T>(
  dto: Constructor<T>,
): MethodDecorator & ClassDecorator {
  return UseInterceptors(new SerializeInterceptor(dto));
}

export class SerializeInterceptor<T> implements NestInterceptor {
  constructor(private readonly dto: Constructor<T>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) =>
        plainToInstance(this.dto, data, {
          excludeExtraneousValues: true,
        }),
      ),
    );
  }
}
