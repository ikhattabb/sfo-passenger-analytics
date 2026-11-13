# CV wording and interview notes

## Project entry (copy into the Projects section)

**Airport Passenger Traffic Intelligence: SFO Case Study** | SQL, TypeScript, React, Power BI
*Self-initiated project using public open data*

- Cleaned and validated 40,803 monthly airline passenger records (1999 to 2026) in SQL: fixed text-formatted numbers and dates, merged a split airline label, and built 14 automated data-quality checks that reconcile totals across raw, staging and fact tables.
- Designed a star schema (1 fact table, 4 dimensions) and 11 analysis views using window functions (LAG, RANK, rolling averages) to measure year-over-year growth, seasonality, COVID recovery, airline market share and concentration (HHI).
- Identified that 2025 traffic reached 94.8% of its 2019 level, with international routes to Asia 10% above 2019 while domestic traffic remained at 91%, and that July and August run about 17% above an average month.
- Automated the pipeline in TypeScript (Node.js): one command loads the CSV, runs the SQL, checks data quality and exports Power BI-ready tables.
- Built a Power BI-ready data model and a React dashboard with a takeaway line and data table for each chart, so non-technical readers can follow the findings.

## Shorter version (if space is tight)

- Built an SQL, TypeScript and Power BI analytics project on 27 years of public airport passenger data (40,803 records): cleaned and validated the data, modelled it as a star schema, and delivered a dashboard covering growth, seasonality, COVID recovery, regional markets and airline share.

## Skills line

SQL (joins, CTEs, window functions, data validation) | Data cleaning | Star-schema modelling | Power BI (DAX) | TypeScript | React | Data visualisation | Business insight reporting

## How the project maps to the job description

| Job requirement | Where it shows up in the project |
|---|---|
| Collect, clean and validate commercial and operational data | `01_staging.sql`, `03_data_quality.sql` |
| Analyse historical data and market trends to find growth areas | Annual and monthly trends, region scorecard (`vw_region_growth_opportunities`) |
| Market analysis of target segments | Regional and domestic/international mix, airline share and concentration |
| Build and maintain dashboards in Power BI or similar | `docs/POWERBI_GUIDE.md`, the React dashboard in `web/` |
| Gather reporting requirements from stakeholders | The six business questions in the README, each answered by one view |
| Explain insights to non-technical audiences | One-sentence takeaway on every chart |
| Attention to detail and accuracy | Reconciliation checks, partial-year handling, documented assumptions |

## Be ready to explain in an interview

1. **Why enplaned plus deplaned?** Transit passengers stay on the plane, so counting them would double count. They are reported separately.
2. **Why is 2026 not compared with 2025 as a full year?** It has only 8 months. It is compared year-to-date against the same 8 months of earlier years.
3. **Why merge the two United labels?** United's traffic is reported under two labels that overlap in time. The "Pre 07/01/2013" label ends in June 2013, so left split, United would seem to fall from 13.2M passengers in 2012 to 5.3M in 2013. Merged, the series is continuous (16.7M, 17.1M, 18.0M for 2012 to 2014), and a uniqueness check confirmed no rows were double counted.
4. **What would you do next?** Add a forecast, bring in airline seat capacity or fare data, and repeat the analysis with the airport's own data.
5. **Where are the limits?** One airport, monthly grain, and passenger counts rather than individual itineraries.
6. **Why TypeScript and not Python?** The analysis itself is in SQL, which does not depend on the language. TypeScript only runs the pipeline (load, execute, export) and feeds the dashboard, and it is the language I work in best. The job asks for Excel, SQL or Python, and SQL is the core of this project. Be ready to say you are also learning pandas if that is true.
7. **How do you know the numbers are right?** The SQL totals reconcile between raw, staging and fact tables (checks DQ-01 and DQ-02). Before the interview, do one extra check yourself so you can say you did it: add up enplaned plus deplaned passengers for 2025 in an Excel pivot table on the raw CSV and compare it with 54,359,433.

## Honesty note

Describe this as a self-initiated project on public data from a US airport, built to practise the skills in the role. Do not present it as work for SFO or any airport authority. Only quote numbers you can reproduce by running the pipeline.
