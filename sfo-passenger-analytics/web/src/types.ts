// Shape of web/src/data/dashboard.json.
// The pipeline (scripts/dashboard-data.ts) produces it and the React app reads it,
// so both sides share these types and a mismatch fails the type check.

export type Direction = 'up' | 'down' | '';

export interface Meta {
  coverage: string;
  source: string;
  latestYear: number;
}

export interface Kpi {
  label: string;
  value: string;
  delta: string;
  dir: Direction;
  note: string;
}

export interface Takeaways {
  annual: string;
  mix: string;
  monthly: string;
  recovery: string;
  season: string;
  region: string;
  airline: string;
  terminal: string;
}

export interface AnnualRow {
  year: number;
  total: number;
  yoy: number | null;
  intl: number;
}

export interface MixRow {
  year: number;
  intl: number;
  lowfare: number | null;
}

export interface MonthlyRow {
  m: string; // 'YYYY-MM'
  total: number;
  roll: number | null; // 12-month average, empty for the first 11 months
  yoy: number | null;
}

export interface RecoveryRow {
  m: string; // 'YYYY-MM'
  total: number;
  base: number; // same month of 2019
  pct: number;
}

export interface SeasonRow {
  name: string;
  idx: number;
  min: number;
  max: number;
}

export interface RegionRow {
  region: string;
  latest: number;
  cagr: number | null;
  yoy: number | null;
  rec: number;
  status: string;
  intlShare: number | null;
}

export interface ShareRow {
  name: string;
  pax: number;
  share: number;
}

export interface DataQuality {
  pass: number;
  warn: number;
  fail: number;
  warnings: string[];
}

export interface DashboardData {
  meta: Meta;
  kpis: Kpi[];
  takeaways: Takeaways;
  annual: AnnualRow[];
  mix: MixRow[];
  monthly: MonthlyRow[];
  recovery: RecoveryRow[];
  season: SeasonRow[];
  regions: RegionRow[];
  airlines: ShareRow[];
  terminals: ShareRow[];
  dq: DataQuality;
}
