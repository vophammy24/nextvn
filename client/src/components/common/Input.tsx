import type { ComponentPropsWithRef, ReactNode } from 'react';
import { FormField } from './FormField';

export type InputProps = ComponentPropsWithRef<'input'> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};
export function Input({ label, hint, error, className = '', ...props }: InputProps) {
  const control = <input {...props} className={`ui-input ${className}`} />;
  if (label === undefined && !hint && !error) return control;
  return (
    <FormField
      id={props.id}
      label={label}
      hint={hint}
      error={error}
      describedBy={props['aria-describedby']}
    >
      {(field) => (
        <input
          {...props}
          {...field}
          aria-invalid={field['aria-invalid'] ?? props['aria-invalid']}
          className={`ui-input ${className}`}
        />
      )}
    </FormField>
  );
}
export default Input;
