import { useState, useMemo } from 'react';
import Modal from '../../components/modals/Modal.jsx';
import Field from '../../components/forms/Field.jsx';
import CustomSelect from '../../components/forms/CustomSelect.jsx';
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
  const projectId = Number(values.project_id);
  if (values.project_id.trim() === '' || !Number.isInteger(projectId) || projectId <= 0) {
    errors.project_id = 'Выберите проект.';
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

      const expiry = values.expiry_h.trim() === '' ? null : Number(values.expiry_h);
      const common = {
        platform_id: Number(values.platform_id),
        project_id: Number(values.project_id),
        external_id: values.external_id.trim(),
        token: Array.from(new TextEncoder().encode(values.token.trim())),
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

  const setCustomField = (name) => (value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const platformOptions = useMemo(
    () => [
      { value: '', label: 'Выберите платформу' },
      ...platforms.map((p) => ({ value: String(p.platform.id), label: p.platform.name })),
    ],
    [platforms],
  );

  const projectOptions = useMemo(
    () => [
      { value: '', label: 'Выберите проект' },
      ...projects.map((p) => ({ value: String(p.id), label: p.project_name })),
    ],
    [projects],
  );

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
          <CustomSelect
            value={values.platform_id}
            onChange={setCustomField('platform_id')}
            options={platformOptions}
            placeholder="Выберите платформу"
            disabled={busy}
          />
        </Field>
        <Field label="Проект" required error={errors.project_id}>
          <CustomSelect
            value={values.project_id}
            onChange={setCustomField('project_id')}
            options={projectOptions}
            placeholder="Выберите проект"
            disabled={busy}
          />
        </Field>
        <div className="field-row">
          <Field label="Внешний ID" required error={errors.external_id}>
            <input className="input" type="text" placeholder="1234567890" value={values.external_id} onChange={setField('external_id')} disabled={busy} />
          </Field>
          <Field label="Срок действия (часы)" error={errors.expiry_h} hint="Необязательное поле">
            <input className="input" type="number" min="0" step="1" placeholder="720" value={values.expiry_h} onChange={setField('expiry_h')} disabled={busy} />
          </Field>
        </div>
        <Field label="Токен" required error={errors.token}>
          <input className="input" type="password" placeholder="Токен доступа бота" value={values.token} onChange={setField('token')} disabled={busy} />
        </Field>
      </form>
    </Modal>
  );
}
