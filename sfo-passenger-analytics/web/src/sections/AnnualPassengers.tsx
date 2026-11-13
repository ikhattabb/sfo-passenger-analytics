import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard';
import ChartFrame from '../components/ChartFrame';
import ChartTooltip from '../components/ChartTooltip';
import type { Column } from '../components/DataTable';
import { COLORS, barCursor, categoryAxis, gridProps, valueAxis } from '../lib/chartTheme';
import { formatInt, formatPct, formatSignedPct } from '../lib/format';
import type { AnnualRow } from '../types';

const columns: Column<AnnualRow>[] = [
  { key: 'year', label: 'Year' },
  { key: 'total', label: 'Passengers', numeric: true, render: (r) => formatInt(r.total) },
  { key: 'yoy', label: 'YoY', numeric: true, render: (r) => formatSignedPct(r.yoy) },
  { key: 'intl', label: 'International share', numeric: true, render: (r) => formatPct(r.intl) },
];

interface Props {
  data: AnnualRow[];
  takeaway: string;
}

export default function AnnualPassengers({ data, takeaway }: Props) {
  const first = data[0].year;
  const last = data[data.length - 1].year;

  return (
    <ChartCard title="Annual passengers" takeaway={takeaway} columns={columns} rows={data}>
      <ChartFrame label={`Bar chart of annual passengers, ${first} to ${last}`}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="year" {...categoryAxis} />
          <YAxis {...valueAxis} width={44} tickFormatter={(v: number) => `${v / 1e6}M`} />
          <Tooltip
            cursor={barCursor}
            content={<ChartTooltip formatValue={(v) => `${formatInt(v)} passengers`} />}
          />
          <Bar
            dataKey="total"
            name="Passengers"
            fill={COLORS.primary}
            radius={[3, 3, 0, 0]}
            maxBarSize={22}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartFrame>
    </ChartCard>
  );
}
