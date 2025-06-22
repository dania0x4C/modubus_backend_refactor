import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis, { RedisOptions } from "ioredis";

type RedisConfig = RedisOptions & {
  keyPrefix: string;
};
@Injectable()
export class RedisConnection implements OnModuleInit, OnModuleDestroy {
  private connection: Redis;
  private config: RedisConfig;

  constructor() {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    this.config = {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: process.env.REDIS_PREFIX,
    };
    this.connection = new Redis(this.config);
    await this.connection.ping();
  }

  async disconnect(): Promise<void> {
    await this.connection?.quit();
  }

  getConnection(): Redis {
    return this.connection;
  }
}
