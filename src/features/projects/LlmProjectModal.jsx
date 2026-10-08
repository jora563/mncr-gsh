import { useState, useCallback, useRef, useEffect, Fragment } from 'react';
import Modal from '../../components/modals/Modal.jsx';
import ConfirmDialog from '../../components/modals/ConfirmDialog.jsx';
import Field from '../../components/forms/Field.jsx';
import { useMutation } from '../../hooks/useMutation.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import * as api from '../../api/index.js';
import { TrashIcon, PlusIcon } from '../../components/icons.jsx';
import { formatDateParts } from '../../utils/format.js';

function FileUploadField({ label, hint, accept, fileName, busy, onSelect }) {
  const inputRef = useRef(null);

  return (
    <Field label={label} hint={hint}>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={busy}>
          Выбрать файл
        </button>
        <span className="muted">{fileName || 'Файл не выбран'}</span>
        <input ref={inputRef} type="file" accept={accept} onChange={onSelect} disabled={busy} hidden />
      </div>
    </Field>
  );
}

export default function LlmProjectModal({ project, onClose }) {
  const [activeTab, setActiveTab] = useState('info');
  const [expandedJob, setExpandedJob] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState({ knowledge: '', dataset: '', questions: '' });
  const [deleteLlmTarget, setDeleteLlmTarget] = useState(null);
  const logsRef = useRef(null);
  const trainingJobsRef = useRef(null);

  const fetchProject = useCallback(
    () => api.getLlmProject(project.code).catch(() => null),
    [project.code]
  );

  const fetchJobs = useCallback(async () => {
    const jobs = await api.getLlmTrainingJobsByProject(project.code).catch(() => []);
    const list = Array.isArray(jobs) ? jobs : [];
    const details = await Promise.allSettled(list.map((job) => api.getLlmTrainingJob(job.job_id)));
    return list.map((job, index) =>
      details[index].status === 'fulfilled' ? { ...job, ...details[index].value } : job,
    );
  }, [project.code]);

  const { data: llmProject, loading: loadingProject, silentRefetch: silentRefetchProject } = useApiQuery(fetchProject);
  const { data: trainingJobs, loading: loadingJobs, silentRefetch: silentRefetchJobs } = useApiQuery(fetchJobs);

  const loading = loadingProject || loadingJobs;
  const hasActiveJob = Array.isArray(trainingJobs) && trainingJobs.some((job) => job.status === 'pending' || job.status === 'running');

  // Храним актуальные данные для доступа внутри интервала
  useEffect(() => {
    trainingJobsRef.current = trainingJobs;
  }, [trainingJobs]);

  const { run: uploadKnowledge, busy: uploadingKnowledge } = useMutation({
    mutateFn: async (formData) => api.uploadLlmKnowledge(formData),
    onSuccessMessage: 'База знаний загружена.',
    onAfter: () => silentRefetchProject(),
  });

  const { run: uploadDataset, busy: uploadingDataset } = useMutation({
    mutateFn: async (formData) => api.uploadLlmDataset(formData),
    onSuccessMessage: 'Датасет загружен.',
    onAfter: () => silentRefetchProject(),
  });

  const { run: uploadQuestions, busy: uploadingQuestions } = useMutation({
    mutateFn: async (formData) => api.uploadLlmQuestions(formData),
    onSuccessMessage: 'Вопросы загружены.',
    onAfter: () => silentRefetchProject(),
  });

  const { run: startTraining, busy: training } = useMutation({
    mutateFn: async () => api.startLlmTraining({ project_id: project.code }),
    onSuccessMessage: 'Обучение запущено.',
    onAfter: () => {
      silentRefetchProject();
      silentRefetchJobs();
    },
  });

  const { run: reloadProject, busy: reloading } = useMutation({
    mutateFn: async () => api.reloadLlmProject({ project_id: project.code }),
    onSuccessMessage: 'Проект перезапущен.',
    onAfter: () => {
      silentRefetchProject();
      silentRefetchJobs();
    },
  });

  const { run: resumeJob, busy: resuming } = useMutation({
    mutateFn: (jobId) => api.resumeLlmTraining(jobId),
    onSuccessMessage: 'Обучение продолжено.',
    onAfter: () => silentRefetchJobs(),
  });

  const { run: createProjectInLlm, busy: creating } = useMutation({
    mutateFn: async () => api.createLlmProject({ project_id: project.code, name: project.project_name }),
    onSuccessMessage: 'Проект создан в LLM.',
    onAfter: () => {
      silentRefetchProject();
      silentRefetchJobs();
    },
  });

  const { run: deleteProjectFromLlm, busy: deletingLlm } = useMutation({
    mutateFn: async () => api.deleteLlmProject(project.code),
    onSuccessMessage: 'Проект удалён из LLM.',
    onAfter: () => {
      setDeleteLlmTarget(null);
      silentRefetchProject();
      silentRefetchJobs();
    },
  });

  const handleFileUpload = (e, key, uploadFn) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', project.code);
    setUploadedFiles((current) => ({ ...current, [key]: file.name }));
    uploadFn(formData);
  };

  const toggleJobLogs = (jobId) => {
    setExpandedJob((current) => (current === jobId ? null : jobId));
  };

  const formatLlmDate = (value) => {
    const parts = formatDateParts(value);
    return parts ? `${parts.date} ${parts.time}` : '—';
  };

  const isProjectCreated = Boolean(llmProject);
  const dataTabsDisabled = !loading && !isProjectCreated;

  const handleTabClick = (tabId) => {
    if (dataTabsDisabled && (tabId === 'data' || tabId === 'training')) {
      return;
    }
    setActiveTab(tabId);
  };

  const effectiveActiveTab =
    dataTabsDisabled && (activeTab === 'data' || activeTab === 'training')
      ? 'info'
      : activeTab;

  // Автопрокрутка логов в конец
  const scrollToBottom = useCallback(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, []);

  // Автоматическое обновление логов
  // Останавливается если джоб не в активном состоянии (не pending/running)
  useEffect(() => {
    if (!expandedJob) {
      return;
    }

    const refreshInterval = parseInt(import.meta.env.VITE_LLM_LOGS_REFRESH_INTERVAL, 10) || 5000;
    let intervalId = null;

    const refreshLogs = async () => {
      try {
        // Проверяем актуальный статус джоба из ref
        const jobs = trainingJobsRef.current;
        const currentJob = Array.isArray(jobs)
          ? jobs.find((job) => job.job_id === expandedJob)
          : null;

        // Если джоб не найден или не в активном состоянии - останавливаем обновление
        if (!currentJob || (currentJob.status !== 'pending' && currentJob.status !== 'running')) {
          if (intervalId !== null) {
            clearInterval(intervalId);
          }
          return;
        }

        await silentRefetchJobs();
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Error refreshing job logs:', error);
      }
    };

    intervalId = setInterval(refreshLogs, refreshInterval);

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [expandedJob, silentRefetchJobs, scrollToBottom]);

  // Прокрутка при первом раскрытии логов
  useEffect(() => {
    if (expandedJob) {
      setTimeout(scrollToBottom, 200);
    }
  }, [expandedJob, scrollToBottom]);

  return (
    <>
      <Modal
        title={`LLM: ${project.project_name}`}
        subtitle="Управление моделью и данными для обучения"
        onClose={onClose}
        maxWidth={700}
      >
        <div className="tabs">
          <button
            className={`tab ${effectiveActiveTab === 'info' ? 'active' : ''}`}
            onClick={() => handleTabClick('info')}
          >
            Информация
          </button>
          <button
            className={`tab ${effectiveActiveTab === 'data' ? 'active' : ''}`}
            onClick={() => handleTabClick('data')}
            disabled={dataTabsDisabled}
          >
            Загрузка данных
          </button>
          <button
            className={`tab ${effectiveActiveTab === 'training' ? 'active' : ''}`}
            onClick={() => handleTabClick('training')}
            disabled={dataTabsDisabled}
          >
            Обучение
          </button>
        </div>

        {loading && <div className="loading">Загрузка...</div>}

        {!loading && (
          <>
            {effectiveActiveTab === 'info' && (
              <div className="tab-content">
                {llmProject ? (
                  <table className="mini-table">
                    <tbody>
                      <tr>
                        <td style={{ width: '140px', fontWeight: 600 }}>ID проекта</td>
                        <td className="mono">{llmProject.project_id}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Название</td>
                        <td>{llmProject.name}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Создан</td>
                        <td>{formatLlmDate(llmProject.created_at)}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Обновлён</td>
                        <td>{formatLlmDate(llmProject.updated_at)}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    Проект ещё не создан в LLM.
                  </div>
                )}

                <div className="actions" style={{ justifyContent: 'space-between' }}>
                  {llmProject ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={reloadProject}
                        disabled={reloading}
                      >
                        {reloading ? 'Перезапуск...' : 'Перезапустить проект'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setDeleteLlmTarget(project)}
                        disabled={deletingLlm}
                      >
                        <TrashIcon width={14} height={14} />
                        Удалить проект
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={createProjectInLlm}
                      disabled={creating}
                    >
                      <PlusIcon width={14} height={14} />
                      {creating ? 'Создание...' : 'Добавить проект в LLM'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {effectiveActiveTab === 'data' && (
              <div className="tab-content">
                <FileUploadField
                  label="База знаний (CSV)"
                  hint="Вопросы и ответы в формате CSV"
                  accept=".csv"
                  fileName={uploadedFiles.knowledge}
                  busy={uploadingKnowledge || hasActiveJob}
                  onSelect={(e) => handleFileUpload(e, 'knowledge', uploadKnowledge)}
                />
                <FileUploadField
                  label="Датасет (JSONL)"
                  hint="Данные в формате JSONL"
                  accept=".jsonl,.json"
                  fileName={uploadedFiles.dataset}
                  busy={uploadingDataset || hasActiveJob}
                  onSelect={(e) => handleFileUpload(e, 'dataset', uploadDataset)}
                />
                <FileUploadField
                  label="Типичные вопросы (TXT)"
                  hint="Каждый вопрос на новой строке"
                  accept=".txt"
                  fileName={uploadedFiles.questions}
                  busy={uploadingQuestions || hasActiveJob}
                  onSelect={(e) => handleFileUpload(e, 'questions', uploadQuestions)}
                />
              </div>
            )}

            {effectiveActiveTab === 'training' && (
              <div className="tab-content">
                {Array.isArray(trainingJobs) && trainingJobs.length > 0 ? (
                  <div className="training-jobs">
                    <h4>Задания обучения</h4>
                    <table className="mini-table">
                      <thead>
                        <tr>
                          <th>UUID</th>
                          <th>Статус</th>
                          <th>Прогресс</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trainingJobs.map((job) => (
                          <Fragment key={job.job_id}>
                            <tr className="expandable" onClick={() => toggleJobLogs(job.job_id)}>
                              <td className="mono">{job.job_id}</td>
                              <td>{job.status}</td>
                              <td>{job.progress != null ? `${Math.round(job.progress * 100)}%` : '—'}</td>
                              <td>
                                {job.status === 'interrupted' ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={(event) => { event.stopPropagation(); resumeJob(job.job_id); }}
                                    disabled={resuming}
                                  >
                                    Продолжить
                                  </button>
                                ) : (
                                  <span className="muted">—</span>
                                )}
                              </td>
                            </tr>
                            {expandedJob === job.job_id && (
                              <tr className="expansion-row">
                                <td colSpan={4}>
                                  <div className="expansion-inner">
                                    <h4>Логи обучения</h4>
                                    <pre ref={logsRef} className="job-logs">{job.logs || 'Логов пока нет.'}</pre>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">Заданий обучения пока нет.</div>
                )}

                <div className="actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={startTraining}
                    disabled={training || hasActiveJob || uploadingDataset || (!llmProject?.dataset_path && !uploadedFiles.dataset)}
                  >
                    {training ? 'Запуск обучения...' : 'Начать обучение'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      {deleteLlmTarget && (
        <ConfirmDialog
          title="Удалить проект из LLM?"
          message={`Проект «${deleteLlmTarget.project_name}» будет удалён из базы LLM.`}
          busy={deletingLlm}
          onCancel={() => setDeleteLlmTarget(null)}
          onConfirm={() => deleteProjectFromLlm()}
        />
      )}
    </>
  );
}
