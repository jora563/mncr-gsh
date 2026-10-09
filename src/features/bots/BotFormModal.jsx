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
  const projectId = Number(values.project_id);
  if (values.project_id.trim() === '' || !Number.isInteger(projectId) || projectId <= 0) {
    errors.project_id = 'Выберите проект.';
  }
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
    project_id: bot?.project?.id != null ? String(bot.project.id) : '',
    platform_id: account?.platform_id != null ? String(account.platform_id) : '',
    external_id: account?.external_id ?? '',
    token: normalizeToken(account?.token ?? ''),
    expiry_h: account?.expiry_time_hours != null ? String(account.expiry_time_hours) : '',
  });
  const [errors, setErrors] = useState({});

  /**
   * Доступные платформы: для выбранного проекта — из его `platforms`,
   * иначе пустой список (поле платформы заблокировано до выбора проекта).
   */
  const selectedProject = useMemo(
    () => projects.find((p) => String(p.id) === values.project_id) ?? null,
    [projects, values.project_id],
  );

  const availablePlatforms = useMemo(() => {
    if (!selectedProject) return [];
    const ids = new Set(selectedProject.platforms || []);
    return platforms.filter((item) => ids.has(item.platform.id));
  }, [platforms, selectedProject]);

  const projectChosen = values.project_id.trim() !== '';
  const noPlatforms = projectChosen && availablePlatforms.length === 0;

  const projectOptions = useMemo(
    () => [
      { value: '', label: 'Выберите проект' },
      ...projects.map((p) => ({ value: String(p.id), label: p.project_name })),
    ],
    [projects],
  );

  const platformOptions = useMemo(
    () => [
      { value: '', label: 'Выберите платформу' },
      ...availablePlatforms.map((p) => ({ value: String(p.platform.id), label: p.platform.name })),
    ],
    [availablePlatforms],
  );

  const platformChosen = values.platform_id.trim() !== '';
  const canSave = projectChosen && platformChosen;

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

  /**
   * При смене проекта сбрасываем выбранную платформу, если она недоступна
   * для нового проекта (то есть не входит в его `platforms`).
   */
  const setProjectField = (value) => {
    setValues((v) => {
      const newProject = projects.find((p) => String(p.id) === value) ?? null;
      const allowedPlatformIds = new Set(newProject?.platforms || []);
      const keepPlatform = v.platform_id && allowedPlatformIds.has(Number(v.platform_id));
      return {
        ...v,
        project_id: value,
        platform_id: keepPlatform ? v.platform_id : '',
      };
    });
    setErrors((err) => ({ ...err, project_id: undefined }));
  };

  const setPlatformField = (value) => {
    setValues((v) => ({ ...v, platform_id: value }));
    setErrors((err) => ({ ...err, platform_id: undefined }));
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
          <button
            type="submit"
            form={FORM_ID}
            className="btn btn-primary"
            disabled={busy || !canSave}
          >
            {busy ? 'Сохранение…' : 'Сохранить'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="form" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <Field label="Проект" required error={errors.project_id}>
          <CustomSelect
            value={values.project_id}
            onChange={setProjectField}
            options={projectOptions}
            placeholder="Выберите проект"
            disabled={busy}
          />
        </Field>
        <Field label="Платформа" required error={errors.platform_id}>
          <CustomSelect
            value={values.platform_id}
            onChange={setPlatformField}
            options={platformOptions}
            placeholder={
              !projectChosen
                ? 'Сначала выберите проект'
                : noPlatforms
                  ? 'Нет доступных платформ'
                  : 'Выберите платформу'
            }
            disabled={busy || !projectChosen || noPlatforms}
          />
          {!projectChosen && <div className="field-error">Сначала выберите проект</div>}
          {noPlatforms && <div className="field-error">Для этого проекта нет доступных платформ</div>}
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
