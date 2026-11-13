import type { Kpi } from '../types';

// The arrow keeps the up/down meaning readable without colour.
const ARROW = { up: '▲', down: '▼' } as const;

interface Props {
  kpis: Kpi[];
}

// Row of headline figures.
export default function KpiCards({ kpis }: Props) {
  return (
    <section className="kpis" aria-label="Key figures">
      {kpis.map((k) => (
        <div className="kpi" key={k.label}>
          <div className="kpi-label">{k.label}</div>
          <div className="kpi-value">{k.value}</div>
          <div className="kpi-note">
            {k.delta && (
              <span className={k.dir}>
                {k.dir !== '' && ARROW[k.dir]} {k.delta}
              </span>
            )}{' '}
            {k.note}
          </div>
        </div>
      ))}
    </section>
  );
}
