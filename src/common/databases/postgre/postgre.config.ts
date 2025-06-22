import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

type PostgresConfig = TypeOrmModuleOptions & {
  type: 'postgres';
};

const dbConfig: PostgresConfig = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [`${__dirname}/../../**/*.entity{.ts,.js}`],
  synchronize: process.env.NODE_ENV === 'local',
};

@Injectable()
export class PostgresConnection {
  private connection: DataSource;

  constructor() {
    // 생성 시 아무 작업 하지 않음
  }

  async connect(): Promise<void> {
    this.connection = new DataSource(dbConfig);
    await this.connection.initialize();
  }

  async disconnect(): Promise<void> {
    await this.connection?.destroy();
  }

  getConnection(): DataSource {
    return this.connection;
  }

  getTypeOrmConfig(): PostgresConfig {
    return dbConfig;
  }
}

// TypeORM CLI를 위한 데이터소스
export const dataSource = new DataSource({
  ...dbConfig,
  migrations: [`${__dirname}/migrations/**/*{.ts,.js}`],
  logging: true,
});
