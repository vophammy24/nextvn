export const locale = 'vi-VN';
const numberFormatter = new Intl.NumberFormat(locale);
const currencyFormatter = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat(locale, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});
const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Ho_Chi_Minh',
});
export const formatNumber = (value: number) => numberFormatter.format(value);
export const formatCurrency = (value: number) => currencyFormatter.format(value);
export const formatDate = (value: Date | string | number) => dateFormatter.format(new Date(value));
export const formatDateTime = (value: Date | string | number) =>
  dateTimeFormatter.format(new Date(value));
