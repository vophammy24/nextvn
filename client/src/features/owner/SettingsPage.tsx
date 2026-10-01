import { useState, type FormEvent } from 'react';
import { SectionCard } from '@/components/common/Foundation';
import { settingsSchema } from './model';
import type { OwnerData } from './types';
export function Settings({ data }: { data: OwnerData }) {
  const [draft, setDraft] = useState(data.settings);
  const [notice, setNotice] = useState('');
  const update = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = settingsSchema.safeParse(draft);
    setNotice(
      result.success
        ? 'Lưu cài đặt chưa khả dụng. Chưa thay đổi thông tin doanh nghiệp hoặc cách tính hóa đơn.'
        : result.error.issues[0].message,
    );
  };
  return (
    <form className="owner-settings" noValidate onSubmit={submit} aria-label="Cài đặt doanh nghiệp">
      <SectionCard title="Thông tin doanh nghiệp">
        <div className="owner-form">
          <label>
            Tên doanh nghiệp
            <input
              value={draft.name}
              onChange={(event) => update('name', event.target.value)}
              required
            />
          </label>
          <label>
            Email liên hệ
            <input
              type="email"
              value={draft.email}
              onChange={(event) => update('email', event.target.value)}
              required
            />
          </label>
          <label>
            Số điện thoại
            <input
              type="tel"
              value={draft.phone}
              onChange={(event) => update('phone', event.target.value)}
            />
          </label>
          <label>
            Mã số thuế
            <input
              value={draft.taxCode}
              onChange={(event) => update('taxCode', event.target.value)}
            />
          </label>
          <label className="owner-full">
            Địa chỉ
            <textarea
              value={draft.address}
              onChange={(event) => update('address', event.target.value)}
              rows={2}
            />
          </label>
        </div>
      </SectionCard>
      <SectionCard title="Thuế & phí dịch vụ">
        <div className="owner-form">
          <label>
            Thuế (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={Number.isNaN(draft.tax) ? '' : draft.tax}
              onChange={(event) => update('tax', event.target.valueAsNumber)}
              required
            />
          </label>
          <label>
            Phí dịch vụ (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={Number.isNaN(draft.fee) ? '' : draft.fee}
              onChange={(event) => update('fee', event.target.valueAsNumber)}
              required
            />
          </label>
        </div>
        <p className="owner-muted">
          Giá trị minh họa do doanh nghiệp thiết lập; chưa áp dụng vào đơn hàng. Đơn vị tiền tệ:
          Đồng Việt Nam (VND).
        </p>
      </SectionCard>
      <SectionCard title="Cài đặt hóa đơn">
        <div className="owner-form">
          <label>
            Tiền tố hóa đơn
            <input
              value={draft.invoicePrefix}
              onChange={(event) => update('invoicePrefix', event.target.value)}
              required
            />
          </label>
          <label>
            Lời nhắn cuối hóa đơn
            <textarea
              value={draft.invoiceFooter}
              onChange={(event) => update('invoiceFooter', event.target.value)}
              rows={2}
            />
          </label>
        </div>
        <p className="owner-muted">
          Định dạng Việt Nam · Múi giờ Việt Nam (UTC+7). Cài đặt này chưa kết nối dịch vụ hóa đơn
          điện tử.
        </p>
      </SectionCard>
      <SectionCard title="Cài đặt thông báo">
        <div className="owner-checkboxes">
          <label>
            <input
              type="checkbox"
              checked={draft.stockNotice}
              onChange={(event) => update('stockNotice', event.target.checked)}
            />
            Cảnh báo tồn kho và hạn sử dụng
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.revenueNotice}
              onChange={(event) => update('revenueNotice', event.target.checked)}
            />
            Tổng hợp doanh thu định kỳ
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.billingNotice}
              onChange={(event) => update('billingNotice', event.target.checked)}
            />
            Nhắc hạn gói dịch vụ và thanh toán
          </label>
        </div>
      </SectionCard>
      {notice && (
        <p className="owner-notice" role="alert">
          {notice}
        </p>
      )}
      <div className="owner-form-actions">
        <button className="button" type="submit">
          Lưu cài đặt
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => {
            setDraft(data.settings);
            setNotice('Đã khôi phục biểu mẫu về dữ liệu minh họa ban đầu.');
          }}
        >
          Khôi phục biểu mẫu
        </button>
      </div>
    </form>
  );
}
