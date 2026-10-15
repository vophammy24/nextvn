import { useState, type ComponentPropsWithRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FormField } from '@/components/common/FormField';

type PasswordFieldProps = Omit<ComponentPropsWithRef<'input'>, 'type'> & {
  label: string;
  hint?: string;
};

export function PasswordField({ label, hint, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField id={props.id} label={label} hint={hint} describedBy={props['aria-describedby']}>
      {(field) => (
        <div className="auth-password-control">
          <input {...props} {...field} type={visible ? 'text' : 'password'} className="ui-input" />
          <button
            type="button"
            className="auth-password-toggle"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? (
              <EyeOff size={19} aria-hidden="true" />
            ) : (
              <Eye size={19} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </FormField>
  );
}
