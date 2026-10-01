import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShoppingBag, CookingPot, Warehouse, Layers3 } from 'lucide-react';
import '../auth.css';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <a className="skip-link" href="#auth-content">
        Đến nội dung đăng nhập
      </a>
      <aside className="auth-brand-panel" aria-label="Giới thiệu nextvn">
        <Link className="auth-logo" to="/" aria-label="nextvn — Trang chủ">
          nextvn<span>.</span>
        </Link>
        <div className="auth-brand-content">
          <span className="auth-eyebrow">MỘT HỆ THỐNG. MỌI KẾT NỐI.</span>
          <h2>
            Kết nối bán hàng.
            <br />
            Thấu hiểu <em>vận hành.</em>
          </h2>
          <p>
            Từ đơn hàng tại quầy đến nguyên liệu trong kho, cùng nextvn nhìn rõ từng nhịp kinh
            doanh.
          </p>
          <div className="auth-flow" aria-label="Bán hàng kết nối công thức và tồn kho">
            <div>
              <ShoppingBag aria-hidden="true" />
              <span>Bán hàng</span>
            </div>
            <ArrowRight aria-hidden="true" size={18} />
            <div>
              <CookingPot aria-hidden="true" />
              <span>Công thức</span>
            </div>
            <ArrowRight aria-hidden="true" size={18} />
            <div>
              <Warehouse aria-hidden="true" />
              <span>Tồn kho</span>
            </div>
          </div>
        </div>
        <div className="auth-brand-footer">
          <Layers3 size={18} aria-hidden="true" />
          <span>Công nghệ cho doanh nghiệp F&B</span>
        </div>
      </aside>
      <div className="auth-main-panel">
        <header className="auth-page-header">
          <Link to="/" className="auth-home-link">
            <ArrowLeft size={17} aria-hidden="true" />
            Về trang chủ
          </Link>
          <span className="auth-mobile-brand" aria-hidden="true">
            nextvn<span>.</span>
          </span>
        </header>
        <main id="auth-content" className="auth-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="auth-legal">
          <span>Tìm hiểu trước khi sử dụng nextvn</span>
          <div>
            <details>
              <summary>Điều khoản sử dụng</summary>
              <p>
                Điều khoản sử dụng chưa được công bố trong môi trường này. Nội dung chính thức sẽ
                được cung cấp trước khi sử dụng dịch vụ.
              </p>
            </details>
            <details>
              <summary>Chính sách bảo mật</summary>
              <p>
                Chính sách bảo mật chưa được công bố trong môi trường này. Vui lòng tham khảo chính
                sách chính thức khi dịch vụ được cung cấp.
              </p>
            </details>
          </div>
        </footer>
      </div>
    </div>
  );
}
