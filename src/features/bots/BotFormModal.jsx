import { useState } from 'react';
import Modal from '../../components/modals/Modal.jsx';
import Field from '../../components/forms/Field.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { normalizeToken } from '../../utils/format.js';
import * as api from '../../api/index.js';

const FORM_ID = 'bot-form';

function validate(values) {
  const errors = {};
  const platformId = Number(values.platform_id);
  if (values.platform_id.trim() === '' || !Number.isInteger(platformId) || platformId <= 0) {
    errors.platform_id = 'Выберите платформу.';
  }
  if (!values.external_id.trim()) errors.external_id = 'Обязательное поле.';
  if (!values.token.trim()) errors.token = 'Укажите токен.';
  if (values.expiry_h.trim() !== '') {
    const hours = Number(values.expiry_h);
    if (!Number.isInteger(hours) || hours < 0) errors.expiry_h = 'Укажите неотрицательное целое число или оставьте поле пустым.';
  }
  return errors;
}

export default function BotFormModal({ bot, projects, platforms, onClose, onSaved }) {
  const isEdit = Boolean(bot);
  const account = bot?.account ?? null;
  const [values, setValues] = useState({
    platform_id: account?.platform_id != null ? String(account.platform_id) : '',
    external_id: account?.external_id ?? '',
    token: normalizeToken(account?.token ?? ''),
    expiry_h: account?.expiry_time_hours != null ? String(account.expiry_time_hours) : '',
    project_id: bot?.project?.id != null ? String(bot.project.id) : '',
  });
  const [errors, setErrors] = useState({});

  const { run: save, busy } = useMutation({
    mutateFn: async () => {
      const errs = validate(values);
      if (Object.keys(errs).length) { setErrors(errs); throw new Error('Проверьте поля формы.'); }

      // ВАЖНО: project_id в теле НЕ отправляем — бэкенд с deny_unknown_fields отклонит запрос.
      // Привязка к проекту определяется через platform/external_id на стороне бэкенда.
      const expiry = values.expiry_h.trim() === '' ? null : Number(values.expiry_h);
      const common = {
        platform_id: Number(values.platform_id),
        external_id: values.external_id.trim(),
        token: values.token.trim(),
      };

      const payload = isEdit
        ? { id: account.id, ...common, expiry_time_hours: expiry }
        : { ...common, expiry_h: expiry };

      return isEdit ? api.updateBotAccount(payload) : api.createBotAccount(payload);
    },
    onSuccessMessage: isEdit ? 'Учётная запись бота обновлена.' : 'Учётная запись бота создана.',
    onAfter: () => { onSaved(); onClose(); },
  });

  const setField = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
  };

  return (
    <Modal
      title={isEdit ? 'Редактировать бота' : 'Добавить бота'}
      subtitle="Учётная запись бота для подключения к платформе"
      onClose={onClose}
      maxWidth={500}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button type="submit" form={FORM_ID} className="btn btn-primary" disabled={busy}>{busy ? 'Сохранение…' : 'Сохранить'}</button>
        </>
      }
    >
      <form id={FORM_ID} className="form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <Field label="Платформа" required error={errors.platform_id}>
          <select className="select" value={values.platform_id} onChange={setField('platform_id')} disabled={busy}>
            <option value="">Выберите платформу</option>
            {platforms.map((p) => (
              <option key={p.platform.id} value={p.platform.id}>{p.platform.name}</option>
            ))}
          </select>
        </Field>
        <div className="field-row">
          <Field label="External ID" required error={errors.external_id}>
            <input className="input" type="text" placeholder="bot_example" value={values.external_id} onChange={setField('external_id')} disabled={busy} />
          </Field>
          <Field label="Срок действия (часы)" error={errors.expiry_h} hint="Необязательное поле">
            <input className="input" type="number" min="0" step="1" placeholder="720" value={values.expiry_h} onChange={setField('expiry_h')} disabled={busy} />
          </Field>
        </div>
        <Field label="Токен" required error={errors.token}>
          <input className="input" type="password" placeholder="Токен доступа бота" value={values.token} onChange={setField('token')} disabled={busy} />
        </Field>
        <Field label="Проект (только для справки)" hint="Привязка бота к проекту определяется на стороне бэкенда">
          <select className="select" value={values.project_id} onChange={setField('project_id')} disabled>
            <option value="">Выберите проект</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
        </Field>
      </form>
    </Modal>
  );
}
