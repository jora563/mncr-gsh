import { LayersIcon, BriefcaseIcon, BotIcon, ShieldCheckIcon } from '../icons.jsx';

const CARDS = [
  { key: 'groups', tone: 'indigo', icon: LayersIcon, label: 'Группы проектов' },
  { key: 'projects', tone: 'green', icon: BriefcaseIcon, label: 'Проекты' },
  { key: 'bots', tone: 'amber', icon: BotIcon, label: 'Учётные записи ботов' },
  { key: 'platforms', tone: 'sky', icon: ShieldCheckIcon, label: 'Платформы подключены' },
];

export default function StatsRow({ stats, loading }) {
  return (
    <div className="stats">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div className="stat-card" key={card.key}>
            <div className={`stat-icon ${card.tone}`}>
              <Icon width={21} height={21} />
            </div>
            <div>
              <div className="stat-value">{loading ? '···' : stats[card.key]}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
