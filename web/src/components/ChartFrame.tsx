import type { ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

interface Props {
  label: string; // read aloud by screen readers
  size?: 'short' | 'normal' | 'tall'; // chart height, see app.css
  children: ReactElement;
}

// Gives a chart a fixed-height box that stretches to the card width.
export default function ChartFrame({ label, size = 'normal', children }: Props) {
  const className = size === 'normal' ? 'plot' : `plot ${size}`;
  return (
    <div className={className} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 520, height: 280 }}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
