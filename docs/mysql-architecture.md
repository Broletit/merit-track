# MySQL architecture

The application runtime uses `mysql2/promise` through `src/server/db/mysql.ts`. There is no SQLite fallback. `better-sqlite3` is a development dependency for importing the previous database and legacy regression fixtures only.

## Database lifecycle

`database/mysql/schema.sql` contains the complete baseline, including the 49 tables inspected in the actual SQLite database, private-file metadata, upload sessions and the ready-file view. `scripts/db-init.ts` applies it explicitly and records a SHA-256 checksum in `schema_migrations`. Changing an applied baseline is rejected; future changes need new numbered migrations. There is no request-time schema creation or automatic administrator seeding.

The schema uses InnoDB, UTF8MB4, parameterized values, DECIMAL scores, DATETIME(3) timestamps and a unique generated active-term slot. Historic birth dates are converted to calendar DATE values with validation. Every original foreign key is retained. `source-tables.json` is a schema-only import manifest, not application data.

## Connections and time

One process-wide pool survives development module reloads. Connections are borrowed and released; they are not opened for each query. Session configuration preserves strict SQL modes and explicitly requires ONLY_FULL_GROUP_BY. Sessions run in UTC; DATETIME/TIMESTAMP results become ISO UTC strings. DATE birth values remain calendar dates. Large GROUP_CONCAT results have an explicit limit.

Use `rows<T>`, `first<T>` and `execute`. Values are validated and bound separately from SQL. Interpolated table/column names must come from code-owned whitelists; user input must remain parameters.

## Transactions

`withTransaction` binds a dedicated connection through AsyncLocalStorage, commits only after all awaited operations complete, rolls back on failure and always releases the connection. Nested operations use savepoints. Attendance, conduct updates, notifications, review transitions, imports and administrative account changes retain a transaction boundary.

As a conservative initial concurrency policy, application business transactions take a single InnoDB mutex row. This preserves the serial-write guarantees previously provided by SQLite immediate transactions and protects aggregate limits. It can limit write throughput during large imports; load-test before production and replace it with domain-specific ordered locks only with equivalent concurrency tests. Authentication reads and ordinary reads do not take this lock. Registration also locks the activity and checks capacity inside its transaction.

`triggers.sql` ports all 15 inspected integrity/context policies. Cohort relations, immutable imported cohorts, membership matching, capacity, notification context and reasoned administrator audit are retained. Invalid direct audit inserts fail rather than being silently discarded. The application audit service already excludes unsupported operations.

## Migration

Stop the app before import. The importer opens SQLite read-only, checks foreign keys and the table manifest, rejects any nonempty target table, copies in dependency order with original IDs and NULLs, verifies table counts and produces an ignored report. Self-referencing categories are copied parent-first. An error identifies table and row and rolls back copied data.

For a verified empty target only, initialization policies that automatically create related rows are removed for the import and reinstalled in `finally`; foreign-key checking is never disabled. Do not run the app during this maintenance step. Source SQLite and evidence are never deleted. Importing twice is explicitly rejected instead of duplicating or clearing records.

## Verification boundary

TypeScript and mocked tests cannot prove SQL execution or query plans. A running MySQL 8.4 instance is required for the migration, trigger, strict-GROUP-BY, concurrency and full business regression gates. Consult the implementation report for actual results; no Docker/MySQL execution is implied by this document.
