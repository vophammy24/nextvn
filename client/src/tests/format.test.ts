import { describe, expect, it } from 'vitest';
import { formatCurrency, formatNumber, formatDate, formatDateTime } from '@/lib/format';
describe('Định dạng tiếng Việt', () => {
  it('phân cách hàng nghìn và phần thập phân theo vi-VN', () => {
    expect(formatNumber(12560000)).toBe('12.560.000');
    expect(formatNumber(1234.5)).toBe('1.234,5');
  });
  it('hiển thị đồng Việt Nam, bao gồm số không và số âm', () => {
    const normalize = (value: string) => value.replace(/\u00a0/g, ' ');
    expect(normalize(formatCurrency(12560000))).toBe('12.560.000 ₫');
    expect(normalize(formatCurrency(0))).toBe('0 ₫');
    expect(normalize(formatCurrency(-1250))).toBe('-1.250 ₫');
  });
  it('hiển thị ngày và giờ Việt Nam độc lập múi giờ máy chạy', () => {
    expect(formatDate('2026-10-19T18:30:00Z')).toBe('20/10/2026');
    expect(formatDateTime('2026-10-19T18:30:00Z')).toBe('01:30 20/10/2026');
  });
});
