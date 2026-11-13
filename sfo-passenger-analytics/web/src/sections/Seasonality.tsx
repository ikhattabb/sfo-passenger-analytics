import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard';
import ChartFrame from '../components/ChartFrame';
import ChartTooltip from '../components/ChartTooltip';
import type { Column } from '../components/DataTable';
import { COLORS, barCursor, categoryAxis, gridProps, referenceLabel, valueAxis } from '../lib/chartTheme';
import type { SeasonRow } from '../types';

const columns: Column<SeasonRow>[] = [
  { key: 'name', label: 'Month' },
  { key: 'idx', label: 'Index', numeric: true, render: (r) => r.idx.toFixed(1) },
  { key: 'min', label: 'Lowest year', numeric: true, render: (r) => r.min.toFixed(1) },
  { key: 'max', label: 'Highest year', numeric: true, render: (r) => r.max.toFixed(1) },
];

interface Props {
  data: SeasonRow[];
  takeaway: string;
}

export default function Seasonality({ data, takeaway }: Props) {
  return (
    <ChartCard title="Seasonality, 2015 to 2019" takeaway={takeaway} columns={columns} rows={data}>
      <ChartFrame label="Bar chart of the seasonality index by month; 100 is an average month">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="name" {...categoryAxis} />
          <YAxis {...valueAxis} width={36} domain={[0, 140]} ticks={[0, 40, 80, 120]} />
          <ReferenceLine
            y={100}
            stroke={COLORS.reference}
            strokeDasharray="4 4"
            label={referenceLabel('Average month = 100', 'insideBottomLeft')}
          />
          <Tooltip cursor={barCursor} content={<ChartTooltip formatValue={(v) => `Index ${v.toFixed(1)}`} />} />
          <Bar
            dataKey="idx"
            name="Seasonality index"
            fill={COLORS.primary}
            radius={[3, 3, 0, 0]}
            maxBarSize={26}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartFrame>
    </ChartCard>
  );
}
