import { databaseExists, openDbConnection, getExecutedMigrations, listSqlFiles, migrationsDir, logDbTarget } from './db/common.mjs';

async function main() {
  logDbTarget();
  const exists = await databaseExists();
  if (!exists) {
    console.log('[status] database does not exist yet. Run: npm run db:migrate');
    return;
  }

  const connection = await openDbConnection({ multipleStatements: false });
  try {
    const migrationFiles = await listSqlFiles(migrationsDir);
    const executed = await getExecutedMigrations(connection);
    const pending = migrationFiles.filter((file) => !executed.has(file));

    console.log(`[status] migrations executed=${executed.size}, total=${migrationFiles.length}, pending=${pending.length}`);
    if (pending.length > 0) {
      pending.forEach((file) => console.log(`  pending: ${file}`));
    }

    const [tables] = await connection.query('SHOW TABLES');
    console.log(`[status] tables=${tables.length}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('[status] failed:', error.message);
  process.exit(1);
});
