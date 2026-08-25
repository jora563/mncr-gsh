import { GRADIENTS } from '../../constants.js';

export default function NameCell({ name, seed = 0 }) {
  if (!name) return <span className="muted">—</span>;
  const gradient = GRADIENTS[Math.abs(Number(seed) || 0) % GRADIENTS.length];
  return (
    <div className="name-cell">
      <div className={`name-icon ${gradient}`}>{String(name).charAt(0).toUpperCase()}</div>
      {name}
    </div>
  );
}
