import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard';
import ChartFrame from '../components/ChartFrame';
import ChartTooltip from '../components/ChartTooltip';
import type { Column } from '../components/DataTable';
import { COLORS, activeDot, categoryAxis, gridProps, lineCursor, valueAxis } from '../lib/chartTheme';
import { formatPct } from '../lib/format';
import type { MixRow } from '../types';

const columns: Column<MixRow>[] = [
  { key: 'year', label: 'Year' },
  { key: 'intl', label: 'International share', numeric: true, render: (r) => formatPct(r.intl) },
  { key: 'lowfare', label: 'Low-fare share of domestic', numeric: true, render: (r) => formatPct(r.lowfare) },
];

interface Props {
  data: MixRow[];
  takeaway: string;
}

export default function InternationalShare({ data, takeaway }: Props) {
  return (
    <ChartCard title="International share of passengers" takeaway={takeaway} columns={columns} rows={data}>
      <ChartFrame label="Line chart of the international share of passengers by year">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="year" {...categoryAxis} />
          <YAxis {...valueAxis} width={40} domain={[0, 40]} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip
            cursor={lineCursor}
            content={<ChartTooltip formatValue={(v) => `${v.toFixed(1)}% of passengers`} />}
          />
          <Line
            type="linear"
            dataKey="intl"
            name="International share"
            stroke={COLORS.primary}
            strokeWidth={2}
            dot={false}
            activeDot={activeDot}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartFrame>
    </ChartCard>
  );
}
