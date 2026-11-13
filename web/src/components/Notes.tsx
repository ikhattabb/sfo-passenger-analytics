import type { DataQuality } from '../types';

interface Props {
  dq: DataQuality;
}

// Bottom section: data-quality results and the definitions used in the analysis.
export default function Notes({ dq }: Props) {
  return (
    <section className="notes">
      <article className="card">
        <h2>Data quality checks</h2>
        <div className="dq-pills">
          <span>{dq.pass} passed</span>
          <span>{dq.warn} warnings, handled</span>
          <span>{dq.fail} failed</span>
        </div>
        <ul>
          {dq.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
          <li>All totals reconcile between the raw file, the cleaned table and the star schema.</li>
        </ul>
      </article>

      <article className="card">
        <h2>Definitions and method</h2>
        <ul>
          <li>
            Total passengers are enplaned plus deplaned. Thru/transit passengers stay on the aircraft and are
            reported separately.
          </li>
          <li>
            A full year has all 12 months reported. The current year is incomplete, so it is compared
            year-to-date only.
          </li>
          <li>Pre-COVID baseline is 2019. Seasonality uses the 2015 to 2019 average; 100 is an average month.</li>
          <li>Two United Airlines labels were merged so its trend is not split in two.</li>
        </ul>
      </article>
    </section>
  );
}
