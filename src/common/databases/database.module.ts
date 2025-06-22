import { Global, Module } from '@nestjs/common';
import { PostgresConnection } from './postgre/postgre.config';

@Global()
@Module({
  providers: [PostgresConnection],
  exports: [PostgresConnection],
})
export class DatabaseModule {}
