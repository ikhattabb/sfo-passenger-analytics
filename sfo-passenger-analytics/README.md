# Airport Passenger Traffic Intelligence: SFO Case Study

An end-to-end business data intelligence project built on public airport data. It takes 27 years of monthly passenger records from San Francisco International Airport (SFO), cleans and validates them in SQL, models them as a star schema, answers a set of commercial questions, and delivers Power BI-ready tables plus an interactive React dashboard. The pipeline and the dashboard are written in TypeScript.

**Stack:** SQL (SQLite) for the analysis, TypeScript on Node.js for the pipeline, React with Recharts for the dashboard, Power BI for the report.

> Independent portfolio project using public open data. It is not affiliated with or endorsed by SFO.

## Business questions answered

1. How large is passenger traffic, and how fast is it growing?
2. How far did COVID reduce traffic, and how complete is the recovery?
3. Which months are peak and low season (capacity planning)?
4. Which markets (regions) drive international traffic, and where is the headroom to grow?
5. Which airlines carry the traffic, and how concentrated is the market?
6. How are terminals loaded, and how is the domestic / international mix changing?

## Data

| | |
|---|---|
| Source | San Francisco International Airport, *Air Traffic Passenger Statistics* (DataSF open data) |
| Coverage | July 1999 to August 2026 (326 consecutive months) |
| Size | 40,803 source rows, 15 columns |
| Grain | Month x airline x region x terminal/boarding area x activity type x price category |

Place the CSV at `data/raw/sfo_air_traffic_passenger_statistics.csv` (already included in this folder).

## Project structure

```
data/raw/      original CSV, untouched
sql/           the pipeline, in run order
  01_staging.sql          cleaning and type conversion
  02_star_schema.sql      dimensions, fact table, flattened view
  03_data_quality.sql     14 automated validation checks
  04_analysis_views.sql   11 business-facing analysis views
  05_ad_hoc_queries.sql   example stakeholder questions
scripts/       TypeScript pipeline
  build-database.ts       loads the CSV, runs the SQL files, prints the quality checks
  export-outputs.ts       writes the Power BI-ready CSVs
  dashboard-data.ts       reads the SQL views and builds the dashboard figures and sentences
  export-dashboard-json.ts  writes web/src/data/dashboard.json
web/           React dashboard
  src/components/         header, KPI cards, card, table, tooltip
  src/sections/           one file per chart (8 charts)
  src/lib/                number formatting and shared chart styling
  src/types.ts            data types shared with the pipeline
  src/styles/             design tokens (light and dark) and layout
db/            SQLite database (generated)
output/        Power BI-ready CSVs and the data-quality report (generated)
docs/          Power BI build guide, CV wording
```

The generated files (`db/`, `output/`, `web/src/data/dashboard.json`) are included, so the dashboard runs straight away. Rerun the pipeline whenever the CSV or the SQL changes.

## How to run

Requires Node.js 20 or newer.

```bash
npm install            # once
npm run pipeline       # rebuild everything from the CSV (the three steps below in one go)
npm run dev            # open the dashboard at http://localhost:5173
```

The pipeline steps can also be run one at a time:

```bash
npm run db             # load the CSV, run the SQL files, print the 14 data-quality checks
npm run export         # write the CSVs to output/powerbi/
npm run data           # write web/src/data/dashboard.json for the dashboard
```

Other commands: `npm run typecheck` checks all TypeScript, and `npm run build` creates the production site in `dist/` (open `dist/index.html` through any static server, for example `npm run preview`).

To explore the SQL yourself, open `db/sfo_passenger_analytics.db` in DB Browser for SQLite and run the queries in `sql/05_ad_hoc_queries.sql`.

## Data model

```
                    dim_date
                       |
dim_airline ---- fact_passenger_activity ---- dim_geo
                       |
                    dim_gate
```

Business definitions used everywhere:

- **Total passengers** = enplaned + deplaned. Thru/transit passengers stay on the aircraft and are reported separately, to avoid double counting.
- **Full year** = all 12 months present. The current year is incomplete (January to August), so it is compared year-to-date only and never against a full year.
- **Baseline** = 2019 (last normal year before COVID). Seasonality uses 2015 to 2019.

## Cleaning and validation decisions

| Issue found | Handling |
|---|---|
| Passenger counts stored as text with thousand separators (`"31,432"`) | Commas stripped, cast to integer |
| Dates as text (`1999/07/01`) | Converted to ISO dates |
| Empty IATA codes (313 rows) | Set to NULL; airline name used as the key instead |
| United traffic is split across two labels ("United Airlines - Pre 07/01/2013" and "United Airlines") | Merged into one carrier. Left split, United would appear to drop from 13.2M to 5.3M passengers in 2013; merged, it runs 16.7M (2012), 17.1M (2013), 18.0M (2014). No rows collide, so nothing is double counted |
| 2 rows with zero passengers | Kept (no effect on sums), flagged as a warning |
| Latest year has only 8 months | Flagged, excluded from full-year trends |

The 14 checks in `03_data_quality.sql` cover completeness, reconciliation of totals across raw, staging and fact tables, uniqueness, month continuity, domain values, cross-field consistency and reasonableness. Result: 11 pass, 3 warnings (all handled above), 0 failures.

## Key findings

- **2025 traffic was 54.4M passengers**, up 4.3% on 2024 and 94.8% of 2019 (57.3M). The all-time annual peak was 57.7M in 2018.
- **COVID impact:** 2020 fell 71.4%, and April 2020 was 3.0% of April 2019. Year-to-date 2026 (January to August) is 37.1M, up 2.1% on the same months of 2025 and at 95.2% of 2019.
- **Seasonality:** July and August run about 17% above an average month; February runs about 22% below.
- **International share** rose from 20.2% in 2000 to 29.3% in 2025.
- **Regions:** Asia is 40.5% of international traffic and is 10.1% above its 2019 level. Europe is at 94.6% of 2019 and domestic (US) traffic at 91.3%, so most of the remaining gap to 2019 is domestic.
- **Airlines:** United carries 44.7% of passengers; the top three hold 59.7% (HHI 2,229, moderately concentrated). Frontier grew 167% against 2019 from a small base, and Virgin America stopped reporting in 2018.

All figures are computed by the SQL views in this repository and can be reproduced by running the pipeline.

## Using the outputs in Power BI

See `docs/POWERBI_GUIDE.md` for the model, relationships, DAX measures and a suggested three-page layout.

## SQL notes

Written for SQLite so it runs anywhere with no setup. Window functions (`LAG`, `RANK`, `SUM/AVG OVER`) follow the SQL standard and also run on SQL Server, PostgreSQL and MySQL 8+. SQLite-specific pieces to adapt: `strftime`/`date()` (use `FORMAT`/`DATEFROMPARTS` in T-SQL), `substr` (`SUBSTRING`), `POWER` (same in T-SQL) and `CREATE TABLE ... AS SELECT` (`SELECT ... INTO` in T-SQL).

## Limitations

- Single airport and monthly grain; no forecasting is included.
- Counts are passengers by airline and region of origin or destination, not individual itineraries.
- The status labels in the region scorecard are a simple heuristic, not a statistical model.
