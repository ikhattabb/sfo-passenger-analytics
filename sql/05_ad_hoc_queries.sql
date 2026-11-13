-- =====================================================================
-- 05_ad_hoc_queries.sql
-- Example stakeholder questions answered directly in SQL.
-- Run any block against db/sfo_passenger_analytics.db (e.g. DB Browser for SQLite).
-- =====================================================================

-- A1. Top 10 airlines in the latest full year, with market share
SELECT airline_name, passengers, share_pct, rank_in_year
FROM vw_airline_share_by_year
WHERE year = (SELECT MAX(year) FROM dim_date WHERE is_full_year = 1)
  AND rank_in_year <= 10
ORDER BY rank_in_year;

-- A2. Fastest-growing airlines, 2019 -> latest full year
--     (only carriers that were already meaningful in 2019 to avoid tiny-base noise)
WITH p AS (
    SELECT airline_name,
           SUM(CASE WHEN year = 2019 THEN passenger_count END) AS pax_2019,
           SUM(CASE WHEN year = (SELECT MAX(year) FROM dim_date WHERE is_full_year = 1)
                    THEN passenger_count END)                  AS pax_latest
    FROM vw_traffic
    WHERE is_traffic = 1
    GROUP BY airline_name
)
SELECT airline_name, pax_2019, pax_latest,
       pax_latest - pax_2019                                      AS change_in_passengers,
       ROUND(100.0 * (pax_latest - pax_2019) / pax_2019, 1)       AS change_pct
FROM p
WHERE pax_2019 >= 250000 AND pax_latest IS NOT NULL
ORDER BY change_in_passengers DESC
LIMIT 10;

-- A3. Largest airlines that have stopped reporting (market exits / mergers)
SELECT a.airline_name, a.first_period, a.last_period,
       SUM(v.passenger_count) AS lifetime_passengers
FROM dim_airline a
JOIN vw_traffic v ON v.airline_name = a.airline_name AND v.is_traffic = 1
WHERE a.is_active = 0
GROUP BY a.airline_name, a.first_period, a.last_period
ORDER BY lifetime_passengers DESC
LIMIT 10;

-- A4. Five busiest months on record
SELECT month_start, total_passengers
FROM vw_monthly_traffic
ORDER BY total_passengers DESC
LIMIT 5;

-- A5. International traffic: each region's share of the international total, latest full year
SELECT geo_region, passengers,
       ROUND(100.0 * passengers / SUM(passengers) OVER (), 1) AS share_of_international_pct
FROM vw_region_by_year
WHERE year = (SELECT MAX(year) FROM dim_date WHERE is_full_year = 1)
  AND geo_summary = 'International'
ORDER BY passengers DESC;

-- A6. Worst single-month drops vs the same month of the previous year
SELECT month_start, total_passengers, same_month_prior_year, yoy_pct
FROM vw_monthly_traffic
WHERE yoy_pct IS NOT NULL
ORDER BY yoy_pct ASC
LIMIT 5;
