import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, ShoppingBag, Minus, Plus, Trash2, AlertCircle } from 'lucide-react';
import {
  fetchCategories,
  fetchMenuItems,
  createOrder,
  fetchActiveShift,
} from '@/services/salesApi';
import { useCartStore } from '@/stores/cartStore';
import type { MenuItem } from '@/types/sales';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function POSPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const cart = useCartStore();

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const menuQuery = useQuery({
    queryKey: ['menuItems', selectedCategory, search],
    queryFn: () =>
      fetchMenuItems({
        categoryId: selectedCategory ?? undefined,
        search: search || undefined,
      }),
  });

  const shiftQuery = useQuery({
    queryKey: ['activeShift'],
    queryFn: fetchActiveShift,
  });

  const orderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      cart.clearCart();
      alert('Đơn hàng đã được tạo thành công!');
    },
    onError: () => {
      alert('Không thể tạo đơn hàng. Vui lòng thử lại.');
    },
  });

  const handleSubmitOrder = () => {
    if (cart.items.length === 0) return;

    orderMutation.mutate({
      orderType: cart.orderType,
      tableId: cart.tableId,
      items: cart.items.map((i) => ({
        menuItemId: i.menuItem.id,
        quantity: i.quantity,
        note: i.note,
      })),
      paymentMethod: cart.paymentMethod,
      discount: cart.discount,
      note: cart.note || undefined,
    });
  };

  const handleAddItem = (item: MenuItem) => {
    cart.addItem(item);
  };

  return (
    <>
      <header className="top-header">
        <h2>POS / Bán hàng</h2>
        {shiftQuery.data && <span className="badge badge-success">Ca đang hoạt động</span>}
        {!shiftQuery.data && !shiftQuery.isLoading && (
          <span className="badge badge-warning">Chưa bắt đầu ca</span>
        )}
      </header>

      <div className="page-content">
        <div className="pos-layout">
          {/* Menu Panel */}
          <div className="pos-menu">
            <div className="pos-menu-header">
              <div className="search-input-wrapper" style={{ flex: 1 }}>
                <Search />
                <input
                  className="input"
                  placeholder="Tìm món..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%' }}
                  id="pos-search"
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="pos-categories">
              <button
                type="button"
                className={`pos-category-tab${selectedCategory === null ? ' active' : ''}`}
                onClick={() => setSelectedCategory(null)}
              >
                Tất cả
              </button>
              {categoriesQuery.data?.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  className={`pos-category-tab${selectedCategory === cat.id ? ' active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Menu Items Grid */}
            {menuQuery.isLoading && (
              <div className="loading-state">
                <div className="spinner" />
                <span>Đang tải thực đơn...</span>
              </div>
            )}

            {menuQuery.isError && (
              <div className="error-state">
                <AlertCircle />
                <span>Không thể tải thực đơn.</span>
              </div>
            )}

            {menuQuery.data && menuQuery.data.length === 0 && (
              <div className="empty-state">
                <ShoppingBag />
                <span>Không tìm thấy món nào.</span>
              </div>
            )}

            <div className="pos-items-grid">
              {menuQuery.data?.map((item) => (
                <div
                  key={item.id}
                  className="pos-item-card"
                  onClick={() => handleAddItem(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddItem(item);
                  }}
                >
                  <div className="item-icon">🍽️</div>
                  <div className="item-name">{item.name}</div>
                  <div className="item-price">{formatCurrency(item.price)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Panel */}
          <div className="cart-panel">
            <div className="cart-header">
              <h3>Đơn hàng hiện tại</h3>
              <span className="badge badge-default">{cart.getItemCount()} món</span>
            </div>

            {/* Order Type Toggle */}
            <div style={{ padding: '12px 20px 0' }}>
              <div className="payment-methods">
                <button
                  type="button"
                  className={`payment-method-btn${cart.orderType === 'DINE_IN' ? ' selected' : ''}`}
                  onClick={() => cart.setOrderType('DINE_IN')}
                >
                  Tại chỗ
                </button>
                <button
                  type="button"
                  className={`payment-method-btn${cart.orderType === 'TAKEAWAY' ? ' selected' : ''}`}
                  onClick={() => cart.setOrderType('TAKEAWAY')}
                >
                  Mang đi
                </button>
              </div>
            </div>

            {/* Cart Items */}
            <div className="cart-items">
              {cart.items.length === 0 ? (
                <div className="cart-empty">
                  <ShoppingBag />
                  <span>Chưa có món nào</span>
                  <span style={{ fontSize: '13px' }}>Chọn món từ thực đơn bên trái</span>
                </div>
              ) : (
                cart.items.map((item) => (
                  <div key={item.menuItem.id} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.menuItem.name}</div>
                      <div className="cart-item-price">{formatCurrency(item.menuItem.price)}</div>
                    </div>
                    <div className="cart-item-controls">
                      <button
                        type="button"
                        onClick={() => cart.decreaseQuantity(item.menuItem.id)}
                        aria-label={`Giảm ${item.menuItem.name}`}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="cart-item-qty">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => cart.increaseQuantity(item.menuItem.id)}
                        aria-label={`Tăng ${item.menuItem.name}`}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => cart.removeItem(item.menuItem.id)}
                        aria-label={`Xóa ${item.menuItem.name}`}
                        style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            <div className="cart-footer">
              <div className="cart-summary-row">
                <span>Tạm tính</span>
                <span>{formatCurrency(cart.getSubtotal())}</span>
              </div>
              <div className="cart-summary-row">
                <span>Giảm giá</span>
                <span>-{formatCurrency(cart.discount)}</span>
              </div>
              <div className="cart-summary-row total">
                <span>Tổng cộng</span>
                <span>{formatCurrency(cart.getTotal())}</span>
              </div>

              {/* Payment Method */}
              <div className="payment-methods">
                <button
                  type="button"
                  className={`payment-method-btn${cart.paymentMethod === 'CASH' ? ' selected' : ''}`}
                  onClick={() => cart.setPaymentMethod('CASH')}
                >
                  💵 Tiền mặt
                </button>
                <button
                  type="button"
                  className={`payment-method-btn${cart.paymentMethod === 'BANK_TRANSFER' ? ' selected' : ''}`}
                  onClick={() => cart.setPaymentMethod('BANK_TRANSFER')}
                >
                  🏦 Chuyển khoản
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleSubmitOrder}
                disabled={cart.items.length === 0 || orderMutation.isPending}
                id="pos-submit-order"
              >
                {orderMutation.isPending ? (
                  <>
                    <div className="spinner" />
                    Đang xử lý...
                  </>
                ) : (
                  'Xác nhận thanh toán'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
