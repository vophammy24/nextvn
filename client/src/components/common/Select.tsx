import type { ComponentPropsWithRef, ReactNode } from 'react';
import { FormField } from './FormField';

export type SelectProps = ComponentPropsWithRef<'select'> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
};
export function Select({ label, hint, error, className = '', ...props }: SelectProps) {
  if (label === undefined && !hint && !error)
    return <select {...props} className={`ui-input ${className}`} />;
  return (
    <FormField
      id={props.id}
      label={label}
      hint={hint}
      error={error}
      describedBy={props['aria-describedby']}
    >
      {(field) => (
        <select
          {...props}
          {...field}
          aria-invalid={field['aria-invalid'] ?? props['aria-invalid']}
          className={`ui-input ${className}`}
        />
      )}
    </FormField>
  );
}
export default Select;
