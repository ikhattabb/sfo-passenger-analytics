import Header from './components/Header';
import KpiCards from './components/KpiCards';
import Notes from './components/Notes';
import { dashboard } from './data';
import {
  AnnualPassengers,
  InternationalShare,
  MonthlyTrend,
  Recovery,
  RegionRecovery,
  Seasonality,
  Terminals,
  TopAirlines,
} from './sections';

// Every figure comes from dashboard.json, produced by scripts/export-dashboard-json.ts
// from the SQL analysis views. Nothing is calculated in the browser.
export default function App() {
  const { meta, kpis, takeaways } = dashboard;
  const year = meta.latestYear;

  return (
    <main className="wrap">
      <Header coverage={meta.coverage} />
      <KpiCards kpis={kpis} />

      <div className="grid">
        <AnnualPassengers data={dashboard.annual} takeaway={takeaways.annual} />
        <InternationalShare data={dashboard.mix} takeaway={takeaways.mix} />
        <MonthlyTrend data={dashboard.monthly} takeaway={takeaways.monthly} />
        <Recovery data={dashboard.recovery} takeaway={takeaways.recovery} />
        <Seasonality data={dashboard.season} takeaway={takeaways.season} />
        <RegionRecovery data={dashboard.regions} takeaway={takeaways.region} year={year} />
        <TopAirlines data={dashboard.airlines} takeaway={takeaways.airline} year={year} />
        <Terminals data={dashboard.terminals} takeaway={takeaways.terminal} year={year} />
      </div>

      <Notes dq={dashboard.dq} />
      <footer className="footer">{meta.source}</footer>
    </main>
  );
}
