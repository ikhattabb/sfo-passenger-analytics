import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import ChartCard from '../components/ChartCard';
import ChartFrame from '../components/ChartFrame';
import ChartTooltip from '../components/ChartTooltip';
import type { Column } from '../components/DataTable';
import StatusChip from '../components/StatusChip';
import {
  COLORS,
  barCursor,
  categoryAxis,
  gridPropsHorizontalBars,
  referenceLabel,
  valueAxis,
} from '../lib/chartTheme';
import { formatInt, formatPct, formatSignedPct } from '../lib/format';
import type { RegionRow } from '../types';

interface Props {
  data: RegionRow[];
  takeaway: string;
  year: number;
}

export default function RegionRecovery({ data, takeaway, year }: Props) {
  const columns: Column<RegionRow>[] = [
    { key: 'region', label: 'Region' },
    { key: 'latest', label: `${year} passengers`, numeric: true, render: (r) => formatInt(r.latest) },
    { key: 'cagr', label: 'CAGR 2015-2019', numeric: true, render: (r) => formatPct(r.cagr) },
    { key: 'yoy', label: 'YoY', numeric: true, render: (r) => formatSignedPct(r.yoy) },
    { key: 'rec', label: 'Percent of 2019', numeric: true, render: (r) => formatPct(r.rec) },
    { key: 'intlShare', label: 'Share of international', numeric: true, render: (r) => formatPct(r.intlShare) },
    { key: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
  ];

  return (
    <ChartCard
      wide
      tableOpen
      title={`Recovery by region, ${year} against 2019`}
      takeaway={takeaway}
      columns={columns}
      rows={data}
    >
      <ChartFrame size="short" label="Bar chart of each region's passengers as a percentage of 2019">
        <BarChart layout="vertical" data={data} margin={{ top: 22, right: 24, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridPropsHorizontalBars} />
          <XAxis
            type="number"
            {...valueAxis}
            domain={[0, 140]}
            ticks={[0, 25, 50, 75, 100, 125]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis type="category" dataKey="region" {...categoryAxis} width={130} />
          <ReferenceLine
            x={100}
            stroke={COLORS.reference}
            strokeDasharray="4 4"
            label={referenceLabel('2019 = 100%', 'top')}
          />
          <Tooltip cursor={barCursor} content={<ChartTooltip formatValue={(v) => `${v.toFixed(1)}% of 2019`} />} />
          <Bar
            dataKey="rec"
            name="Percent of 2019"
            fill={COLORS.primary}
            radius={[0, 3, 3, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartFrame>
    </ChartCard>
  );
}
