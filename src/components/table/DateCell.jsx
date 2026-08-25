import { formatDateParts } from '../../utils/format.js';

export default function DateCell({ value }) {
  const parts = formatDateParts(value);
  if (!parts) return <span className="muted">—</span>;
  return (
    <div className="date-cell">
      <b>{parts.date}</b>
      <span>{parts.time}</span>
    </div>
  );
}
