import type { ComponentPropsWithoutRef } from 'react';
export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'role';
export function Badge({
  tone = 'neutral',
  className = '',
  ...props
}: ComponentPropsWithoutRef<'span'> & { tone?: BadgeTone }) {
  return <span {...props} className={`badge ui-badge badge-${tone} ${className}`} />;
}
export default Badge;
