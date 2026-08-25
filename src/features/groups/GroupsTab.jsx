import { useState } from 'react';
import DataTable from '../../components/table/DataTable.jsx';
import ConfirmDialog from '../../components/modals/ConfirmDialog.jsx';
import NameCell from '../../components/table/NameCell.jsx';
import DateCell from '../../components/table/DateCell.jsx';
import GroupFormModal from './GroupFormModal.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { dateTimeToTimestamp } from '../../utils/format.js';
import * as api from '../../api/index.js';
import { PencilIcon, TrashIcon, RefreshIcon, PlusIcon } from '../../components/icons.jsx';

export default function GroupsTab({ groups, loading, refresh }) {
  const [form, setForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { run: removeGroup, busy: deleting } = useMutation({
    mutateFn: (groupId) => api.deleteProjectGroup(groupId),
    onSuccessMessage: 'Группа удалена.',
    onAfter: () => {
      setDeleteTarget(null);
      refresh();
    },
  });

  const columns = [
    { key: 'id', label: 'ID', sortable: true, render: (row) => <span className="mono">{row.id}</span> },
    { key: 'external_id', label: 'External ID', sortable: true, render: (row) => <span className="chip">{row.external_id}</span> },
    { key: 'group_name', label: 'Название группы', sortable: true, render: (row) => <NameCell name={row.group_name} seed={row.id} /> },
    { key: 'created_on', label: 'Дата создания', sortable: true, sortValue: (row) => dateTimeToTimestamp(row.created_on), render: (row) => <DateCell value={row.created_on} /> },
    { key: 'altered_on', label: 'Дата изменения', sortable: true, sortValue: (row) => dateTimeToTimestamp(row.altered_on), render: (row) => <DateCell value={row.altered_on} /> },
    {
      key: 'actions',
      label: 'Действия',
      align: 'right',
      render: (row) => (
        <div className="row-actions">
          <button type="button" className="icon-btn" title="Редактировать" onClick={() => setForm({ group: row })}>
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
        <h2>Список групп</h2>
        <span className="count-pill">{groups.length}</span>
        <div className="toolbar-spacer" />
        <button type="button" className="btn" onClick={refresh} disabled={loading}>
          <RefreshIcon width={14} height={14} />
          Обновить
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setForm({ group: null })}>
          <PlusIcon width={14} height={14} />
          Добавить группу
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={groups}
        rowKey={(row) => row.id}
        loading={loading}
        emptyText="Группы проектов не найдены"
      />

      <div className="card-footer">
        <span>Показано {groups.length} из {groups.length} записей</span>
        <span>Сортировка — клик по заголовку столбца</span>
      </div>

      {form && <GroupFormModal group={form.group} onClose={() => setForm(null)} onSaved={refresh} />}

      {deleteTarget && (
        <ConfirmDialog
          title="Удалить группу?"
          message={`Группа «${deleteTarget.group_name}» будет удалена. Если бэкенд выполняет каскадное удаление, все проекты этой группы также будут удалены.`}
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => removeGroup(deleteTarget.id)}
        />
      )}
    </section>
  );
}
