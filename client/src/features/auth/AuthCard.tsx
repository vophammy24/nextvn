import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Link } from 'react-router-dom';
import './auth.css';

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="auth-page">
      <div className="auth-container">
        <Link className="auth-brand" to="/" aria-label="NextVN — Trang chủ">
          <BrandLogo />
        </Link>
        <section className="auth-card" aria-labelledby="auth-title">
          <header className="auth-heading">
            <h1 id="auth-title">{title}</h1>
            <p>Quản lý vận hành F&B trong một nền tảng</p>
          </header>
          {children}
        </section>
        <p className="auth-footer">Bán hàng · Công thức · Tồn kho · Phân tích</p>
      </div>
    </main>
  );
}
