/**
 * export-dashboard-json.ts
 * Writes the figures for the React app to web/src/data/dashboard.json.
 *
 * Usage: npm run data      (run npm run db first)
 */
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildDashboardData } from './dashboard-data';
import { DASHBOARD_JSON, DB_PATH } from './paths';

mkdirSync(path.dirname(DASHBOARD_JSON), { recursive: true });
writeFileSync(DASHBOARD_JSON, JSON.stringify(buildDashboardData(DB_PATH)), 'utf-8');
console.log(`Wrote ${DASHBOARD_JSON} (${Math.round(statSync(DASHBOARD_JSON).size / 1024)} KB)`);
