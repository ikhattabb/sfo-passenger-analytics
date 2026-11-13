// Shared Recharts styling. Colours are CSS variables from styles/tokens.css, so the
// charts follow the light / dark theme without any JavaScript.
import type { LegendProps } from 'recharts';

export const COLORS = {
  primary: 'var(--s1)',
  secondary: 'var(--s2)',
  reference: 'var(--muted)',
};

export const tickStyle = { fill: 'var(--muted)', fontSize: 12 };

// Grid lines. Column and line charts use horizontal lines; horizontal bar charts use vertical ones.
export const gridProps = { stroke: 'var(--grid)', vertical: false };
export const gridPropsHorizontalBars = { stroke: 'var(--grid)', horizontal: false };

// Props for the axis that carries categories (years, months, names).
export const categoryAxis = {
  tick: tickStyle,
  tickLine: false,
  axisLine: { stroke: 'var(--axis)' },
};

// Props for the axis that carries values (passengers, percentages).
export const valueAxis = {
  tick: tickStyle,
  tickLine: false,
  axisLine: false,
};

export const barCursor = { fill: 'var(--grid)', opacity: 0.5 };
export const lineCursor = { stroke: 'var(--axis)' };
export const activeDot = { r: 4, stroke: 'var(--surface)', strokeWidth: 2 };

export const legendProps: Partial<LegendProps> = {
  verticalAlign: 'top',
  align: 'left',
  iconType: 'plainline',
  wrapperStyle: { paddingBottom: 8, fontSize: 12 },
  formatter: (value) => <span style={{ color: 'var(--ink2)' }}>{value}</span>,
};

// On a horizontal reference line the "insideBottom..." positions draw the label above the line.
type LabelPosition = 'top' | 'insideBottomLeft' | 'insideBottomRight';

export const referenceLabel = (value: string, position: LabelPosition) => ({
  value,
  position,
  fill: 'var(--muted)',
  fontSize: 11,
});
