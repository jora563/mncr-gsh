import { useState } from 'react';
import Modal from '../../components/modals/Modal.jsx';
import Field from '../../components/forms/Field.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import * as api from '../../api/index.js';

const FORM_ID = 'project-form';

function validate(values) {
  const errors = {};
  if (!values.group_id) errors.group_id = 'Выберите группу.';
  if (!values.external_id.trim()) errors.external_id = 'Обязательное поле.';
  if (!values.name.trim()) errors.name = 'Обязательное поле.';
  return errors;
}

export default function ProjectFormModal({ project, groups, onClose, onSaved }) {
  const isEdit = Boolean(project);
  const [values, setValues] = useState({
    external_id: project?.external_id ?? '',
    name: project?.project_name ?? '',
    group_id: project?.project_group_id != null ? String(project.project_group_id) : '',
  });
  const [errors, setErrors] = useState({});

  const { run: save, busy } = useMutation({
    mutateFn: async () => {
      const errs = validate(values);
      if (Object.keys(errs).length) { setErrors(errs); throw new Error('Проверьте поля формы.'); }

      const payload = isEdit
        ? { id: project.id, project_group_id: Number(values.group_id), external_id: values.external_id.trim(),
            project_name: values.name.trim(), created_on: project.created_on ?? null, altered_on: project.altered_on ?? null }
        : { group_id: Number(values.group_id), external_id: values.external_id.trim(), name: values.name.trim() };

      return isEdit ? api.updateProject(payload) : api.createProject(payload);
    },
    onSuccessMessage: isEdit ? 'Проект обновлён.' : 'Проект создан.',
    onAfter: () => { onSaved(); onClose(); },
  });

  const setField = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
  };

  return (
    <Modal
      title={isEdit ? 'Редактировать проект' : 'Добавить проект'}
      subtitle="Проект привязывается к одной из существующих групп"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={busy}>{busy ? 'Сохранение…' : 'Сохранить'}</button>
        </>
      }
    >
      <form id={FORM_ID} className="form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <Field label="External ID" required error={errors.external_id}>
          <input className="input" type="text" placeholder="proj-example" value={values.external_id} onChange={setField('external_id')} disabled={busy} />
        </Field>
        <Field label="Название проекта" required error={errors.name}>
          <input className="input" type="text" placeholder="Например, Омега" value={values.name} onChange={setField('name')} disabled={busy} />
        </Field>
        <Field label="Группа" required error={errors.group_id}>
          <select className="select" value={values.group_id} onChange={setField('group_id')} disabled={busy}>
            <option value="">Выберите группу</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.group_name}</option>)}
          </select>
        </Field>
      </form>
    </Modal>
  );
}
