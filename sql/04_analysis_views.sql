-- =====================================================================
-- 04_analysis_views.sql
-- Purpose : Business-facing analysis layer. Each view answers one
--           stakeholder question and is exported as a Power BI-ready table.
--
-- Conventions
--   * Total passengers = Enplaned + Deplaned (Thru/Transit excluded).
--   * "Full year" = a calendar year with all 12 months reported.
--   * The latest, incomplete year is compared year-to-date (YTD) only.
--   * Pre-COVID baseline = 2019; seasonality baseline = 2015-2019.
-- Uses window functions (LAG, RANK, SUM/AVG OVER) - SQL:2003, also valid in
-- SQL Server, PostgreSQL and MySQL 8+.
-- =====================================================================

DROP VIEW IF EXISTS vw_monthly_traffic;
DROP VIEW IF EXISTS vw_annual_traffic;
DROP VIEW IF EXISTS vw_ytd_comparison;
DROP VIEW IF EXISTS vw_seasonality;
DROP VIEW IF EXISTS vw_recovery_vs_2019;
DROP VIEW IF EXISTS vw_airline_share_by_year;
DROP VIEW IF EXISTS vw_airline_concentration;
DROP VIEW IF EXISTS vw_region_by_year;
DROP VIEW IF EXISTS vw_region_growth_opportunities;
DROP VIEW IF EXISTS vw_terminal_by_year;
DROP VIEW IF EXISTS vw_market_mix_by_year;

-- ---------------------------------------------------------------------
-- Q1. How is monthly traffic trending? (level, YoY, smoothed trend)
-- ---------------------------------------------------------------------
CREATE VIEW vw_monthly_traffic AS
WITH m AS (
    SELECT date_key, month_start, year, month,
           COALESCE(SUM(CASE WHEN activity_type = 'Enplaned'       THEN passenger_count END), 0) AS enplaned,
           COALESCE(SUM(CASE WHEN activity_type = 'Deplaned'       THEN passenger_count END), 0) AS deplaned,
           COALESCE(SUM(CASE WHEN activity_type = 'Thru / Transit' THEN passenger_count END), 0) AS transit
    FROM vw_traffic
    GROUP BY date_key, month_start, year, month
),
t AS (
    SELECT *, enplaned + deplaned AS total_passengers FROM m
)
SELECT
    date_key, month_start, year, month, enplaned, deplaned, transit, total_passengers,
    LAG(total_passengers, 12) OVER (ORDER BY date_key)                               AS same_month_prior_year,
    ROUND(100.0 * (total_passengers - LAG(total_passengers, 12) OVER (ORDER BY date_key))
          / LAG(total_passengers, 12) OVER (ORDER BY date_key), 1)                   AS yoy_pct,
    -- rolling average is only reported once a full 12-month window exists
    CASE WHEN COUNT(*) OVER (ORDER BY date_key ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) = 12
         THEN CAST(ROUND(AVG(total_passengers) OVER (ORDER BY date_key
                   ROWS BETWEEN 11 PRECEDING AND CURRENT ROW)) AS INTEGER) END       AS rolling_12m_avg
FROM t;

-- ---------------------------------------------------------------------
-- Q2. How big is each year and how fast is it growing? (full years only)
-- ---------------------------------------------------------------------
CREATE VIEW vw_annual_traffic AS
WITH y AS (
    SELECT year,
           MAX(is_full_year)                                                         AS is_full_year,
           COUNT(DISTINCT date_key)                                                  AS months_reported,
           SUM(CASE WHEN is_traffic = 1 THEN passenger_count END)                    AS total_passengers,
           SUM(CASE WHEN activity_type = 'Enplaned' THEN passenger_count END)        AS enplaned,
           SUM(CASE WHEN activity_type = 'Deplaned' THEN passenger_count END)        AS deplaned,
           SUM(CASE WHEN is_traffic = 1 AND geo_summary = 'International' THEN passenger_count END) AS international_passengers
    FROM vw_traffic
    GROUP BY year
)
SELECT
    year, is_full_year, months_reported, total_passengers, enplaned, deplaned, international_passengers,
    ROUND(100.0 * international_passengers / total_passengers, 1)                    AS international_share_pct,
    CASE WHEN is_full_year = 1 AND LAG(is_full_year) OVER (ORDER BY year) = 1
         THEN ROUND(100.0 * (total_passengers - LAG(total_passengers) OVER (ORDER BY year))
                    / LAG(total_passengers) OVER (ORDER BY year), 1) END             AS yoy_pct
FROM y;

-- ---------------------------------------------------------------------
-- Q3. Is the current (partial) year ahead or behind? Same-months-only view.
-- ---------------------------------------------------------------------
CREATE VIEW vw_ytd_comparison AS
WITH latest AS (
    SELECT MAX(year) AS yr FROM dim_date
),
cutoff AS (
    SELECT MAX(month) AS m FROM dim_date WHERE year = (SELECT yr FROM latest)
),
ytd AS (
    SELECT year,
           SUM(passenger_count) AS ytd_passengers
    FROM vw_traffic
    WHERE is_traffic = 1 AND month <= (SELECT m FROM cutoff)
    GROUP BY year
)
SELECT
    year,
    (SELECT m FROM cutoff)                                                           AS through_month,
    ytd_passengers,
    ROUND(100.0 * (ytd_passengers - LAG(ytd_passengers) OVER (ORDER BY year))
          / LAG(ytd_passengers) OVER (ORDER BY year), 1)                             AS ytd_yoy_pct,
    ROUND(100.0 * ytd_passengers /
          (SELECT ytd_passengers FROM ytd WHERE year = 2019), 1)                     AS pct_of_2019_ytd
FROM ytd
WHERE year >= 2000;           -- 1999 starts in July, so no like-for-like YTD

-- ---------------------------------------------------------------------
-- Q4. When are the peaks? Seasonality index (100 = average month), 2015-2019
-- ---------------------------------------------------------------------
CREATE VIEW vw_seasonality AS
WITH monthly AS (
    SELECT year, month, SUM(passenger_count) AS pax
    FROM vw_traffic
    WHERE is_traffic = 1 AND year BETWEEN 2015 AND 2019
    GROUP BY year, month
),
indexed AS (
    SELECT year, month,
           100.0 * pax / AVG(pax) OVER (PARTITION BY year) AS idx
    FROM monthly
)
SELECT
    month,
    substr('JanFebMarAprMayJunJulAugSepOctNovDec', (month - 1) * 3 + 1, 3) AS month_name,
    ROUND(AVG(idx), 1)                                                     AS seasonality_index,
    ROUND(MIN(idx), 1)                                                     AS min_index,
    ROUND(MAX(idx), 1)                                                     AS max_index
FROM indexed
GROUP BY month
ORDER BY month;

-- ---------------------------------------------------------------------
-- Q5. How far did traffic fall in COVID and how complete is the recovery?
-- ---------------------------------------------------------------------
CREATE VIEW vw_recovery_vs_2019 AS
SELECT
    c.date_key, c.month_start, c.year, c.month,
    c.total_passengers,
    b.total_passengers                                              AS same_month_2019,
    ROUND(100.0 * c.total_passengers / b.total_passengers, 1)       AS pct_of_2019
FROM vw_monthly_traffic c
JOIN vw_monthly_traffic b ON b.year = 2019 AND b.month = c.month
WHERE c.year >= 2020;

-- ---------------------------------------------------------------------
-- Q6. Who carries the passengers? Market share and rank per year
-- ---------------------------------------------------------------------
CREATE VIEW vw_airline_share_by_year AS
WITH a AS (
    SELECT year, is_full_year, airline_name, SUM(passenger_count) AS passengers
    FROM vw_traffic
    WHERE is_traffic = 1
    GROUP BY year, is_full_year, airline_name
)
SELECT
    year, is_full_year, airline_name, passengers,
    ROUND(100.0 * passengers / SUM(passengers) OVER (PARTITION BY year), 2) AS share_pct,
    RANK() OVER (PARTITION BY year ORDER BY passengers DESC)                AS rank_in_year
FROM a;

-- ---------------------------------------------------------------------
-- Q7. How concentrated is the market? Top-3 share and HHI per year
--     (HHI: <1,500 competitive | 1,500-2,500 moderate | >2,500 concentrated)
-- ---------------------------------------------------------------------
CREATE VIEW vw_airline_concentration AS
SELECT
    year, is_full_year,
    COUNT(*)                                                      AS airlines_operating,
    ROUND(SUM(CASE WHEN rank_in_year <= 3 THEN share_pct END), 1) AS top3_share_pct,
    ROUND(SUM(share_pct * share_pct), 0)                          AS hhi
FROM vw_airline_share_by_year
GROUP BY year, is_full_year;

-- ---------------------------------------------------------------------
-- Q8. Which markets (regions) feed the airport?
-- ---------------------------------------------------------------------
CREATE VIEW vw_region_by_year AS
WITH r AS (
    SELECT year, is_full_year, geo_summary, geo_region, SUM(passenger_count) AS passengers
    FROM vw_traffic
    WHERE is_traffic = 1
    GROUP BY year, is_full_year, geo_summary, geo_region
)
SELECT
    year, is_full_year, geo_summary, geo_region, passengers,
    ROUND(100.0 * passengers / SUM(passengers) OVER (PARTITION BY year), 2) AS share_of_total_pct,
    CASE WHEN is_full_year = 1 AND LAG(is_full_year) OVER (PARTITION BY geo_region ORDER BY year) = 1
         THEN ROUND(100.0 * (passengers - LAG(passengers) OVER (PARTITION BY geo_region ORDER BY year))
                    / LAG(passengers) OVER (PARTITION BY geo_region ORDER BY year), 1) END AS yoy_pct
FROM r;

-- ---------------------------------------------------------------------
-- Q9. Where is the growth headroom? Region scorecard for the latest full year
--     Metrics: pre-COVID CAGR (2015-2019), YoY, recovery vs 2019, gap in pax.
--     Heuristic: >=100% recovered | 80-100% recovering | <80% lagging (opportunity)
-- ---------------------------------------------------------------------
CREATE VIEW vw_region_growth_opportunities AS
WITH latest AS (
    SELECT MAX(year) AS yr FROM dim_date WHERE is_full_year = 1
),
p AS (
    SELECT geo_region,
           SUM(CASE WHEN year = 2015                          THEN passenger_count END) AS pax_2015,
           SUM(CASE WHEN year = 2019                          THEN passenger_count END) AS pax_2019,
           SUM(CASE WHEN year = (SELECT yr - 1 FROM latest)   THEN passenger_count END) AS pax_prior,
           SUM(CASE WHEN year = (SELECT yr FROM latest)       THEN passenger_count END) AS pax_latest
    FROM vw_traffic
    WHERE is_traffic = 1
    GROUP BY geo_region
)
SELECT
    geo_region,
    (SELECT yr FROM latest)                                                        AS latest_full_year,
    pax_2015, pax_2019, pax_prior, pax_latest,
    ROUND(100.0 * (POWER(1.0 * pax_2019 / pax_2015, 1.0 / 4) - 1), 1)              AS cagr_2015_2019_pct,
    ROUND(100.0 * (pax_latest - pax_prior) / pax_prior, 1)                         AS yoy_latest_pct,
    ROUND(100.0 * pax_latest / pax_2019, 1)                                        AS recovery_vs_2019_pct,
    pax_2019 - pax_latest                                                          AS passengers_gap_vs_2019,
    CASE WHEN 100.0 * pax_latest / pax_2019 >= 100 THEN 'Above 2019'
         WHEN 100.0 * pax_latest / pax_2019 >= 80  THEN 'Recovering'
         ELSE 'Lagging - opportunity' END                                          AS status
FROM p
WHERE pax_2015 > 0 AND pax_2019 > 0
ORDER BY recovery_vs_2019_pct DESC;

-- ---------------------------------------------------------------------
-- Q10. How are terminals loaded?
-- ---------------------------------------------------------------------
CREATE VIEW vw_terminal_by_year AS
SELECT
    year, is_full_year, terminal,
    SUM(passenger_count) AS passengers,
    ROUND(100.0 * SUM(passenger_count) / SUM(SUM(passenger_count)) OVER (PARTITION BY year), 2) AS share_pct
FROM vw_traffic
WHERE is_traffic = 1
GROUP BY year, is_full_year, terminal;

-- ---------------------------------------------------------------------
-- Q11. Domestic vs international mix and low-fare share of domestic traffic
-- ---------------------------------------------------------------------
CREATE VIEW vw_market_mix_by_year AS
SELECT
    year, is_full_year,
    SUM(passenger_count)                                                                        AS total_passengers,
    SUM(CASE WHEN geo_summary = 'Domestic'      THEN passenger_count END)                       AS domestic_passengers,
    SUM(CASE WHEN geo_summary = 'International' THEN passenger_count END)                       AS international_passengers,
    ROUND(100.0 * SUM(CASE WHEN geo_summary = 'International' THEN passenger_count END)
          / SUM(passenger_count), 1)                                                            AS international_share_pct,
    ROUND(100.0 * SUM(CASE WHEN geo_summary = 'Domestic' AND price_category = 'Low Fare' THEN passenger_count END)
          / SUM(CASE WHEN geo_summary = 'Domestic' THEN passenger_count END), 1)                AS low_fare_share_of_domestic_pct
FROM vw_traffic
WHERE is_traffic = 1
GROUP BY year, is_full_year;
