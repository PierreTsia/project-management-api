import { DataSource } from 'typeorm';
import { config } from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  config();
}

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL || '';

console.log('isProduction', isProduction);
console.log('databaseUrl', databaseUrl);

// Only use SSL for actual production databases (like Fly.io)
// Local Docker databases don't need SSL
const isFlyDatabase =
  databaseUrl.includes('fly.io') ||
  databaseUrl.includes('flycast') ||
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

async function waitForDb(url: string, retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const ds = new DataSource({ type: 'postgres', url });
      await ds.initialize();
      await ds.destroy();
      return;
    } catch (e) {
      console.log(`DB not ready, retrying in ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error('Database never became ready');
}

async function runMigrations() {
  try {
    await waitForDb(databaseUrl);
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
