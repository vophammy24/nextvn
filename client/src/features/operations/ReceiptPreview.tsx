import { formatCurrency } from '@/lib/format';
export function ReceiptPreview({
  lines,
  total,
  onClose,
}: {
  lines: { name: string; quantity: number; price: number }[];
  total: number;
  onClose: () => void;
}) {
  return (
    <section className="receipt-preview" aria-label="Phiếu tạm minh họa">
      <div className="receipt-paper">
        <strong className="receipt-brand">nextvn</strong>
        <h2>PHIẾU TẠM — MINH HỌA</h2>
        <p>Không phải hóa đơn hoặc xác nhận thanh toán.</p>
        <ul>
          {lines.map((line, index) => (
            <li key={index}>
              <span>
                {line.quantity} × {line.name}
              </span>
              <strong>{formatCurrency(line.quantity * line.price)}</strong>
            </li>
          ))}
        </ul>
        <div className="receipt-total">
          <span>Tổng cộng sau giảm giá</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <p>Dữ liệu giả lập · Chưa ghi nhận giao dịch</p>
      </div>
      <div className="receipt-actions">
        <button type="button" className="button" onClick={() => window.print()}>
          In bản minh họa
        </button>
        <button type="button" className="button button-secondary" onClick={onClose}>
          Đóng phiếu tạm
        </button>
      </div>
    </section>
  );
}
