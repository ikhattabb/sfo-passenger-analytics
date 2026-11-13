/**
 * dashboard-data.ts
 * Reads the SQL analysis views and builds one object with every figure and takeaway
 * sentence the dashboard needs. All numbers come from the views; nothing is recalculated
 * in the browser.
 */
import Database from 'better-sqlite3';
import type {
  AnnualRow,
  DashboardData,
  DataQuality,
  Kpi,
  MixRow,
  MonthlyRow,
  RecoveryRow,
  RegionRow,
  SeasonRow,
  ShareRow,
  Takeaways,
} from '../web/src/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------- small formatting helpers ----------
const millions = (v: number) => `${(v / 1e6).toFixed(1)}M`;
const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`; // '2019-08' -> 'Aug 2019'
const maxBy = <T>(rows: T[], value: (r: T) => number) => rows.reduce((a, b) => (value(b) > value(a) ? b : a));
const minBy = <T>(rows: T[], value: (r: T) => number) => rows.reduce((a, b) => (value(b) < value(a) ? b : a));

// ---------- row shapes returned by the SQL below ----------
interface YtdRow {
  year: number;
  through_month: number;
  ytd_passengers: number;
  ytd_yoy_pct: number | null;
  pct_of_2019_ytd: number | null;
}
interface RegionBase extends Omit<RegionRow, 'intlShare'> {}
interface IntlRegion {
  geo_region: string;
  passengers: number;
}
interface Concentration {
  airlines_operating: number;
  top3_share_pct: number;
  hhi: number;
}
interface DqCheck {
  check_id: string;
  check_name: string;
  observed: string | number;
  status: 'PASS' | 'WARN' | 'FAIL';
}
interface MetaRow {
  n: number;
  asof: string;
  a: string;
  b: string;
}

export function buildDashboardData(dbPath: string): DashboardData {
  const db = new Database(dbPath, { readonly: true });
  const all = <T>(sql: string, ...params: unknown[]) => db.prepare(sql).all(...params) as T[];

  // ---- annual -------------------------------------------------------
  const annual = all<AnnualRow>(
    `SELECT year, total_passengers AS total, yoy_pct AS yoy, international_share_pct AS intl
     FROM vw_annual_traffic WHERE is_full_year = 1 ORDER BY year`,
  );
  const latest = annual[annual.length - 1];
  const prior = annual[annual.length - 2];
  const y2019 = annual.find((r) => r.year === 2019)!;
  const peak = maxBy(annual, (r) => r.total);
  const covid = annual.find((r) => r.year === 2020)!;
  const L = latest.year;
  const recoveryLatest = (100 * latest.total) / y2019.total;

  // ---- year to date -----------------------------------------------------
  const ytd = all<YtdRow>('SELECT * FROM vw_ytd_comparison ORDER BY year');
  const ytdNow = ytd[ytd.length - 1];
  const through = MONTHS[ytdNow.through_month - 1];

  // ---- monthly, recovery, seasonality ---------------------------------
  const monthly = all<MonthlyRow>(
    `SELECT substr(month_start, 1, 7) AS m, total_passengers AS total,
            rolling_12m_avg AS roll, yoy_pct AS yoy
     FROM vw_monthly_traffic ORDER BY date_key`,
  );
  const busiest = maxBy(monthly, (r) => r.total);
  const lastMonth = monthly[monthly.length - 1];

  const recovery = all<RecoveryRow>(
    `SELECT substr(month_start, 1, 7) AS m, total_passengers AS total,
            same_month_2019 AS base, pct_of_2019 AS pct
     FROM vw_recovery_vs_2019 ORDER BY date_key`,
  );
  const trough = minBy(recovery, (r) => r.pct);
  const lastRecovery = recovery[recovery.length - 1];

  const season = all<SeasonRow>(
    `SELECT month_name AS name, seasonality_index AS idx, min_index AS min, max_index AS max
     FROM vw_seasonality ORDER BY month`,
  );
  const seasonHigh = maxBy(season, (r) => r.idx);
  const seasonLow = minBy(season, (r) => r.idx);

  // ---- market mix ---------------------------------------------------
  const mix = all<MixRow>(
    `SELECT year, international_share_pct AS intl, low_fare_share_of_domestic_pct AS lowfare
     FROM vw_market_mix_by_year WHERE is_full_year = 1 ORDER BY year`,
  );
  const mixPeak = maxBy(mix, (r) => r.intl);

  // ---- regions ------------------------------------------------------------
  const regionRows = all<RegionBase>(
    `SELECT geo_region AS region, pax_latest AS latest, cagr_2015_2019_pct AS cagr,
            yoy_latest_pct AS yoy, recovery_vs_2019_pct AS rec, status
     FROM vw_region_growth_opportunities ORDER BY recovery_vs_2019_pct DESC`,
  );
  const intlRegions = all<IntlRegion>(
    `SELECT geo_region, passengers FROM vw_region_by_year
     WHERE year = ? AND geo_summary = 'International'`,
    L,
  );
  const intlTotal = intlRegions.reduce((sum, r) => sum + r.passengers, 0);
  const intlShare = new Map(intlRegions.map((r) => [r.geo_region, (100 * r.passengers) / intlTotal]));
  const regions: RegionRow[] = regionRows.map((r) => ({ ...r, intlShare: intlShare.get(r.region) ?? null }));
  const region = (name: string) => regions.find((r) => r.region === name)!;
  const asia = region('Asia');
  const europe = region('Europe');
  const us = region('US');

  // ---- airlines and terminals -------------------------------------------
  const airlines = all<ShareRow>(
    `SELECT airline_name AS name, passengers AS pax, share_pct AS share
     FROM vw_airline_share_by_year WHERE year = ? AND rank_in_year <= 10 ORDER BY rank_in_year`,
    L,
  );
  const conc = all<Concentration>('SELECT * FROM vw_airline_concentration WHERE year = ?', L)[0];
  const terminals = all<ShareRow>(
    `SELECT terminal AS name, passengers AS pax, share_pct AS share
     FROM vw_terminal_by_year WHERE year = ? ORDER BY passengers DESC`,
    L,
  );

  // ---- data quality -------------------------------------------------------
  const checks = all<DqCheck>('SELECT * FROM dq_results ORDER BY check_id');
  const warningText = (c: DqCheck): string => {
    switch (c.check_id) {
      case 'DQ-13':
        return `${c.observed} of 12 months reported for the latest year, so it is compared year-to-date only.`;
      case 'DQ-05':
        return `${c.observed} source rows have zero passengers; kept, no effect on totals.`;
      case 'DQ-06':
        return `${c.observed} rows have no airline IATA code; airline name is used as the key.`;
      default:
        return `${c.check_name}: ${c.observed}`;
    }
  };
  const dq: DataQuality = {
    pass: checks.filter((c) => c.status === 'PASS').length,
    warn: checks.filter((c) => c.status === 'WARN').length,
    fail: checks.filter((c) => c.status === 'FAIL').length,
    warnings: checks.filter((c) => c.status === 'WARN').map(warningText),
  };

  // ---- metadata -------------------------------------------------------------
  const m = all<MetaRow>(
    `SELECT COUNT(*) AS n, MAX(source_data_as_of) AS asof,
            MIN(activity_month) AS a, MAX(activity_month) AS b
     FROM stg_passenger_activity`,
  )[0];
  db.close();

  const meta = {
    coverage: `${monthLabel(m.a.slice(0, 7))} to ${monthLabel(m.b.slice(0, 7))} · ${m.n.toLocaleString('en-US')} source rows`,
    source:
      'Source: San Francisco International Airport, Air Traffic Passenger Statistics (DataSF open data), ' +
      `data as of ${m.asof.slice(0, 10).replaceAll('/', '-')}. ` +
      'Independent portfolio analysis, not affiliated with or endorsed by SFO.',
    latestYear: L,
  };

  // ---- KPI tiles ------------------------------------------------------------
  const direction = (v: number | null) => ((v ?? 0) >= 0 ? 'up' : 'down');
  const kpis: Kpi[] = [
    {
      label: `Passengers in ${L}`,
      value: millions(latest.total),
      delta: signed(latest.yoy ?? 0),
      dir: direction(latest.yoy),
      note: `vs ${prior.year}`,
    },
    {
      label: 'Compared with 2019',
      value: `${recoveryLatest.toFixed(1)}%`,
      delta: '',
      dir: '',
      note: `${L} against the pre-COVID baseline`,
    },
    {
      label: `${ytdNow.year} year to date`,
      value: millions(ytdNow.ytd_passengers),
      delta: signed(ytdNow.ytd_yoy_pct ?? 0),
      dir: direction(ytdNow.ytd_yoy_pct),
      note: `Jan to ${through} vs ${ytdNow.year - 1}`,
    },
    { label: 'International share', value: `${latest.intl.toFixed(1)}%`, delta: '', dir: '', note: `of ${L} passengers` },
    { label: 'Largest airline share', value: `${airlines[0].share.toFixed(1)}%`, delta: '', dir: '', note: airlines[0].name },
    {
      label: 'Airlines operating',
      value: String(conc.airlines_operating),
      delta: '',
      dir: '',
      note: `in ${L}, top 3 hold ${conc.top3_share_pct.toFixed(1)}%`,
    },
  ];

  // ---- takeaway sentences (one per chart) -----------------------------------
  const hhi = Math.trunc(conc.hhi);
  const hhiBand = hhi < 1500 ? 'competitive' : hhi <= 2500 ? 'moderately concentrated' : 'concentrated';
  const topTerminal = terminals[0];

  const takeaways: Takeaways = {
    annual:
      `Traffic peaked at ${millions(peak.total)} in ${peak.year}, fell ${Math.abs(covid.yoy ?? 0).toFixed(1)}% in 2020 and reached ` +
      `${millions(latest.total)} in ${L}, ${recoveryLatest.toFixed(1)}% of 2019.`,
    mix:
      `International share rose from ${annual[0].intl.toFixed(1)}% in ${annual[0].year} to ${latest.intl.toFixed(1)}% in ${L}, ` +
      `with a high of ${mixPeak.intl.toFixed(1)}% in ${mixPeak.year}.`,
    monthly:
      `The busiest month on record is ${monthLabel(busiest.m)} at ${millions(busiest.total)}. ` +
      `${monthLabel(lastMonth.m)} reached ${millions(lastMonth.total)}, ${signed(lastMonth.yoy ?? 0)} on the same month a year earlier.`,
    recovery:
      `Traffic bottomed at ${trough.pct.toFixed(1)}% of 2019 in ${monthLabel(trough.m)}. ` +
      `${monthLabel(lastRecovery.m)} is at ${lastRecovery.pct.toFixed(1)}%, and ${ytdNow.year} year to date is at ${(ytdNow.pct_of_2019_ytd ?? 0).toFixed(1)}%.`,
    season:
      `${seasonHigh.name} is the peak, ${(seasonHigh.idx - 100).toFixed(0)}% above an average month. ` +
      `${seasonLow.name} is the low, ${(100 - seasonLow.idx).toFixed(0)}% below.`,
    region:
      `Asia is ${(intlShare.get('Asia') ?? 0).toFixed(1)}% of international traffic and is at ${asia.rec.toFixed(1)}% of 2019. ` +
      `Europe is at ${europe.rec.toFixed(1)}% and domestic (US) at ${us.rec.toFixed(1)}%, so most of the remaining gap is in domestic traffic. ` +
      'Status uses a simple rule: 100% or more is above 2019, 80% to 100% is recovering, below 80% is lagging.',
    airline:
      `${airlines[0].name} carries ${airlines[0].share.toFixed(1)}% of passengers. The top three airlines hold ` +
      `${conc.top3_share_pct.toFixed(1)}% and the HHI of ${hhi.toLocaleString('en-US')} marks a ${hhiBand} market.`,
    terminal:
      `${topTerminal.name} handles the most passengers at ${topTerminal.share.toFixed(1)}% of the ${L} total. ` +
      'The International terminal covers international departures and arrivals.',
  };

  return { meta, kpis, takeaways, annual, mix, monthly, recovery, season, regions, airlines, terminals, dq };
}
