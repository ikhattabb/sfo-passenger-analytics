import type { ReactNode } from 'react';
import DataTable, { type Column } from './DataTable';

interface Props<Row> {
  title: string;
  takeaway: string;
  columns: Column<Row>[];
  rows: Row[];
  wide?: boolean;
  tableOpen?: boolean; // show the table directly instead of inside a collapsible "Data table"
  children: ReactNode;
}

// A titled card: heading, one-sentence takeaway, the chart, and the numbers behind it.
export default function ChartCard<Row>({
  title,
  takeaway,
  columns,
  rows,
  wide = false,
  tableOpen = false,
  children,
}: Props<Row>) {
  return (
    <article className={wide ? 'card wide' : 'card'}>
      <h2>{title}</h2>
      <p className="takeaway">{takeaway}</p>
      {children}
      {tableOpen ? (
        <div className="table-wrap open">
          <DataTable columns={columns} rows={rows} />
        </div>
      ) : (
        <details>
          <summary>Data table</summary>
          <div className="table-wrap">
            <DataTable columns={columns} rows={rows} />
          </div>
        </details>
      )}
    </article>
  );
}
