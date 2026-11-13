-- =====================================================================
-- 01_staging.sql
-- Purpose : Clean and standardise the raw CSV load into a typed staging table.
-- Input   : raw_sfo_passengers   (all columns TEXT, loaded 1:1 from the CSV)
-- Output  : stg_passenger_activity
-- Dialect : SQLite (functions noted where T-SQL / PostgreSQL differ)
--
-- Cleaning rules applied
--   1. Passenger Count is stored as text with thousand separators ("31,432")
--      -> strip commas, cast to INTEGER.
--   2. Start date is "YYYY/MM/DD" text -> ISO date "YYYY-MM-DD".
--   3. Empty strings in IATA code columns -> NULL.
--   4. Leading / trailing whitespace trimmed on all text fields.
--   5. Airline name harmonisation: United traffic is reported under two labels.
--      "United Airlines - Pre 07/01/2013" runs 1999-07 to 2013-06 and carries most
--      of the volume (about 13M passengers a year); "United Airlines" carries a
--      smaller stream before 2013 and everything after. Left split, United would
--      appear to fall from 13.2M (2012) to 5.3M (2013). Merged, the series is
--      continuous (16.7M in 2012, 17.1M in 2013, 18.0M in 2014).
--      DQ-07 confirms no rows collide after the merge, so nothing is double counted.
-- =====================================================================

DROP TABLE IF EXISTS stg_passenger_activity;

CREATE TABLE stg_passenger_activity AS
SELECT
    r.rowid                                                        AS source_row_id,
    CAST(r.activity_period AS INTEGER)                             AS activity_period,      -- YYYYMM
    date(replace(trim(r.activity_period_start_date), '/', '-'))    AS activity_month,      -- first day of month
    CAST(substr(r.activity_period, 1, 4) AS INTEGER)               AS year,
    CAST(substr(r.activity_period, 5, 2) AS INTEGER)               AS month,

    trim(r.operating_airline)                                      AS operating_airline_raw,
    CASE
        WHEN trim(r.operating_airline) LIKE 'United Airlines - Pre %'
            THEN 'United Airlines'
        ELSE trim(r.operating_airline)
    END                                                            AS operating_airline,
    NULLIF(trim(r.operating_airline_iata_code), '')                AS operating_iata,

    trim(r.published_airline)                                      AS published_airline,
    NULLIF(trim(r.published_airline_iata_code), '')                AS published_iata,

    trim(r.geo_summary)                                            AS geo_summary,          -- Domestic / International
    trim(r.geo_region)                                             AS geo_region,
    trim(r.activity_type_code)                                     AS activity_type,        -- Enplaned / Deplaned / Thru / Transit
    trim(r.price_category_code)                                    AS price_category,       -- Low Fare / Other
    trim(r.terminal)                                               AS terminal,
    trim(r.boarding_area)                                          AS boarding_area,

    CAST(replace(trim(r.passenger_count), ',', '') AS INTEGER)     AS passenger_count,
    r.data_as_of                                                   AS source_data_as_of
FROM raw_sfo_passengers AS r;

CREATE INDEX idx_stg_period  ON stg_passenger_activity (activity_period);
CREATE INDEX idx_stg_airline ON stg_passenger_activity (operating_airline);
