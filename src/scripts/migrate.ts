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
  console.log(
    `Attempting to connect to database with URL: ${url ? url.substring(0, 20) + '...' : 'undefined'}`,
  );

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Connection attempt ${i + 1}/${retries}`);
      const ds = new DataSource({ type: 'postgres', url });
      await ds.initialize();
      console.log('Database connection successful');
      await ds.destroy();
      return;
    } catch (e) {
      console.log(
        `DB not ready, retrying in ${delay}ms... Error: ${e.message}`,
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error('Database never became ready');
}

async function runMigrations() {
  try {
    console.log('Starting migration process...');
    console.log('Environment variables:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('- isFlyDatabase:', isFlyDatabase);

    await waitForDb(databaseUrl);
    console.log(
      'Database connection established, initializing AppDataSource...',
    );
    await AppDataSource.initialize();
    console.log('AppDataSource initialized, running migrations...');
    await AppDataSource.runMigrations();
    console.log('Migrations completed successfully');
    await AppDataSource.destroy();
    console.log('Migration process completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    process.exit(1);
  }
}

runMigrations();
