/**
 * build-database.ts
 * Loads the raw SFO passenger CSV into SQLite exactly as published (every column as text),
 * then runs the SQL pipeline in order:
 *   01_staging.sql -> 02_star_schema.sql -> 03_data_quality.sql -> 04_analysis_views.sql
 *
 * Usage: npm run db
 */
import Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { DB_PATH, RAW_CSV, SQL_DIR } from './paths';

const RAW_COLUMNS = [
  'activity_period',
  'activity_period_start_date',
  'operating_airline',
  'operating_airline_iata_code',
  'published_airline',
  'published_airline_iata_code',
  'geo_summary',
  'geo_region',
  'activity_type_code',
  'price_category_code',
  'terminal',
  'boarding_area',
  'passenger_count',
  'data_as_of',
  'data_loaded_at',
];

const PIPELINE = ['01_staging.sql', '02_star_schema.sql', '03_data_quality.sql', '04_analysis_views.sql'];

interface DqRow {
  check_id: string;
  check_name: string;
  expected: string | number;
  observed: string | number;
  status: 'PASS' | 'WARN' | 'FAIL';
}

function loadRaw(db: Database.Database): number {
  const records = parse(readFileSync(RAW_CSV), { bom: true, skip_empty_lines: true }) as string[][];
  const [header, ...rows] = records;

  if (header.length !== RAW_COLUMNS.length) {
    throw new Error(`Unexpected CSV layout: ${header.length} columns, expected ${RAW_COLUMNS.length}`);
  }

  db.exec('DROP TABLE IF EXISTS raw_sfo_passengers');
  db.exec(`CREATE TABLE raw_sfo_passengers (${RAW_COLUMNS.map((c) => `${c} TEXT`).join(', ')})`);

  const insert = db.prepare(`INSERT INTO raw_sfo_passengers VALUES (${RAW_COLUMNS.map(() => '?').join(', ')})`);
  db.transaction((all: string[][]) => {
    for (const row of all) insert.run(row);
  })(rows);

  return rows.length;
}

function main(): void {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  rmSync(DB_PATH, { force: true });

  const db = new Database(DB_PATH);
  console.log(`Loaded ${loadRaw(db).toLocaleString('en-US')} raw rows`);

  for (const file of PIPELINE) {
    db.exec(readFileSync(path.join(SQL_DIR, file), 'utf-8'));
    console.log(`Ran ${file}`);
  }

  const checks = db
    .prepare('SELECT check_id, check_name, expected, observed, status FROM dq_results ORDER BY check_id')
    .all() as DqRow[];

  console.log('\nData quality results');
  console.log('-'.repeat(78));
  for (const c of checks) {
    console.log(`${c.check_id}  ${c.status.padEnd(4)}  ${c.check_name}  (expected ${c.expected}, observed ${c.observed})`);
  }
  db.close();

  const failed = checks.filter((c) => c.status === 'FAIL').length;
  console.log(`\nDatabase ready: ${DB_PATH}`);
  if (failed > 0) {
    console.error(`${failed} data quality check(s) failed. Fix the data before reporting.`);
    process.exitCode = 1;
  }
}

main();
