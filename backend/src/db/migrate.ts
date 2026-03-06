/**
 * Migration runner — executes pending TypeORM migrations.
 *
 * Usage: pnpm migrate
 */
import dataSource from './data-source';

async function main(): Promise<void> {
  console.log('Initializing data source...');
  await dataSource.initialize();

  console.log('Running pending migrations...');
  const migrations = await dataSource.runMigrations();

  if (migrations.length === 0) {
    console.log('No pending migrations.');
  } else {
    console.log(`Executed ${migrations.length} migration(s):`);
    for (const m of migrations) {
      console.log(`  - ${m.name}`);
    }
  }

  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
