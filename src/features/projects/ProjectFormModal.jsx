import { useState, useMemo, useCallback } from 'react';
import Modal from '../../components/modals/Modal.jsx';
import Field from '../../components/forms/Field.jsx';
import CustomSelect from '../../components/forms/CustomSelect.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import * as api from '../../api/index.js';

const FORM_ID = 'project-form';

function validate(values) {
  const errors = {};
  if (!values.group_id) errors.group_id = 'Выберите группу.';
  if (!values.code.trim()) errors.code = 'Обязательное поле.';
  if (!values.name.trim()) errors.name = 'Обязательное поле.';
  return errors;
}

export default function ProjectFormModal({ project, groups, onClose, onSaved }) {
  const isEdit = Boolean(project);

  const fetchLlmProject = useCallback(
    () => (project ? api.getLlmProject(project.code).catch(() => null) : Promise.resolve(null)),
    [project],
  );

  const { data: llmProject, loading: llmLoading } = useApiQuery(fetchLlmProject);
  const llmMissing = !llmLoading && !llmProject;

  const [values, setValues] = useState({
    code: project?.code != null ? String(project.code) : '',
    name: project?.project_name ?? '',
    group_id: project?.project_group_id != null ? String(project.project_group_id) : '',
    system_prompt: null,
    fallback_message: null,
  });
  const [errors, setErrors] = useState({});

  const systemPrompt = values.system_prompt ?? llmProject?.system_prompt ?? '';
  const fallbackMessage = values.fallback_message ?? llmProject?.fallback_message ?? '';

  const { run: save, busy } = useMutation({
    mutateFn: async () => {
      const errs = validate(values);
      if (Object.keys(errs).length) { setErrors(errs); throw new Error('Проверьте поля формы.'); }

      const payload = isEdit
        ? { id: project.id, project_group_id: Number(values.group_id), code: Number(values.code.trim()),
            project_name: values.name.trim(),
            system_prompt: systemPrompt.trim() === '' ? null : systemPrompt.trim(),
            fallback_message: fallbackMessage.trim() === '' ? null : fallbackMessage.trim() }
        : { group_id: Number(values.group_id), code: Number(values.code.trim()), name: values.name.trim(),
            system_prompt: systemPrompt.trim() === '' ? null : systemPrompt.trim(),
            fallback_message: fallbackMessage.trim() === '' ? null : fallbackMessage.trim() };

      return isEdit ? api.updateProject(payload) : api.createProject(payload);
    },
    onSuccessMessage: isEdit ? 'Проект обновлён.' : 'Проект создан.',
    onAfter: () => { onSaved(); onClose(); },
  });

  const setField = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const setCustomField = (name) => (value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const groupOptions = useMemo(
    () => [
      { value: '', label: 'Выберите группу' },
      ...groups.map((g) => ({ value: String(g.id), label: g.group_name })),
    ],
    [groups],
  );

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
        <Field label="Код проекта" required error={errors.code}>
          <input className="input" type="text" placeholder="7777" value={values.code} onChange={setField('code')} disabled={busy} />
        </Field>
        <Field label="Название проекта" required error={errors.name}>
          <input className="input" type="text" placeholder="Альфа" value={values.name} onChange={setField('name')} disabled={busy} />
        </Field>
        <Field label="Группа" required error={errors.group_id}>
          <CustomSelect
            value={values.group_id}
            onChange={setCustomField('group_id')}
            options={groupOptions}
            placeholder="Выберите группу"
            disabled={busy}
          />
        </Field>
        <Field label="Системный промпт" hint="Системный промпт, задающий роль и стиль поведения модели">
          <textarea className="input" rows={3} value={systemPrompt} onChange={setField('system_prompt')} disabled={busy || llmMissing} />
          {llmMissing && <div className="field-error">Сначала создайте LLM-проект</div>}
        </Field>
        <Field label="Сообщение при переводе оператору" hint="Сообщение, которое будет показано клиенту при переводе оператору">
          <textarea className="input" rows={2} value={fallbackMessage} onChange={setField('fallback_message')} disabled={busy || llmMissing} />
          {llmMissing && <div className="field-error">Сначала создайте LLM-проект</div>}
        </Field>
      </form>
    </Modal>
  );
}
