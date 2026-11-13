-- =====================================================================
-- 03_data_quality.sql
-- Purpose : Validate the data after cleaning and after modelling.
-- Output  : dq_results  (one row per check: PASS / WARN / FAIL)
--   PASS = as expected | WARN = known issue, handled and documented
--   FAIL = must be investigated before reporting
-- =====================================================================

DROP TABLE IF EXISTS dq_results;
CREATE TABLE dq_results (
    check_id   TEXT PRIMARY KEY,
    category   TEXT,
    check_name TEXT,
    expected   TEXT,
    observed   TEXT,
    status     TEXT,
    note       TEXT
);

-- DQ-01 Completeness: no rows lost between raw and staging
INSERT INTO dq_results
SELECT 'DQ-01', 'Completeness', 'Raw rows = staging rows',
       r.n, s.n, CASE WHEN r.n = s.n THEN 'PASS' ELSE 'FAIL' END, ''
FROM (SELECT COUNT(*) AS n FROM raw_sfo_passengers)       r,
     (SELECT COUNT(*) AS n FROM stg_passenger_activity)   s;

-- DQ-02 Reconciliation: passenger totals match raw -> staging -> fact
INSERT INTO dq_results
SELECT 'DQ-02', 'Reconciliation', 'Total passengers: staging = fact',
       s.n, f.n, CASE WHEN s.n = f.n THEN 'PASS' ELSE 'FAIL' END,
       'Sum of passenger_count across all activity types'
FROM (SELECT SUM(passenger_count) AS n FROM stg_passenger_activity)   s,
     (SELECT SUM(passenger_count) AS n FROM fact_passenger_activity)  f;

-- DQ-03 Validity: no NULLs in critical columns
INSERT INTO dq_results
SELECT 'DQ-03', 'Validity', 'NULLs in critical columns', 0, n,
       CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END,
       'activity_period, month start, airline, geo, activity type, passenger count'
FROM (SELECT COUNT(*) AS n FROM stg_passenger_activity
      WHERE activity_period IS NULL OR activity_month IS NULL OR operating_airline IS NULL
         OR geo_summary IS NULL OR geo_region IS NULL OR activity_type IS NULL
         OR passenger_count IS NULL);

-- DQ-04 Validity: no negative passenger counts
INSERT INTO dq_results
SELECT 'DQ-04', 'Validity', 'Negative passenger counts', 0, n,
       CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END, ''
FROM (SELECT COUNT(*) AS n FROM stg_passenger_activity WHERE passenger_count < 0);

-- DQ-05 Validity: zero-passenger rows (kept, they add nothing to totals)
INSERT INTO dq_results
SELECT 'DQ-05', 'Validity', 'Rows with zero passengers', 0, n,
       CASE WHEN n = 0 THEN 'PASS' ELSE 'WARN' END,
       'Kept in the data; no effect on sums. Reviewed individually.'
FROM (SELECT COUNT(*) AS n FROM stg_passenger_activity WHERE passenger_count = 0);

-- DQ-06 Completeness: missing IATA codes (reference attribute only)
INSERT INTO dq_results
SELECT 'DQ-06', 'Completeness', 'Rows with missing operating-airline IATA code', 0, n,
       CASE WHEN n = 0 THEN 'PASS' ELSE 'WARN' END,
       'Mostly historical / charter carriers. Airline name is used as the key, not the code.'
FROM (SELECT COUNT(*) AS n FROM stg_passenger_activity WHERE operating_iata IS NULL);

-- DQ-07 Uniqueness: duplicate natural keys after airline-name harmonisation
INSERT INTO dq_results
SELECT 'DQ-07', 'Uniqueness', 'Duplicate natural keys after harmonisation', 0, COALESCE(SUM(c - 1), 0),
       CASE WHEN COALESCE(SUM(c - 1), 0) = 0 THEN 'PASS' ELSE 'WARN' END,
       'Colliding rows are summed in the fact table (see 02_star_schema.sql)'
FROM (SELECT COUNT(*) AS c FROM stg_passenger_activity
      GROUP BY activity_period, operating_airline, published_airline, geo_summary, geo_region,
               activity_type, price_category, terminal, boarding_area
      HAVING COUNT(*) > 1);

-- DQ-08 Continuity: no missing months between first and last period
INSERT INTO dq_results
SELECT 'DQ-08', 'Continuity', 'Distinct months = months in date range',
       expected_months, actual_months,
       CASE WHEN expected_months = actual_months THEN 'PASS' ELSE 'FAIL' END,
       'Needed for 12-month lag / year-over-year calculations'
FROM (SELECT MAX(year * 12 + month) - MIN(year * 12 + month) + 1 AS expected_months,
             COUNT(*) AS actual_months
      FROM dim_date);

-- DQ-09 Consistency: YYYYMM period code agrees with the start-date column
INSERT INTO dq_results
SELECT 'DQ-09', 'Consistency', 'Period code vs start date mismatches', 0, n,
       CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END, ''
FROM (SELECT COUNT(*) AS n FROM stg_passenger_activity
      WHERE CAST(strftime('%Y%m', activity_month) AS INTEGER) <> activity_period);

-- DQ-10 Domain: only expected category values
INSERT INTO dq_results
SELECT 'DQ-10', 'Validity', 'Unexpected activity type / domestic-international values', 0, n,
       CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END, ''
FROM (SELECT COUNT(*) AS n FROM stg_passenger_activity
      WHERE activity_type NOT IN ('Enplaned', 'Deplaned', 'Thru / Transit')
         OR geo_summary   NOT IN ('Domestic', 'International'));

-- DQ-11 Consistency: Domestic rows <-> region 'US' only
INSERT INTO dq_results
SELECT 'DQ-11', 'Consistency', 'Domestic/International vs region contradictions', 0, n,
       CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END, ''
FROM (SELECT COUNT(*) AS n FROM stg_passenger_activity
      WHERE (geo_summary = 'Domestic' AND geo_region <> 'US')
         OR (geo_summary = 'International' AND geo_region = 'US'));

-- DQ-12 Reasonableness: enplaned vs deplaned should be roughly balanced each full year (+/-3%)
INSERT INTO dq_results
SELECT 'DQ-12', 'Reasonableness', 'Full years where enplaned/deplaned ratio is outside 0.97-1.03', 0, n,
       CASE WHEN n = 0 THEN 'PASS' ELSE 'WARN' END,
       'Travellers leave roughly as many times as they arrive'
FROM (SELECT COUNT(*) AS n FROM (
        SELECT year,
               1.0 * SUM(CASE WHEN activity_type = 'Enplaned' THEN passenger_count END)
                   / SUM(CASE WHEN activity_type = 'Deplaned' THEN passenger_count END) AS ratio
        FROM vw_traffic WHERE is_full_year = 1 GROUP BY year)
      WHERE ratio NOT BETWEEN 0.97 AND 1.03);

-- DQ-13 Reasonableness: label of the latest, incomplete year
INSERT INTO dq_results
SELECT 'DQ-13', 'Reasonableness', 'Latest year is incomplete', 12, n_months,
       CASE WHEN n_months = 12 THEN 'PASS' ELSE 'WARN' END,
       'Latest year is excluded from full-year trends and compared year-to-date only'
FROM (SELECT COUNT(*) AS n_months FROM dim_date WHERE year = (SELECT MAX(year) FROM dim_date));

-- DQ-14 Harmonisation applied: no raw "Pre 07/01/2013" label left in the model
INSERT INTO dq_results
SELECT 'DQ-14', 'Consistency', 'Legacy United label remaining in dim_airline', 0, n,
       CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END, ''
FROM (SELECT COUNT(*) AS n FROM dim_airline WHERE airline_name LIKE '%Pre 07/01/2013%');
