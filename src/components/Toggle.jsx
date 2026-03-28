import './Toggle.css';

export default function Toggle({ checked, onChange, label, id, disabled }) {
  const toggleId = id ?? label.replace(/\s+/g, '-').toLowerCase();

  return (
    <div className={`toggle-row ${disabled ? 'toggle-row--disabled' : ''}`}>
      <span className="toggle-row__label" id={`${toggleId}-label`}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${toggleId}-label`}
        disabled={disabled}
        id={toggleId}
        className={`toggle ${checked ? 'toggle--on' : ''} ${disabled ? 'toggle--disabled' : ''}`}
        onClick={() => {
          if (!disabled) onChange(!checked);
        }}
      >
        <span className="toggle__thumb" />
      </button>
    </div>
  );
}
