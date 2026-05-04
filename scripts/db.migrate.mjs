import { migrationsDir, listSqlFiles, readSqlFile, sha256, openDbConnection, getExecutedMigrations, runSql, logDbTarget } from './db/common.mjs';

async function main() {
  logDbTarget();
  const connection = await openDbConnection({ multipleStatements: true });
  try {
    const files = await listSqlFiles(migrationsDir);
    const executed = await getExecutedMigrations(connection);
    let appliedCount = 0;

    for (const file of files) {
      const sql = await readSqlFile(migrationsDir, file);
      const checksum = sha256(sql);
      const current = executed.get(file);

      if (current) {
        if (current.checksum !== checksum) {
          throw new Error(`Migration checksum changed after execution: ${file}`);
        }
        console.log(`[migrate] skip ${file}`);
        continue;
      }

      console.log(`[migrate] apply ${file}`);
      await connection.beginTransaction();
      try {
        await runSql(connection, sql);
        await connection.query('INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)', [file, checksum]);
        await connection.commit();
        appliedCount += 1;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }

    console.log(`[migrate] done. applied=${appliedCount}, total=${files.length}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('[migrate] failed:', error.message);
  process.exit(1);
});
