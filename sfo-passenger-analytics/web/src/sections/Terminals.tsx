import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard';
import ChartFrame from '../components/ChartFrame';
import ChartTooltip from '../components/ChartTooltip';
import type { Column } from '../components/DataTable';
import { COLORS, barCursor, categoryAxis, gridPropsHorizontalBars, valueAxis } from '../lib/chartTheme';
import { formatInt, formatPct } from '../lib/format';
import type { ShareRow } from '../types';

const columns: Column<ShareRow>[] = [
  { key: 'name', label: 'Terminal' },
  { key: 'pax', label: 'Passengers', numeric: true, render: (r) => formatInt(r.pax) },
  { key: 'share', label: 'Share', numeric: true, render: (r) => formatPct(r.share) },
];

interface Props {
  data: ShareRow[];
  takeaway: string;
  year: number;
}

export default function Terminals({ data, takeaway, year }: Props) {
  return (
    <ChartCard title={`Passengers by terminal, ${year}`} takeaway={takeaway} columns={columns} rows={data}>
      <ChartFrame label="Bar chart of passenger share by terminal">
        <BarChart layout="vertical" data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridPropsHorizontalBars} />
          <XAxis type="number" {...valueAxis} domain={[0, 40]} tickFormatter={(v: number) => `${v}%`} />
          <YAxis type="category" dataKey="name" {...categoryAxis} width={110} />
          <Tooltip
            cursor={barCursor}
            content={
              <ChartTooltip<ShareRow>
                formatValue={(v, item) => `${formatPct(v)} (${formatInt(item.payload?.pax)} passengers)`}
              />
            }
          />
          <Bar
            dataKey="share"
            name="Share of passengers"
            fill={COLORS.primary}
            radius={[0, 3, 3, 0]}
            maxBarSize={26}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartFrame>
    </ChartCard>
  );
}
