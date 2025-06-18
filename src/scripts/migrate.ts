import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL || '';

// Only use SSL for actual production databases (like Fly.io)
// Local Docker databases don't need SSL
const isFlyDatabase =
  databaseUrl.includes('fly.io') ||
  databaseUrl.includes('supabase') ||
  databaseUrl.includes('heroku');

const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  ...(isProduction &&
    isFlyDatabase && {
      ssl: {
        rejectUnauthorized: false,
      },
    }),
});

async function runMigrations() {
  try {
    await AppDataSource.initialize();
    console.log('Running migrations...');
    await AppDataSource.runMigrations();
    console.log('Migrations completed successfully');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();
