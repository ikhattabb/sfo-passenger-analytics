// Locations used by every script, resolved from this file so the scripts work from any folder.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const RAW_CSV = path.join(ROOT, 'data', 'raw', 'sfo_air_traffic_passenger_statistics.csv');
export const DB_PATH = path.join(ROOT, 'db', 'sfo_passenger_analytics.db');
export const SQL_DIR = path.join(ROOT, 'sql');
export const OUTPUT_DIR = path.join(ROOT, 'output');
export const POWERBI_DIR = path.join(OUTPUT_DIR, 'powerbi');
export const DASHBOARD_JSON = path.join(ROOT, 'web', 'src', 'data', 'dashboard.json');
