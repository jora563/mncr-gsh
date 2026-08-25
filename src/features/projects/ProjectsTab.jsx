import { useMemo, useState } from 'react';
import DataTable from '../../components/table/DataTable.jsx';
import ConfirmDialog from '../../components/modals/ConfirmDialog.jsx';
import NameCell from '../../components/table/NameCell.jsx';
import DateCell from '../../components/table/DateCell.jsx';
import TokenCell from '../../components/table/TokenCell.jsx';
import PlatformBadge from '../../components/table/PlatformBadge.jsx';
import ProjectFormModal from './ProjectFormModal.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { dateTimeToTimestamp } from '../../utils/format.js';
import { describeError } from '../../utils/errors.js';
import * as api from '../../api/index.js';
import { PencilIcon, TrashIcon, RefreshIcon, PlusIcon, ChevronRightIcon } from '../../components/icons.jsx';

export default function ProjectsTab({ projects, groups, loading, refresh }) {
  const [groupFilter, setGroupFilter] = useState('all');
  const [form, setForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const { run: removeProject, busy: deleting } = useMutation({
    mutateFn: (projectId) => api.deleteProject(projectId),
    onSuccessMessage: 'Проект удалён.',
    onAfter: () => {
      setExpanded(null);
      setDeleteTarget(null);
      refresh();
    },
  });

  const groupNameById = useMemo(() => new Map(groups.map((group) => [group.id, group.group_name])), [groups]);

  const visibleProjects = useMemo(() => {
    if (groupFilter === 'all') return projects;
    const groupId = Number(groupFilter);
    return projects.filter((project) => project.project_group_id === groupId);
  }, [projects, groupFilter]);

  const toggleProjectBots = async (project) => {
    if (expanded?.projectId === project.id) {
      setExpanded(null);
      return;
    }
    setExpanded({ projectId: project.id, loading: true });
    try {
      const bots = await api.getBotsOfProject(project.id);
      setExpanded((current) =>
        current?.projectId === project.id
          ? { projectId: project.id, loading: false, bots: Array.isArray(bots) ? bots : [] }
          : current,
      );
    } catch (error) {
      setExpanded((current) =>
        current?.projectId === project.id
          ? { projectId: project.id, loading: false, error: describeError(error) }
          : current,
      );
    }
  };

  const renderExpanded = (project) => {
    if (expanded?.projectId !== project.id) return null;
    if (expanded.loading) return <div className="expansion-note">Загружаем ботов проекта…</div>;
    if (expanded.error) return <div className="expansion-note expansion-note--error">{expanded.error}</div>;
    if (!expanded.bots.length) return <div className="expansion-note">У проекта пока нет ботов.</div>;
    return (
      <div>
        <h4>Боты проекта «{project.project_name}» — {expanded.bots.length}</h4>
        <div className="mini-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>External ID</th>
                <th>Платформа</th>
                <th>Токен</th>
                <th>Срок (ч)</th>
              </tr>
            </thead>
            <tbody>
              {expanded.bots.map((bot) => (
                <tr key={bot.account?.id ?? `${bot.account?.platform_id}-${bot.account?.external_id}`}>
                  <td className="mono">{bot.account?.id ?? '—'}</td>
                  <td><span className="chip">{bot.account?.external_id ?? '—'}</span></td>
                  <td><PlatformBadge name={bot.platform?.platform?.name} /></td>
                  <td><TokenCell value={bot.account?.token} /></td>
                  <td>{bot.account?.expiry_time_hours ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const columns = [
    { key: 'expand', label: '', width: 28, render: () => <ChevronRightIcon className="expand-toggle" width={15} height={15} /> },
    { key: 'id', label: 'ID', sortable: true, render: (row) => <span className="mono">{row.id}</span> },
    { key: 'external_id', label: 'External ID', sortable: true, render: (row) => <span className="chip">{row.external_id}</span> },
    { key: 'project_name', label: 'Название проекта', sortable: true, render: (row) => <NameCell name={row.project_name} seed={row.id} /> },
    {
      key: 'group',
      label: 'Группа',
      sortable: true,
      sortValue: (row) => groupNameById.get(row.project_group_id) ?? '',
      render: (row) => {
        const name = groupNameById.get(row.project_group_id);
        return name ? <span className="badge badge--group">{name}</span> : <span className="muted">—</span>;
      },
    },
    { key: 'created_on', label: 'Дата создания', sortable: true, sortValue: (row) => dateTimeToTimestamp(row.created_on), render: (row) => <DateCell value={row.created_on} /> },
    { key: 'altered_on', label: 'Дата изменения', sortable: true, sortValue: (row) => dateTimeToTimestamp(row.altered_on), render: (row) => <DateCell value={row.altered_on} /> },
    {
      key: 'actions',
      label: 'Действия',
      align: 'right',
      render: (row) => (
        <div className="row-actions" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="icon-btn" title="Редактировать" onClick={() => setForm({ project: row })}>
            <PencilIcon width={15} height={15} />
          </button>
          <button type="button" className="icon-btn danger" title="Удалить" onClick={() => setDeleteTarget(row)}>
            <TrashIcon width={15} height={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="card">
      <div className="card-toolbar">
        <h2>Список проектов</h2>
        <span className="count-pill">{visibleProjects.length}</span>
        <div className="toolbar-spacer" />
        <select
          className="select"
          aria-label="Фильтр по группе"
          value={groupFilter}
          onChange={(event) => setGroupFilter(event.target.value)}
        >
          <option value="all">Все группы</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>{group.group_name}</option>
          ))}
        </select>
        <button type="button" className="btn" onClick={refresh} disabled={loading}>
          <RefreshIcon width={14} height={14} />
          Обновить
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setForm({ project: null })}>
          <PlusIcon width={14} height={14} />
          Добавить проект
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={visibleProjects}
        rowKey={(row) => row.id}
        loading={loading}
        emptyText="Проекты не найдены"
        onRowClick={toggleProjectBots}
        expandedKey={expanded?.projectId}
        renderExpanded={renderExpanded}
      />

      <div className="card-footer">
        <span>Показано {visibleProjects.length} из {projects.length} записей</span>
        <span>Клик по строке — боты проекта</span>
      </div>

      {form && (
        <ProjectFormModal
          project={form.project}
          groups={groups}
          onClose={() => setForm(null)}
          onSaved={() => {
            setExpanded(null);
            refresh();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Удалить проект?"
          message={`Проект «${deleteTarget.project_name}» будет удалён. Связанные с ним боты могут потерять привязку.`}
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => removeProject(deleteTarget.id)}
        />
      )}
    </section>
  );
}
