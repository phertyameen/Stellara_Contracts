import { Injectable } from '@nestjs/common';
import { RabbitMqService } from './rabbitmq.service';
import type { EventName } from './rabbitmq.types';

@Injectable()
export class EventBusService {
  constructor(private readonly rabbit: RabbitMqService) {}

  async publish<T>(eventName: EventName, payload: T, correlationId?: string): Promise<string> {
    return this.rabbit.publish(eventName, payload, { correlationId });
  }
}

