import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    // Set query timeout to 30 seconds to prevent hanging queries
    this.$executeRawUnsafe('SET statement_timeout = 30000');
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
