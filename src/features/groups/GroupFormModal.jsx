import { useState } from 'react';
import Modal from '../../components/modals/Modal.jsx';
import Field from '../../components/forms/Field.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import * as api from '../../api/index.js';

const FORM_ID = 'group-form';

function validate(values) {
  const errors = {};
  if (!values.external_id.trim()) errors.external_id = 'Обязательное поле.';
  if (!values.name.trim()) errors.name = 'Обязательное поле.';
  return errors;
}

export default function GroupFormModal({ group, onClose, onSaved }) {
  const isEdit = Boolean(group);
  const [values, setValues] = useState({
    external_id: group?.external_id ?? '',
    name: group?.group_name ?? '',
  });
  const [errors, setErrors] = useState({});

  const { run: save, busy } = useMutation({
    mutateFn: async () => {
      const errs = validate(values);
      if (Object.keys(errs).length) { setErrors(errs); throw new Error('Проверьте поля формы.'); }

      const payload = isEdit
        ? { id: group.id, external_id: values.external_id.trim(), group_name: values.name.trim(),
            created_on: group.created_on ?? null, altered_on: group.altered_on ?? null }
        : { external_id: values.external_id.trim(), name: values.name.trim() };

      return isEdit ? api.updateProjectGroup(payload) : api.createProjectGroup(payload);
    },
    onSuccessMessage: isEdit ? 'Группа обновлена.' : 'Группа создана.',
    onAfter: () => { onSaved(); onClose(); },
  });

  const setField = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
  };

  return (
    <Modal
      title={isEdit ? 'Редактировать группу' : 'Добавить группу'}
      subtitle="Проектная группа объединяет связанные проекты"
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
          <input className="input" type="text" placeholder="grp-example" value={values.external_id} onChange={setField('external_id')} disabled={busy} />
        </Field>
        <Field label="Название группы" required error={errors.name}>
          <input className="input" type="text" placeholder="Например, Альфа" value={values.name} onChange={setField('name')} disabled={busy} />
        </Field>
      </form>
    </Modal>
  );
}
