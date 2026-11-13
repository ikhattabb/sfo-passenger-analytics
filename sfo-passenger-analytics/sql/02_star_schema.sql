-- =====================================================================
-- 02_star_schema.sql
-- Purpose : Model the cleaned data as a star schema (Power BI friendly).
--
--                       dim_date
--                          |
--   dim_airline --- fact_passenger_activity --- dim_geo
--                          |
--                       dim_gate
--
-- Grain of the fact table: one row per
--   month x operating airline x geography x terminal/boarding area
--   x activity type x price category
-- =====================================================================

DROP VIEW  IF EXISTS vw_traffic;
DROP TABLE IF EXISTS fact_passenger_activity;
DROP TABLE IF EXISTS dim_date;
DROP TABLE IF EXISTS dim_airline;
DROP TABLE IF EXISTS dim_geo;
DROP TABLE IF EXISTS dim_gate;

-- ---------- Dimensions ------------------------------------------------
CREATE TABLE dim_date (
    date_key      INTEGER PRIMARY KEY,          -- YYYYMM
    month_start   TEXT    NOT NULL,             -- ISO date, first day of month
    year          INTEGER NOT NULL,
    quarter       INTEGER NOT NULL,
    month         INTEGER NOT NULL,
    month_name    TEXT    NOT NULL,
    is_full_year  INTEGER NOT NULL              -- 1 if all 12 months of that year are in the data
);

INSERT INTO dim_date
WITH months AS (
    SELECT DISTINCT activity_period AS date_key, activity_month AS month_start, year, month
    FROM stg_passenger_activity
),
months_per_year AS (
    SELECT year, COUNT(*) AS n_months FROM months GROUP BY year
)
SELECT
    m.date_key,
    m.month_start,
    m.year,
    ((m.month - 1) / 3) + 1,
    m.month,
    substr('JanFebMarAprMayJunJulAugSepOctNovDec', (m.month - 1) * 3 + 1, 3),
    CASE WHEN y.n_months = 12 THEN 1 ELSE 0 END
FROM months m
JOIN months_per_year y ON y.year = m.year;

CREATE TABLE dim_airline (
    airline_key   INTEGER PRIMARY KEY,
    airline_name  TEXT NOT NULL UNIQUE,         -- harmonised operating airline
    iata_code     TEXT,
    first_period  INTEGER NOT NULL,
    last_period   INTEGER NOT NULL,
    is_active     INTEGER NOT NULL              -- 1 if it still reports in the latest month
);

INSERT INTO dim_airline (airline_name, iata_code, first_period, last_period, is_active)
SELECT
    operating_airline,
    MAX(operating_iata),
    MIN(activity_period),
    MAX(activity_period),
    CASE WHEN MAX(activity_period) = (SELECT MAX(activity_period) FROM stg_passenger_activity) THEN 1 ELSE 0 END
FROM stg_passenger_activity
GROUP BY operating_airline
ORDER BY operating_airline;

CREATE TABLE dim_geo (
    geo_key      INTEGER PRIMARY KEY,
    geo_summary  TEXT NOT NULL,                 -- Domestic / International
    geo_region   TEXT NOT NULL,
    UNIQUE (geo_summary, geo_region)
);

INSERT INTO dim_geo (geo_summary, geo_region)
SELECT DISTINCT geo_summary, geo_region FROM stg_passenger_activity ORDER BY 1, 2;

CREATE TABLE dim_gate (
    gate_key       INTEGER PRIMARY KEY,
    terminal       TEXT NOT NULL,
    boarding_area  TEXT NOT NULL,
    UNIQUE (terminal, boarding_area)
);

INSERT INTO dim_gate (terminal, boarding_area)
SELECT DISTINCT terminal, boarding_area FROM stg_passenger_activity ORDER BY 1, 2;

-- ---------- Fact ------------------------------------------------------
CREATE TABLE fact_passenger_activity (
    date_key         INTEGER NOT NULL REFERENCES dim_date (date_key),
    airline_key      INTEGER NOT NULL REFERENCES dim_airline (airline_key),
    geo_key          INTEGER NOT NULL REFERENCES dim_geo (geo_key),
    gate_key         INTEGER NOT NULL REFERENCES dim_gate (gate_key),
    activity_type    TEXT    NOT NULL,          -- Enplaned / Deplaned / Thru / Transit
    price_category   TEXT    NOT NULL,          -- Low Fare / Other
    passenger_count  INTEGER NOT NULL CHECK (passenger_count >= 0),
    PRIMARY KEY (date_key, airline_key, geo_key, gate_key, activity_type, price_category)
);

INSERT INTO fact_passenger_activity
SELECT
    s.activity_period,
    a.airline_key,
    g.geo_key,
    t.gate_key,
    s.activity_type,
    s.price_category,
    SUM(s.passenger_count)       -- The fact grain uses the OPERATING airline only (the carrier that flew the
                                 -- passengers); the marketing "published" airline is dropped, so a few hundred
                                 -- source rows merge. Totals are reconciled in DQ-02.
FROM stg_passenger_activity s
JOIN dim_airline a ON a.airline_name = s.operating_airline
JOIN dim_geo     g ON g.geo_summary = s.geo_summary AND g.geo_region = s.geo_region
JOIN dim_gate    t ON t.terminal = s.terminal AND t.boarding_area = s.boarding_area
GROUP BY s.activity_period, a.airline_key, g.geo_key, t.gate_key, s.activity_type, s.price_category;

CREATE INDEX idx_fact_date    ON fact_passenger_activity (date_key);
CREATE INDEX idx_fact_airline ON fact_passenger_activity (airline_key);

-- ---------- Flattened view used by all analysis views ------------------
-- Business definition: "Total passengers" = Enplaned + Deplaned.
-- "Thru / Transit" passengers stay on the aircraft, so they are reported
-- separately and excluded from totals (avoids double counting).
CREATE VIEW vw_traffic AS
SELECT
    d.date_key, d.month_start, d.year, d.quarter, d.month, d.month_name, d.is_full_year,
    a.airline_name, a.iata_code, a.is_active,
    g.geo_summary, g.geo_region,
    t.terminal, t.boarding_area,
    f.activity_type, f.price_category,
    CASE WHEN f.activity_type IN ('Enplaned', 'Deplaned') THEN 1 ELSE 0 END AS is_traffic,
    f.passenger_count
FROM fact_passenger_activity f
JOIN dim_date    d ON d.date_key    = f.date_key
JOIN dim_airline a ON a.airline_key = f.airline_key
JOIN dim_geo     g ON g.geo_key     = f.geo_key
JOIN dim_gate    t ON t.gate_key    = f.gate_key;
