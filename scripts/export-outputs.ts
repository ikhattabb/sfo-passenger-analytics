/**
 * export-outputs.ts
 * Exports the star schema and every analysis view to CSV (Power BI / Excel / Tableau ready),
 * plus the data-quality report.
 *
 * Usage: npm run export      (run npm run db first)
 */
import Database from 'better-sqlite3';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DB_PATH, OUTPUT_DIR, POWERBI_DIR } from './paths';

const TABLES = [
  // star schema
  'dim_date',
  'dim_airline',
  'dim_geo',
  'dim_gate',
  'fact_passenger_activity',
  // analysis layer
  'vw_monthly_traffic',
  'vw_annual_traffic',
  'vw_ytd_comparison',
  'vw_seasonality',
  'vw_recovery_vs_2019',
  'vw_airline_share_by_year',
  'vw_airline_concentration',
  'vw_region_by_year',
  'vw_region_growth_opportunities',
  'vw_terminal_by_year',
  'vw_market_mix_by_year',
];

// A value becomes one CSV cell: empty for NULL, quoted when it contains a comma, quote or line break.
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportTable(db: Database.Database, table: string, file: string): number {
  const statement = db.prepare(`SELECT * FROM ${table}`);
  const header = statement.columns().map((c) => c.name);
  const rows = statement.raw().all() as unknown[][];

  const lines = [header, ...rows].map((row) => row.map(cell).join(','));
  // The byte-order mark makes Excel read the file as UTF-8.
  writeFileSync(file, `﻿${lines.join('\r\n')}\r\n`, 'utf-8');
  return rows.length;
}

function main(): void {
  mkdirSync(POWERBI_DIR, { recursive: true });
  const db = new Database(DB_PATH, { readonly: true });

  for (const table of TABLES) {
    const n = exportTable(db, table, path.join(POWERBI_DIR, `${table}.csv`));
    console.log(`${table.padEnd(34)} ${n.toLocaleString('en-US').padStart(7)} rows`);
  }
  const n = exportTable(db, 'dq_results', path.join(OUTPUT_DIR, 'data_quality_report.csv'));
  console.log(`${'dq_results'.padEnd(34)} ${n.toLocaleString('en-US').padStart(7)} rows`);

  db.close();
}

main();
