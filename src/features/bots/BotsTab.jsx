import { useMemo, useState } from 'react';
import DataTable from '../../components/table/DataTable.jsx';
import ConfirmDialog from '../../components/modals/ConfirmDialog.jsx';
import TokenCell from '../../components/table/TokenCell.jsx';
import PlatformBadge from '../../components/table/PlatformBadge.jsx';
import BotFormModal from './BotFormModal.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import * as api from '../../api/index.js';
import { PencilIcon, TrashIcon, RefreshIcon, PlusIcon } from '../../components/icons.jsx';

export default function BotsTab({ bots, projects, platforms, loading, refresh }) {
  const [projectFilter, setProjectFilter] = useState('all');
  const [form, setForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { run: removeBot, busy: deleting } = useMutation({
    mutateFn: (botId) => api.deleteBotAccount(botId),
    onSuccessMessage: 'Бот удалён.',
    onAfter: () => {
      setDeleteTarget(null);
      refresh();
    },
  });

  const visibleBots = useMemo(() => {
    if (projectFilter === 'all') return bots;
    const projectId = Number(projectFilter);
    return bots.filter((bot) => bot.project?.id === projectId);
  }, [bots, projectFilter]);

  const columns = [
    { key: 'id', label: 'ID бота', sortable: true, sortValue: (row) => row.account?.id, render: (row) => <span className="mono">{row.account?.id ?? '—'}</span> },
    { key: 'platform_id', label: 'Platform ID', sortable: true, sortValue: (row) => row.account?.platform_id, render: (row) => <span className="mono">{row.account?.platform_id ?? '—'}</span> },
    { key: 'external_id', label: 'External ID', sortable: true, sortValue: (row) => row.account?.external_id ?? '', render: (row) => <span className="chip">{row.account?.external_id ?? '—'}</span> },
    { key: 'token', label: 'Токен', render: (row) => <TokenCell value={row.account?.token} /> },
    {
      key: 'expiry',
      label: 'Срок (ч)',
      sortable: true,
      sortValue: (row) => row.account?.expiry_time_hours,
      render: (row) => (row.account?.expiry_time_hours != null ? row.account.expiry_time_hours : <span className="muted">—</span>),
    },
    {
      key: 'project',
      label: 'Проект',
      sortable: true,
      sortValue: (row) => row.project?.project_name ?? '',
      render: (row) => row.project?.project_name ?? <span className="muted">—</span>,
    },
    {
      key: 'platform',
      label: 'Платформа',
      sortable: true,
      sortValue: (row) => row.platform?.platform?.name ?? '',
      render: (row) => <PlatformBadge name={row.platform?.platform?.name} />,
    },
    {
      key: 'actions',
      label: 'Действия',
      align: 'right',
      render: (row) => (
        <div className="row-actions">
          <button type="button" className="icon-btn" title="Редактировать" onClick={() => setForm({ bot: row })}>
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
        <h2>Список ботов</h2>
        <span className="count-pill">{visibleBots.length}</span>
        <div className="toolbar-spacer" />
        <select
          className="select"
          aria-label="Фильтр по проекту"
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
        >
          <option value="all">Все проекты</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.project_name}</option>
          ))}
        </select>
        <button type="button" className="btn" onClick={refresh} disabled={loading}>
          <RefreshIcon width={14} height={14} />
          Обновить
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setForm({ bot: null })}>
          <PlusIcon width={14} height={14} />
          Добавить бота
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={visibleBots}
        rowKey={(row) => row.account?.id ?? `${row.account?.platform_id}-${row.account?.external_id}`}
        loading={loading}
        emptyText="Боты не найдены"
      />

      <div className="card-footer">
        <span>Показано {visibleBots.length} из {bots.length} записей</span>
        <span>Клик по иконке глаза — показать токен</span>
      </div>

      {form && (
        <BotFormModal
          bot={form.bot}
          projects={projects}
          platforms={platforms}
          onClose={() => setForm(null)}
          onSaved={refresh}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Удалить бота?"
          message={`Учётная запись бота «${deleteTarget.account?.external_id ?? deleteTarget.account?.id}» будет удалена.`}
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => removeBot(deleteTarget.account.id)}
        />
      )}
    </section>
  );
}
