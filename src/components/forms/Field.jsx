export default function Field({ label, required = false, error, hint, children }) {
  return (
    <div className={`field ${error ? 'field--invalid' : ''}`}>
      <label>
        {label}
        {required ? <em>*</em> : null}
      </label>
      {children}
      {error ? <div className="field-error">{error}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}
