import { useId, type ReactNode } from 'react';

export interface FieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}
export interface FormFieldProps {
  id?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  describedBy?: string;
  children: (props: FieldControlProps) => ReactNode;
}

export function FormField({ id, label, hint, error, describedBy, children }: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const description =
    [describedBy, hint ? `${controlId}-hint` : '', error ? `${controlId}-error` : '']
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div className="ui-field">
      {label !== undefined && <label htmlFor={controlId}>{label}</label>}
      {children({
        id: controlId,
        'aria-describedby': description,
        'aria-invalid': error ? true : undefined,
      })}
      {hint && (
        <div className="ui-field-hint" id={`${controlId}-hint`}>
          {hint}
        </div>
      )}
      {error && (
        <div className="ui-field-error" id={`${controlId}-error`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
