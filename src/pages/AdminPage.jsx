import { useMemo, useState } from 'react'
import { useTheme } from '../providers/theme/useTheme.js'
import { useDashboardData } from '../hooks/useDashboardData.js'
import StatsRow from '../components/dashboard/StatsRow.jsx'
import ApiStatus from '../components/dashboard/ApiStatus.jsx'
import GroupsTab from '../features/groups/GroupsTab.jsx'
import ProjectsTab from '../features/projects/ProjectsTab.jsx'
import BotsTab from '../features/bots/BotsTab.jsx'
import { keycloak } from '../services/keycloak.js'
import { LayersIcon, BriefcaseIcon, BotIcon, SunIcon, MoonIcon, LogOutIcon, KeyIcon } from '../components/icons.jsx'

const SECTIONS = [
  { id: 'groups', label: 'Группы проектов', subtitle: 'Управление проектными группами', icon: LayersIcon },
  { id: 'projects', label: 'Проекты', subtitle: 'Управление проектами и их привязкой к группам', icon: BriefcaseIcon },
  { id: 'bots', label: 'Боты', subtitle: 'Учётные записи ботов и их токены', icon: BotIcon },
]

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <button type="button" className="theme-btn" aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'} onClick={toggleTheme}>
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

function Sidebar({ active, onSelect, stats, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">A</div>
        <div className="logo-text">
          AIOMNI
          <span>Admin Panel</span>
        </div>
      </div>

      <nav className="nav">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <button
              key={section.id}
              type="button"
              className={`nav-item ${active === section.id ? 'active' : ''}`}
              onClick={() => onSelect(section.id)}
            >
              <Icon width={18} height={18} />
              <span>{section.label}</span>
              <em className="nav-count">{stats[section.id]}</em>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <ApiStatus />
        <div className="session-chip">
          <div className="session-avatar">
            <KeyIcon width={15} height={15} />
          </div>
          <div className="session-info">
            <b>Сессия активна</b>
            <span>Keycloak</span>
          </div>
          <button type="button" className="session-logout" title="Выйти" onClick={onLogout}>
            <LogOutIcon width={15} height={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}

function AdminPanel() {
  const [active, setActive] = useState('groups')
  const { groups, projects, bots, platforms, loading, refresh } = useDashboardData(true)

  const stats = useMemo(
    () => ({
      groups: groups.length,
      projects: projects.length,
      bots: bots.length,
      platforms: new Set(bots.map((bot) => bot.platform?.platform?.id).filter((id) => id != null)).size,
    }),
    [groups, projects, bots]
  )

  const section = SECTIONS.find((item) => item.id === active)

  const logout = () => {
    keycloak.logout()
  }

  return (
    <div className="app">
      <Sidebar active={active} onSelect={setActive} stats={stats} onLogout={logout} />
      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{section.label}</h1>
            <p>{section.subtitle}</p>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
          </div>
        </header>

        <div className="content">
          <StatsRow stats={stats} loading={loading} />
          {active === 'groups' && <GroupsTab groups={groups} loading={loading} refresh={refresh} />}
          {active === 'projects' && <ProjectsTab projects={projects} groups={groups} loading={loading} refresh={refresh} />}
          {active === 'bots' && <BotsTab bots={bots} projects={projects} platforms={platforms} loading={loading} refresh={refresh} />}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
