import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard';
import ChartFrame from '../components/ChartFrame';
import ChartTooltip from '../components/ChartTooltip';
import type { Column } from '../components/DataTable';
import {
  COLORS,
  activeDot,
  categoryAxis,
  gridProps,
  legendProps,
  lineCursor,
  valueAxis,
} from '../lib/chartTheme';
import { formatInt, formatMonth, formatSignedPct } from '../lib/format';
import type { MonthlyRow } from '../types';

const columns: Column<MonthlyRow>[] = [
  { key: 'm', label: 'Month' },
  { key: 'total', label: 'Passengers', numeric: true, render: (r) => formatInt(r.total) },
  { key: 'roll', label: '12-month average', numeric: true, render: (r) => formatInt(r.roll) },
  { key: 'yoy', label: 'YoY', numeric: true, render: (r) => formatSignedPct(r.yoy) },
];

// Label the axis only at January of every fifth year (2000, 2005, ...) to keep it clean.
const isLabelledMonth = (m: string) => m.endsWith('-01') && Number(m.slice(0, 4)) % 5 === 0;

interface Props {
  data: MonthlyRow[];
  takeaway: string;
}

export default function MonthlyTrend({ data, takeaway }: Props) {
  const ticks = data.filter((d) => isLabelledMonth(d.m)).map((d) => d.m);

  return (
    <ChartCard wide title="Monthly passengers and 12-month average" takeaway={takeaway} columns={columns} rows={data}>
      <ChartFrame size="tall" label="Line chart of monthly passengers with a 12-month rolling average">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="m"
            {...categoryAxis}
            ticks={ticks}
            interval={0}
            tickFormatter={(m: string) => m.slice(0, 4)}
          />
          <YAxis {...valueAxis} width={44} tickFormatter={(v: number) => `${v / 1e6}M`} />
          <Legend {...legendProps} />
          <Tooltip
            cursor={lineCursor}
            content={<ChartTooltip formatLabel={formatMonth} formatValue={(v) => formatInt(v)} />}
          />
          <Line
            type="linear"
            dataKey="total"
            name="Monthly passengers"
            stroke={COLORS.primary}
            strokeWidth={2}
            dot={false}
            activeDot={activeDot}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="roll"
            name="12-month average"
            stroke={COLORS.secondary}
            strokeWidth={2}
            dot={false}
            activeDot={activeDot}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartFrame>
    </ChartCard>
  );
}
