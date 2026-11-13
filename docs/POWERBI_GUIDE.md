# Power BI Build Guide

Build the report in Power BI Desktop from the CSV files in `output/powerbi/`. Allow about 45 minutes.

## 1. Load the data

Get Data > Text/CSV, then load these five tables (star schema):

- `fact_passenger_activity.csv`
- `dim_date.csv`
- `dim_airline.csv`
- `dim_geo.csv`
- `dim_gate.csv`

In Power Query, check column types: `passenger_count` and the `*_key` columns are whole numbers; `month_start` is Date.

Optional pre-computed tables for quick visuals or cross-checking: `vw_monthly_traffic.csv`, `vw_annual_traffic.csv`, `vw_recovery_vs_2019.csv`, `vw_seasonality.csv`, `vw_region_growth_opportunities.csv`, `vw_airline_share_by_year.csv`.

## 2. Model

Model view, one-to-many relationships, single direction, dimension to fact:

| From (one) | To (many) |
|---|---|
| `dim_date[date_key]` | `fact_passenger_activity[date_key]` |
| `dim_airline[airline_key]` | `fact_passenger_activity[airline_key]` |
| `dim_geo[geo_key]` | `fact_passenger_activity[geo_key]` |
| `dim_gate[gate_key]` | `fact_passenger_activity[gate_key]` |

Hide the key columns in report view. Sort `dim_date[month_name]` by `dim_date[month]`.

## 3. DAX measures

Create a measures table and add:

```dax
Total Passengers =
CALCULATE (
    SUM ( fact_passenger_activity[passenger_count] ),
    fact_passenger_activity[activity_type] IN { "Enplaned", "Deplaned" }
)

Transit Passengers =
CALCULATE (
    SUM ( fact_passenger_activity[passenger_count] ),
    fact_passenger_activity[activity_type] = "Thru / Transit"
)

Passengers PY =
VAR y = MAX ( dim_date[year] )
RETURN
    CALCULATE ( [Total Passengers], ALL ( dim_date[year] ), dim_date[year] = y - 1 )

YoY % = DIVIDE ( [Total Passengers] - [Passengers PY], [Passengers PY] )

Passengers 2019 =
CALCULATE ( [Total Passengers], ALL ( dim_date[year] ), dim_date[year] = 2019 )

Recovery vs 2019 % = DIVIDE ( [Total Passengers], [Passengers 2019] )

International Share % =
DIVIDE (
    CALCULATE ( [Total Passengers], dim_geo[geo_summary] = "International" ),
    [Total Passengers]
)

Airline Share % =
DIVIDE ( [Total Passengers], CALCULATE ( [Total Passengers], ALL ( dim_airline ) ) )
```

`Passengers PY` and `Passengers 2019` clear only the year filter, so a month or region selected on the page still applies. A year-over-year or recovery value is only meaningful when the same months are compared; for the incomplete latest year use the `vw_ytd_comparison.csv` table.

## 4. Check your numbers

These measures were not run in Power BI while building this project, so confirm them against the SQL results before publishing:

| Check | Expected |
|---|---|
| `Total Passengers` for 2025 | 54,359,433 |
| `Total Passengers` for 2019 | 57,349,125 |
| `YoY %` for 2025 | +4.3% |
| `Recovery vs 2019 %` for 2025 | 94.8% |
| `International Share %` for 2025 | 29.3% |

## 5. Suggested report layout

**Page 1, Overview.** Cards: Total Passengers, YoY %, Recovery vs 2019 %, International Share %. Column chart of Total Passengers by year; line chart by month; slicers for year, region and domestic/international.

**Page 2, Recovery and seasonality.** Line chart of `pct_of_2019` by month (from `vw_recovery_vs_2019`) with a constant 100% reference line; column chart of `seasonality_index` by month.

**Page 3, Markets and airlines.** Bar chart of Recovery vs 2019 % by `geo_region`; table from `vw_region_growth_opportunities` with conditional formatting on status; top 10 airlines by Airline Share %; terminal share.

## 6. Design rules

- One colour for a single series; a second colour only when comparing two series.
- Start bar charts at zero; label axes with units (M for millions).
- Put the headline number and a one-line takeaway on every page, so a non-technical reader gets the message without reading the chart.
- Keep slicers in one row at the top.
