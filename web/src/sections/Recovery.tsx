import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard';
import ChartFrame from '../components/ChartFrame';
import ChartTooltip from '../components/ChartTooltip';
import type { Column } from '../components/DataTable';
import {
  COLORS,
  activeDot,
  categoryAxis,
  gridProps,
  lineCursor,
  referenceLabel,
  valueAxis,
} from '../lib/chartTheme';
import { formatInt, formatMonth, formatPct } from '../lib/format';
import type { RecoveryRow } from '../types';

const columns: Column<RecoveryRow>[] = [
  { key: 'm', label: 'Month' },
  { key: 'total', label: 'Passengers', numeric: true, render: (r) => formatInt(r.total) },
  { key: 'base', label: 'Same month 2019', numeric: true, render: (r) => formatInt(r.base) },
  { key: 'pct', label: 'Percent of 2019', numeric: true, render: (r) => formatPct(r.pct) },
];

interface Props {
  data: RecoveryRow[];
  takeaway: string;
}

export default function Recovery({ data, takeaway }: Props) {
  const ticks = data.filter((d) => d.m.endsWith('-01')).map((d) => d.m);

  return (
    <ChartCard title="Recovery against the same month of 2019" takeaway={takeaway} columns={columns} rows={data}>
      <ChartFrame label="Line chart of monthly passengers as a percentage of the same month in 2019">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="m"
            {...categoryAxis}
            ticks={ticks}
            interval={0}
            tickFormatter={(m: string) => m.slice(0, 4)}
          />
          <YAxis
            {...valueAxis}
            width={40}
            domain={([, max]) => [0, Math.max(110, Math.ceil(max / 10) * 10)]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <ReferenceLine
            y={100}
            stroke={COLORS.reference}
            strokeDasharray="4 4"
            label={referenceLabel('2019 level (100%)', 'insideBottomRight')}
          />
          <Tooltip
            cursor={lineCursor}
            content={<ChartTooltip formatLabel={formatMonth} formatValue={(v) => `${v.toFixed(1)}% of 2019`} />}
          />
          <Line
            type="linear"
            dataKey="pct"
            name="Percent of same month in 2019"
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
