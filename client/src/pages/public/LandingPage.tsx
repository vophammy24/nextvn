import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Menu,
  X,
  Coffee,
  CookingPot,
  Warehouse,
  CheckCheck,
  LayoutDashboard,
  ShoppingBag,
  ChartNoAxesCombined,
  CircleHelp,
  Layers3,
  ChevronRight,
} from 'lucide-react';
import { audiences, features, landingNavigation, pillars, workflow } from './landingContent';
import './landing.css';

function ProductPreview() {
  return (
    <figure className="lp-preview" aria-labelledby="preview-caption">
      <div className="lp-preview-bar">
        <span className="lp-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>Không gian vận hành nextvn</span>
        <span className="lp-demo-label">Bản xem trước</span>
      </div>
      <div className="lp-preview-body">
        <div className="lp-preview-sidebar" aria-hidden="true">
          <strong>
            nextvn<span>.</span>
          </strong>
          <span className="selected">
            <LayoutDashboard size={16} />
            Tổng quan
          </span>
          <span>
            <ShoppingBag size={16} />
            Bán hàng
          </span>
          <span>
            <Warehouse size={16} />
            Kho hàng
          </span>
          <span>
            <CookingPot size={16} />
            Công thức
          </span>
          <span>
            <ChartNoAxesCombined size={16} />
            Báo cáo
          </span>
          <span className="lp-preview-sidebar-note">
            Mọi kết nối.
            <br />
            Một hệ thống.
          </span>
        </div>
        <div className="lp-preview-workspace">
          <div className="lp-preview-heading">
            <div>
              <span className="lp-micro">GÓC NHÌN VẬN HÀNH</span>
              <h3>Tổng quan cửa hàng</h3>
            </div>
            <span className="lp-preview-tag">Dữ liệu minh họa</span>
          </div>
          <div className="lp-preview-metrics">
            {[
              { title: 'Bán hàng', detail: 'Theo dõi đơn hàng', icon: ShoppingBag },
              { title: 'Nguyên liệu', detail: 'Theo dõi tồn kho', icon: Warehouse },
              { title: 'Hiệu quả món', detail: 'Theo dõi chi phí', icon: ChartNoAxesCombined },
            ].map(({ title, detail, icon: Icon }) => (
              <div key={title}>
                <Icon size={18} aria-hidden="true" />
                <strong>{title}</strong>
                <span>{detail}</span>
              </div>
            ))}
          </div>
          <div className="lp-preview-panels">
            <div className="lp-preview-chart">
              <h4>Xu hướng bán hàng</h4>
              <p>Minh họa cách trình bày báo cáo</p>
              <svg
                viewBox="0 0 500 160"
                role="img"
                aria-label="Biểu đồ đường minh họa, không thể hiện số liệu kinh doanh thực tế"
              >
                <path className="lp-chart-grid" d="M0 25H500 M0 70H500 M0 115H500 M0 159H500" />
                <path
                  className="lp-chart-area"
                  d="M0 130C40 130 45 90 85 99S145 140 185 85S250 110 295 65S345 90 385 35S445 75 500 15V160H0Z"
                />
                <path
                  className="lp-chart-line"
                  d="M0 130C40 130 45 90 85 99S145 140 185 85S250 110 295 65S345 90 385 35S445 75 500 15"
                />
              </svg>
              <span className="lp-chart-note">Mẫu hiển thị · Không phải kết quả thực tế</span>
            </div>
            <div className="lp-preview-stock">
              <h4>Kết nối nguyên liệu</h4>
              <div>
                <span className="lp-mini-icon">
                  <Coffee size={20} aria-hidden="true" />
                </span>
                <span>
                  Cà phê sữa<small>Món minh họa</small>
                </span>
              </div>
              <div className="lp-recipe-connection">
                <CookingPot size={15} aria-hidden="true" /> Theo công thức đã thiết lập
              </div>
              <ul>
                <li>
                  <span>Cà phê</span>
                  <Check size={14} aria-label="Đã liên kết" />
                </li>
                <li>
                  <span>Sữa đặc</span>
                  <Check size={14} aria-label="Đã liên kết" />
                </li>
              </ul>
              <div className="lp-stock-note">
                <CheckCheck size={16} aria-hidden="true" />
                Liên kết món và tồn kho
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption id="preview-caption">
        Giao diện và nội dung minh họa sản phẩm. Không sử dụng dữ liệu khách hàng thực tế.
      </figcaption>
    </figure>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeMenu = () => setMenuOpen(false);
  return (
    <div className="landing">
      <a href="#noi-dung" className="skip-link">
        Đến nội dung chính
      </a>
      <header
        className="lp-header"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && menuOpen) {
            closeMenu();
            menuButton.current?.focus();
          }
        }}
      >
        <div className="lp-container lp-navbar">
          <Link to="/" className="lp-logo" aria-label="nextvn — Trang chủ">
            nextvn<span>.</span>
          </Link>
          <button
            ref={menuButton}
            type="button"
            className="lp-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="landing-navigation"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
          <nav
            id="landing-navigation"
            aria-label="Điều hướng trang chủ"
            className={`lp-navigation${menuOpen ? ' is-open' : ''}`}
          >
            {landingNavigation.map((item) => (
              <a key={item.href} href={item.href} onClick={closeMenu}>
                {item.label}
              </a>
            ))}
            <div className="lp-nav-actions">
              <Link to="/login" onClick={closeMenu}>
                Đăng nhập
              </Link>
              <Link to="/login" className="lp-button lp-button-yellow" onClick={closeMenu}>
                Bắt đầu <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </nav>
        </div>
      </header>
      <main id="noi-dung" tabIndex={-1}>
        <section className="lp-hero" aria-labelledby="hero-title">
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <span className="lp-eyebrow lp-eyebrow-light">
                <span />
                CÔNG NGHỆ CHO TỪNG NHỊP VẬN HÀNH
              </span>
              <h1 id="hero-title">
                Quản lý bán hàng
                <br className="lp-desktop-break" /> và tồn kho F&B
                <br className="lp-desktop-break" /> <em>trên cùng một hệ thống.</em>
              </h1>
              <p>
                nextvn kết nối bán hàng, công thức, nguyên liệu, chi phí và dữ liệu vận hành để giúp
                doanh nghiệp F&B quản lý hiệu quả hơn.
              </p>
              <div className="lp-hero-actions">
                <Link className="lp-button lp-button-yellow" to="/login">
                  Bắt đầu với nextvn <ArrowUpRight size={19} aria-hidden="true" />
                </Link>
                <a className="lp-text-link" href="#tinh-nang">
                  Khám phá tính năng <ArrowRight size={18} aria-hidden="true" />
                </a>
              </div>
              <div className="lp-hero-note">
                <Layers3 size={17} aria-hidden="true" />
                <span>Từ đơn hàng tại quầy đến bức tranh kinh doanh.</span>
              </div>
            </div>
            <div
              className="lp-hero-visual"
              aria-label="Minh họa kết nối bán hàng, công thức và kho"
            >
              <div className="lp-orbit lp-orbit-one" aria-hidden="true" />
              <div className="lp-orbit lp-orbit-two" aria-hidden="true" />
              <span className="lp-visual-label">MỘT HỆ THỐNG. MỌI KẾT NỐI.</span>
              <div className="lp-order-card">
                <div className="lp-order-card-top">
                  <span className="lp-mini-icon">
                    <Coffee size={26} aria-hidden="true" />
                  </span>
                  <span className="lp-demo-label">Đơn hàng minh họa</span>
                </div>
                <span className="lp-micro">BẮT ĐẦU TỪ MỘT MÓN</span>
                <h2>Cà phê sữa</h2>
                <p>Từ quầy bán hàng đến nguyên liệu trong kho.</p>
                <div className="lp-order-flow">
                  <span>
                    <ShoppingBag size={17} aria-hidden="true" />
                    Bán hàng
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                  <span>
                    <CookingPot size={17} aria-hidden="true" />
                    Công thức
                  </span>
                </div>
                <div className="lp-order-footer">
                  <span className="lp-live-dot" />
                  <span>Dữ liệu được kết nối</span>
                  <CheckCheck size={18} aria-hidden="true" />
                </div>
              </div>
              <div className="lp-floating lp-floating-stock">
                <span className="lp-floating-icon">
                  <Warehouse size={22} aria-hidden="true" />
                </span>
                <div>
                  <strong>Kho nguyên liệu</strong>
                  <span>Cập nhật theo món đã bán</span>
                </div>
              </div>
              <div className="lp-floating lp-floating-insight">
                <ChartNoAxesCombined size={22} aria-hidden="true" />
                <div>
                  <strong>Hiểu chi phí từng món</strong>
                  <span>Có cơ sở cho mỗi quyết định</span>
                </div>
                <ArrowUpRight size={20} aria-hidden="true" />
              </div>
              <span className="lp-visual-footnote">Sơ đồ minh họa luồng sản phẩm</span>
            </div>
          </div>
          <div className="lp-container lp-hero-bottom">
            <span>BÁN HÀNG</span>
            <i />
            <span>CÔNG THỨC</span>
            <i />
            <span>TỒN KHO</span>
            <i />
            <span>PHÂN TÍCH</span>
          </div>
        </section>
        <section id="san-pham" className="lp-section lp-container" aria-labelledby="value-title">
          <div className="lp-section-heading">
            <span className="lp-eyebrow">KẾT NỐI ĐỂ VẬN HÀNH TỐT HƠN</span>
            <h2 id="value-title">
              Không chỉ bán hàng.
              <br />
              Hiểu toàn bộ cửa hàng.
            </h2>
            <p>
              Khi bán hàng và kho cùng chung một luồng dữ liệu, việc quản lý trở nên liền mạch và dễ
              theo dõi hơn.
            </p>
          </div>
          <div className="lp-pillars">
            {pillars.map(({ icon: Icon, number, title, description, points }) => (
              <article className="lp-pillar" key={number}>
                <div className="lp-pillar-top">
                  <span className="lp-feature-icon">
                    <Icon aria-hidden="true" size={25} />
                  </span>
                  <span className="lp-index">{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <ul>
                  {points.map((point) => (
                    <li key={point}>
                      <Check size={16} aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
        <section
          id="cach-hoat-dong"
          className="lp-workflow-section"
          aria-labelledby="workflow-title"
        >
          <div className="lp-container">
            <div className="lp-section-heading">
              <span className="lp-eyebrow">CÁCH NEXTVN HOẠT ĐỘNG</span>
              <h2 id="workflow-title">
                Một món được gọi.
                <br />
                Cả hệ thống cùng chuyển động.
              </h2>
              <p>Theo dấu từng món bán ra, từ công thức đến góc nhìn kinh doanh.</p>
            </div>
            <ol className="lp-workflow">
              {workflow.map(({ title, detail, icon: Icon }, index) => (
                <li key={title}>
                  <div className="lp-workflow-symbol">
                    <Icon size={25} aria-hidden="true" />
                    <span>{index + 1}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                  {index < workflow.length - 1 && (
                    <ChevronRight className="lp-workflow-arrow" size={18} aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section
          id="tinh-nang"
          className="lp-section lp-container"
          aria-labelledby="features-title"
        >
          <div className="lp-section-heading lp-heading-split">
            <div>
              <span className="lp-eyebrow">BỘ CÔNG CỤ VẬN HÀNH</span>
              <h2 id="features-title">
                Từng tính năng.
                <br />
                Chung một nhịp vận hành.
              </h2>
            </div>
            <p>
              Từ thao tác tại quầy đến quản lý phía sau, nextvn kết nối những công việc mỗi ngày của
              doanh nghiệp F&B.
            </p>
          </div>
          <div className="lp-features">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title}>
                <span className="lp-feature-icon">
                  <Icon size={23} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="xem-truoc" className="lp-product-section" aria-labelledby="preview-title">
          <div className="lp-container">
            <div className="lp-section-heading lp-centered">
              <span className="lp-eyebrow">KHÁM PHÁ KHÔNG GIAN LÀM VIỆC</span>
              <h2 id="preview-title">Rõ ràng hơn để quản lý tốt hơn.</h2>
              <p>Một góc nhìn thống nhất cho bán hàng, nguyên liệu và hiệu quả vận hành.</p>
            </div>
            <ProductPreview />
          </div>
        </section>
        <section
          id="doanh-nghiep"
          className="lp-section lp-container"
          aria-labelledby="audience-title"
        >
          <div className="lp-section-heading lp-centered">
            <span className="lp-eyebrow">DÀNH CHO DOANH NGHIỆP F&B</span>
            <h2 id="audience-title">Đồng hành cùng mô hình của bạn.</h2>
            <p>
              Được định hướng cho nhu cầu vận hành của các doanh nghiệp ẩm thực quy mô nhỏ và vừa.
            </p>
          </div>
          <ul className="lp-audiences">
            {audiences.map(({ icon: Icon, title }) => (
              <li key={title}>
                <Icon size={30} strokeWidth={1.5} aria-hidden="true" />
                <h3>{title}</h3>
              </li>
            ))}
          </ul>
        </section>
        <section className="lp-cta-section" aria-labelledby="cta-title">
          <div className="lp-container lp-cta-inner">
            <span className="lp-eyebrow lp-eyebrow-light">BẮT ĐẦU CÙNG NEXTVN</span>
            <h2 id="cta-title">
              Sẵn sàng quản lý cửa hàng
              <br />
              trên một hệ thống duy nhất?
            </h2>
            <p>Kết nối công việc hôm nay. Hiểu rõ hoạt động ngày mai.</p>
            <div className="lp-cta-actions">
              <Link to="/login" className="lp-button lp-button-yellow">
                Đăng nhập với Google <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/login/business" className="lp-button lp-button-outline">
                Đăng nhập doanh nghiệp <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
        <section id="ho-tro" className="lp-support lp-container" aria-labelledby="support-title">
          <div>
            <span className="lp-eyebrow">
              <CircleHelp size={16} aria-hidden="true" />
              TÌM HIỂU THÊM
            </span>
            <h2 id="support-title">Một vài điều bạn có thể muốn biết.</h2>
          </div>
          <div className="lp-faq">
            <details>
              <summary>nextvn phù hợp với mô hình nào?</summary>
              <p>
                nextvn hướng đến quán cà phê, quán ăn, nhà hàng nhỏ, tiệm đồ uống và chuỗi F&B quy
                mô nhỏ và vừa có nhu cầu kết nối bán hàng với quản lý nguyên liệu.
              </p>
            </details>
            <details>
              <summary>Tôi có thể xem trước sản phẩm ở đâu?</summary>
              <p>
                Bạn có thể khám phá <a href="#xem-truoc">giao diện minh họa</a> ngay trên trang này.
                Nội dung xem trước không phải dữ liệu của khách hàng thực tế.
              </p>
            </details>
            <details>
              <summary>Bắt đầu với nextvn như thế nào?</summary>
              <p>
                Chọn <Link to="/login">Đăng nhập với Google</Link> để đến trang đăng nhập, hoặc{' '}
                <Link to="/login/business">Đăng nhập doanh nghiệp</Link> nếu bạn sử dụng luồng đăng
                nhập doanh nghiệp.
              </p>
            </details>
          </div>
        </section>
      </main>
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-top">
            <div>
              <span className="lp-logo">
                nextvn<span>.</span>
              </span>
              <p>Kết nối bán hàng. Thấu hiểu vận hành.</p>
            </div>
            <nav aria-label="Điều hướng cuối trang">
              <a href="#san-pham">Sản phẩm</a>
              <a href="#tinh-nang">Tính năng</a>
              <a href="#ho-tro">Hỗ trợ</a>
            </nav>
          </div>
          <div className="lp-footer-bottom">
            <span>nextvn · Công nghệ cho doanh nghiệp F&B</span>
            <div className="lp-legal">
              <details>
                <summary>Điều khoản sử dụng</summary>
                <p>
                  Điều khoản sử dụng chưa được công bố trên trang này. Nội dung sẽ được cung cấp
                  trước khi sử dụng dịch vụ chính thức.
                </p>
              </details>
              <details>
                <summary>Chính sách bảo mật</summary>
                <p>
                  Chính sách bảo mật chưa được công bố trên trang này. Vui lòng xem chính sách chính
                  thức khi dịch vụ được cung cấp.
                </p>
              </details>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
