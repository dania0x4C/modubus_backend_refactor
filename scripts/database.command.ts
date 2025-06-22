import { Injectable } from '@nestjs/common';
import { execSync } from 'child_process';
import { Command, Positional } from 'nestjs-command';
import { PostgresConnection } from '../src/common/databases/postgre/postgre.config';

@Injectable()
export class DatabaseCommand {
  constructor(private readonly postgresConnection: PostgresConnection) {}

  private get dataSource() {
    return this.postgresConnection.getConnection();
  }

  @Command({
    command: 'db:migrate <name>',
    describe: 'Generate a new migration file with the specified name',
  })
  async migrate(
    @Positional({
      name: 'name',
      describe: 'the migration name',
      type: 'string',
    })
    name: string,
  ) {
    try {
      await this.postgresConnection.connect();
      console.log(`Generating migration: ${name}...`);

      const command = `npm run typeorm migration:generate ./src/common/databases/postgre/migrations/${name} -d ./src/common/databases/postgre/postgre.config.ts`;
      execSync(command, { stdio: 'inherit' });
      console.log(`Migration ${name} generated successfully!`);
    } catch (error) {
      console.error('Error generating migration:', error.message);
    } finally {
      await this.postgresConnection.disconnect();
    }
  }

  @Command({
    command: 'db:sync',
    describe: 'Run all pending migrations',
  })
  async sync() {
    try {
      await this.postgresConnection.connect();
      console.log('Running migrations...');
      await this.dataSource.runMigrations();
      console.log('Migrations applied successfully!');
    } catch (error) {
      console.error(error);
    } finally {
      await this.postgresConnection.disconnect();
    }
  }

  @Command({
    command: 'db:revert',
    describe: 'Revert the last executed migration',
  })
  async revert() {
    try {
      await this.postgresConnection.connect();
      console.log('Reverting last migration...');
      await this.dataSource.undoLastMigration();
      console.log('Migration reverted successfully!');
    } catch (error) {
      console.error(error);
    } finally {
      await this.postgresConnection.disconnect();
    }
  }

  @Command({
    command: 'db:show',
    describe: 'Show all pending and executed migrations',
  })
  async show() {
    try {
      // ✅ 핵심: 최초 호출
      await this.postgresConnection.connect();

      const executedMigrations = await this.dataSource.query(
        'SELECT * FROM "migrations"',
      );
      const executedMigrationNames = executedMigrations.map(
        (migration: any) => migration.name,
      );
      const registeredMigrations = this.dataSource.migrations.map(
        (migration: any) => migration.name,
      );
      const allMigrations = registeredMigrations.map((name: string) => ({
        name,
        status: executedMigrationNames.includes(name) ? '[X]' : '[ ]',
      }));

      const recentMigrations = allMigrations.reverse().slice(-20);
      recentMigrations.forEach((migration, index) => {
        console.log(
          `${migration.status} ${Math.max(allMigrations.length - 20, 0) + index + 1} ${migration.name}`,
        );
      });
    } catch (error) {
      console.error('Error showing migrations:', error);
    } finally {
      await this.postgresConnection.disconnect();
    }
  }
}
