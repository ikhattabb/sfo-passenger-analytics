import type { ReactNode } from 'react';

// Describes one table column:
//   key      field name in the row (used when there is no render function)
//   numeric  right-aligns the column
//   render   custom cell content
export interface Column<Row> {
  key: string;
  label: string;
  numeric?: boolean;
  render?: (row: Row) => ReactNode;
}

interface Props<Row> {
  columns: Column<Row>[];
  rows: Row[];
}

export default function DataTable<Row>({ columns, rows }: Props<Row>) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} className={c.numeric ? 'num' : undefined}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.key} className={c.numeric ? 'num' : undefined}>
                {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
