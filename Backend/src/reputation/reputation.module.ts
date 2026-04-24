import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module';
import { ReputationController } from './reputation.controller';
import { ReputationService } from './reputation.service';
import { ActivityLoggingService } from './services/activity-logging.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ReputationController],
  providers: [ReputationService, ActivityLoggingService],
  exports: [ReputationService, ActivityLoggingService],
})
export class ReputationModule {}
