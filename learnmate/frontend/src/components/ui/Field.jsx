import { useId } from "react";
import { LuCircleAlert } from "react-icons/lu";

function Wrapper({ id, label, error, hint, required, children }) {
  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}
          {required && <span className="req" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="field__hint" id={`${id}-hint`}>{hint}</span>}
      {error && (
        <span className="field__error" id={`${id}-error`} role="alert">
          <LuCircleAlert size={14} aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}

const aria = (id, error, hint) => ({
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
});

export function Input({ label, error, hint, required, id, action, icon: Icon, ...props }) {
  const auto = useId();
  const inputId = id || auto;
  const control = <input id={inputId} className="control" required={required} {...aria(inputId, error, hint)} {...props} />;
  return (
    <Wrapper id={inputId} label={label} error={error} hint={hint} required={required}>
      {Icon || action ? (
        <div className={`input-wrap ${action ? "input-wrap--action" : ""}`}>
          {Icon && <Icon size={16} aria-hidden="true" />}
          {control}
          {action && <span className="input-wrap__action">{action}</span>}
        </div>
      ) : control}
    </Wrapper>
  );
}

export function Select({ label, error, hint, required, id, children, ...props }) {
  const auto = useId();
  const selectId = id || auto;
  return (
    <Wrapper id={selectId} label={label} error={error} hint={hint} required={required}>
      <select id={selectId} className="control" required={required} {...aria(selectId, error, hint)} {...props}>{children}</select>
    </Wrapper>
  );
}

export function Textarea({ label, error, hint, required, id, ...props }) {
  const auto = useId();
  const areaId = id || auto;
  return (
    <Wrapper id={areaId} label={label} error={error} hint={hint} required={required}>
      <textarea id={areaId} className="control" required={required} {...aria(areaId, error, hint)} {...props} />
    </Wrapper>
  );
}

export function SearchInput({ label = "Search", ...props }) {
  return (
    <input type="search" className="control" aria-label={label} {...props} style={{ paddingLeft: 38, ...props.style }} />
  );
}
