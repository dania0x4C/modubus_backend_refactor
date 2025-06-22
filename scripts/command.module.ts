import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { DatabaseCommand } from './database.command';
import { DatabaseModule } from '../src/common/databases/database.module';
@Module({
  imports: [CommandModule, DatabaseModule],
  providers: [DatabaseCommand],
})
export class CustomCommandModule {}
