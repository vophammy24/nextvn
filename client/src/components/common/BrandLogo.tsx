/** Interim text lockup. The supplied PDF artwork contains the former brand name. */
export function BrandLogo({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <span className={`brand-logo brand-logo-${tone}`}>
      NextVN
      <span className="brand-logo-accent" aria-hidden="true" />
    </span>
  );
}
