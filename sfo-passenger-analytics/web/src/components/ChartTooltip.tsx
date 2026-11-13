export interface TooltipItem<Row> {
  dataKey?: string | number;
  name?: string | number;
  value?: number | null;
  color?: string;
  payload?: Row; // the full data row behind the hovered mark
}

interface Props<Row> {
  // Filled in by Recharts when it renders the tooltip.
  active?: boolean;
  payload?: ReadonlyArray<TooltipItem<Row>>;
  label?: string | number;
  // Set by each chart.
  formatValue: (value: number, item: TooltipItem<Row>) => string;
  formatLabel?: (label: string) => string;
}

// Tooltip shared by every chart.
export default function ChartTooltip<Row = unknown>({
  active,
  payload,
  label,
  formatValue,
  formatLabel = String,
}: Props<Row>) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p): p is TooltipItem<Row> & { value: number } => p.value != null);
  if (!items.length) return null;

  return (
    <div className="tooltip">
      <div className="tooltip-title">{formatLabel(String(label ?? ''))}</div>
      {items.map((p) => (
        <div className="tooltip-row" key={p.dataKey ?? p.name}>
          <span className="swatch" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="tooltip-value">{formatValue(p.value, p)}</span>
        </div>
      ))}
    </div>
  );
}
