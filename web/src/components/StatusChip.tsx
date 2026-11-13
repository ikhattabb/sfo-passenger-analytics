// Status label with a coloured dot. The text always carries the meaning; the dot is a hint.
const DOT: Record<string, string> = {
  'Above 2019': 'var(--status-good)',
  Recovering: 'var(--status-warn)',
  'Lagging - opportunity': 'var(--status-serious)',
};

interface Props {
  status: string;
}

export default function StatusChip({ status }: Props) {
  return (
    <span className="chip">
      <i style={{ background: DOT[status] ?? 'var(--muted)' }} />
      {status}
    </span>
  );
}
