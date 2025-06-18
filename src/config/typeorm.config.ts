import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();
const databaseUrl = configService.get('DATABASE_URL') || '';

// Only use SSL for actual production databases (like Fly.io)
// Local Docker databases don't need SSL
const isFlyDatabase =
  databaseUrl.includes('fly.io') ||
  databaseUrl.includes('flycast') ||
  databaseUrl.includes('supabase') ||
  databaseUrl.includes('heroku');

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  migrationsTableName: 'migrations',
  ...(isFlyDatabase && {
    ssl: {
      rejectUnauthorized: false,
    },
  }),
});
