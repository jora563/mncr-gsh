import { KNOWN_PLATFORMS } from '../../constants.js';

export default function PlatformBadge({ name }) {
  if (!name) return <span className="muted">—</span>;
  const lower = String(name).toLowerCase();
  const known = KNOWN_PLATFORMS.find((platform) => lower.includes(platform.match));
  return <span className={`badge ${known ? known.className : 'badge--neutral'}`}>{name}</span>;
}
