import type { ComponentPropsWithRef } from 'react';
import { LoaderCircle } from 'lucide-react';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'default' | 'small' | 'large';
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled,
  type = 'button',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`ui-button ui-button-${variant} ui-button-${size} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || props['aria-busy']}
    >
      {loading && <LoaderCircle size={18} className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
export default Button;
