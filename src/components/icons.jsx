const defaults = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function PlusIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function RefreshIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function PencilIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function EyeIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M17.94 17.94A10.5 10.5 0 0 1 12 19c-6.5 0-10-7-10-7a18.4 18.4 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.8 9.8 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export function SunIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function MoonIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

export function XIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function LayersIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

export function BriefcaseIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </svg>
  );
}

export function BotIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

export function ShieldCheckIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function LogOutIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

export function AlertTriangleIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function MessageSquareIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function SendIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

export function UserIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function ClockIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function PowerIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" x2="12" y1="2" y2="12" />
    </svg>
  );
}

export function PowerOffIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M18.36 6.64A9 9 0 0 0 12 2" />
      <path d="M12 2v10" />
      <path d="M18.36 6.64A9 9 0 1 1 5.64 6.64" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

export function LoaderIcon(props) {
  return (
    <svg {...defaults} {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function BrainIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
      <path d="M19 10.5A3.5 3.5 0 0 0 22 14v3a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a3.5 3.5 0 0 0 1-2.5Z"/>
      <path d="M5 10.5A3.5 3.5 0 0 1 2 14v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a3.5 3.5 0 0 1-1-2.5Z"/>
    </svg>
  );
}
