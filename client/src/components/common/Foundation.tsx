import { useId, type ReactNode } from 'react';
import { Inbox, LoaderCircle, CircleAlert, Search } from 'lucide-react';
import type { BusinessRole } from '@/app/navigation';
import { copy, type Status } from '@/locales/vi';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
export function SectionCard({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const id = useId();
  return (
    <section className="section-card" aria-labelledby={id}>
      <header className="section-heading">
        <h2 id={id}>{title}</h2>
        {actions}
      </header>
      <div className="section-body">{children}</div>
    </section>
  );
}
export function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <SectionCard title={title}>
      <figure className="chart-container">
        {children}
        <figcaption>{description}</figcaption>
      </figure>
    </SectionCard>
  );
}
export function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <article className="stat-card">
      <div className="stat-heading">
        <span>{label}</span>
        <span aria-hidden="true">{icon}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      {detail && <p>{detail}</p>}
    </article>
  );
}
export function EmptyState({
  title = copy.common.empty,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="feedback-state">
      <Inbox aria-hidden="true" size={32} />
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function LoadingState({ label = copy.common.loading }: { label?: string }) {
  return (
    <div className="feedback-state" role="status">
      <LoaderCircle className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
export function ErrorState({
  message = copy.common.error,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="feedback-state error-state" role="alert">
      <CircleAlert aria-hidden="true" />
      <p>{message}</p>
      {onRetry && (
        <button className="button button-secondary" onClick={onRetry}>
          {copy.common.retry}
        </button>
      )}
    </div>
  );
}
const statusTones: Record<Status, string> = {
  AVAILABLE: 'success',
  OCCUPIED: 'info',
  RESERVED: 'info',
  CLEANING: 'neutral',
  NEED_PAYMENT: 'warning',
  PAID: 'success',
  CANCELLED: 'neutral',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  LOW_STOCK: 'warning',
  OUT_OF_STOCK: 'danger',
  NEAR_EXPIRY: 'warning',
  IN_STOCK: 'success',
  OPEN: 'info',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
};
export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge-${statusTones[status]}`}>{copy.statuses[status]}</span>;
}
export function RoleBadge({ role }: { role: BusinessRole }) {
  return <span className="badge badge-role">{copy.roles[role]}</span>;
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {name
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((part) => part[0])
        .join('')
        .toLocaleUpperCase('vi-VN')}
    </span>
  );
}
export function SearchInput({
  value,
  onChange,
  label = copy.common.search,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="search-field">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Search aria-hidden="true" size={18} />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? label}
      />
    </div>
  );
}
export function FilterTabs({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="filter-tabs" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={item.value === value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
