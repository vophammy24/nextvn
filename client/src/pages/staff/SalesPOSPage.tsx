import { useCallback, useContext, useEffect, useMemo, useState, type SetStateAction } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { fetchActiveShift } from '@/services/salesApi';
import {
  createSalesOrder,
  checkoutSalesOrder,
  currentSalesBranchId,
  editSalesOrder,
  fetchSalesCatalog,
  fetchSalesOrder,
  fetchSalesOrderByRequestKey,
  fetchSalesSettings,
  fetchSalesTables,
  paySalesOrder,
  type SalesLine,
  type SalesOrder,
  type SalesProduct,
} from '@/services/salesWorkflowApi';
import axios from 'axios';
import { WorkspaceSessionContext } from '@/features/auth/workspaceContext';
import {
  MAX_SALES_TABS,
  loadSalesTabs,
  isSalesId,
  newSalesTab,
  saveSalesTabs,
  salesDraftScope,
  type SalesDraftStore,
  type SalesDraftTab,
} from './salesDraftTabs';
import './sales-workflow.css';

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
const message = (error: unknown) =>
  axios.isAxiosError(error)
    ? ((error.response?.data?.message as string | undefined) ?? 'Không thể xử lý yêu cầu.')
    : error instanceof Error
      ? error.message
      : 'Không thể xử lý yêu cầu.';

export default function SalesPOSPage() {
  const context = useContext(WorkspaceSessionContext)?.context;
  const scope = context?.branch
    ? salesDraftScope(context.user.id, context.business.id, context.branch.id)
    : null;
  return <POSWorkspace key={scope ?? 'unscoped'} scope={scope} />;
}

function POSWorkspace({ scope }: { scope: string | null }) {
  const navigate = useNavigate();
  const [state, setState] = useState<SalesDraftStore>(() => loadSalesTabs(scope));
  const [params, setParams] = useSearchParams();
  const [closingId, setClosingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const updateTab = useCallback((id: string, change: (tab: SalesDraftTab) => SalesDraftTab) => {
    setState((current) => ({
      ...current,
      tabs: current.tabs.map((tab) =>
        tab.id === id ? { ...change(tab), updatedAt: Date.now() } : tab,
      ),
    }));
  }, []);
  useEffect(() => saveSalesTabs(scope, state), [scope, state]);
  useEffect(() => {
    document
      .getElementById(`sales-tab-${state.activeId}`)
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [state.activeId]);
  const orderIntent = params.get('order');
  const tableIntent = params.get('tableId');
  useEffect(() => {
    if (!orderIntent && !tableIntent) return;
    if ((orderIntent && !isSalesId(orderIntent)) || (tableIntent && !isSalesId(tableIntent))) {
      setParams({}, { replace: true });
      return;
    }
    setState((current) => {
      const existing = orderIntent
        ? current.tabs.find((tab) => tab.orderId === orderIntent)
        : undefined;
      if (existing) return { ...current, activeId: existing.id };
      if (current.tabs.length >= MAX_SALES_TABS) return current;
      const tab = newSalesTab(`Khách ${String(current.tabs.length + 1).padStart(2, '0')}`, {
        ...(orderIntent ? { orderId: orderIntent } : {}),
        ...(tableIntent
          ? { tableId: tableIntent, orderType: 'DINE_IN', orderingMode: 'TABLE', timing: 'LATER' }
          : {}),
      });
      return { tabs: [...current.tabs, tab], activeId: tab.id };
    });
    setParams({}, { replace: true });
  }, [orderIntent, tableIntent, setParams]);
  const active = state.tabs.find((tab) => tab.id === state.activeId) ?? state.tabs[0];
  const finishClose = (id: string) => {
    setState((current) => {
      const remaining = current.tabs.filter((tab) => tab.id !== id);
      if (remaining.length === 0) {
        const fresh = newSalesTab('Khách 01');
        return { tabs: [fresh], activeId: fresh.id };
      }
      return {
        tabs: remaining,
        activeId: current.activeId === id ? remaining[0].id : current.activeId,
      };
    });
    setClosingId(null);
  };
  const requestClose = (tab: SalesDraftTab) => {
    if (tab.status === 'PAID' || tab.status === 'CANCELLED') finishClose(tab.id);
    else if (tab.orderId || tab.lines.length > 0 || tab.note.trim()) setClosingId(tab.id);
    else finishClose(tab.id);
  };
  const closing = state.tabs.find((tab) => tab.id === closingId);
  return (
    <div className="page-content sales-pos">
      <div className="page-header">
        <div>
          <h1>Bán hàng</h1>
          <p>Chuyển giữa các đơn đang xử lý mà không mất giỏ hàng</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/app/orders')}>
          Xem đơn hàng
        </Button>
      </div>
      <div className="sales-tabbar" role="tablist" aria-label="Các đơn đang xử lý">
        {state.tabs.map((tab, index) => (
          <div className="sales-tab" key={tab.id}>
            <button
              type="button"
              role="tab"
              id={`sales-tab-${tab.id}`}
              aria-controls={`sales-panel-${tab.id}`}
              aria-selected={tab.id === active.id}
              tabIndex={tab.id === active.id ? 0 : -1}
              className={`sales-tab-select ${tab.id === active.id ? 'is-active' : ''}`}
              onClick={() => setState((current) => ({ ...current, activeId: tab.id }))}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === 'ArrowRight') next = (index + 1) % state.tabs.length;
                else if (event.key === 'ArrowLeft')
                  next = (index - 1 + state.tabs.length) % state.tabs.length;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = state.tabs.length - 1;
                else return;
                event.preventDefault();
                const target = state.tabs[next];
                setState((current) => ({ ...current, activeId: target.id }));
                document.getElementById(`sales-tab-${target.id}`)?.focus();
              }}
            >
              <strong>{tab.label}</strong>
              <span>
                {tab.orderId
                  ? `Đơn ${tab.orderId.slice(0, 8)}`
                  : `${tab.lines.reduce((sum, line) => sum + line.quantity, 0)} món`}
              </span>
              {(tab.dirty || (!tab.orderId && (tab.lines.length > 0 || !!tab.note))) && (
                <span aria-label="Có thay đổi chưa lưu">●</span>
              )}
            </button>
            <button
              type="button"
              className="sales-tab-close"
              aria-label={`Đóng tab ${tab.label}`}
              onClick={() => requestClose(tab)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="sales-tab-actions">
        <Button
          variant="secondary"
          disabled={state.tabs.length >= MAX_SALES_TABS}
          onClick={() => {
            const tab = newSalesTab(`Khách ${String(state.tabs.length + 1).padStart(2, '0')}`);
            setState((current) => ({ tabs: [...current.tabs, tab], activeId: tab.id }));
          }}
        >
          + Đơn mới
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setRenamingId(active.id);
            setRenameValue(active.label);
          }}
        >
          Đổi tên tab
        </Button>
        <span className="sales-tab-hint">Vuốt ngang để xem các tab</span>
      </div>
      {state.tabs.length >= MAX_SALES_TABS && (
        <p role="status">
          Đã mở tối đa {MAX_SALES_TABS} tab. Đóng hoặc hoàn tất một tab để tạo đơn mới.
        </p>
      )}
      {state.tabs.map((tab) => (
        <div
          key={tab.id}
          id={`sales-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`sales-tab-${tab.id}`}
          hidden={tab.id !== active.id}
        >
          <POSPane
            tab={tab}
            active={tab.id === active.id}
            updateTab={updateTab}
            onClose={() => requestClose(tab)}
          />
        </div>
      ))}
      <Modal
        open={!!closing}
        onClose={() => setClosingId(null)}
        title={closing?.orderId ? 'Đóng tab đơn hàng?' : 'Bạn muốn bỏ đơn nháp này?'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setClosingId(null)}>
              Giữ lại
            </Button>
            <Button variant="danger" onClick={() => closing && finishClose(closing.id)}>
              Đóng tab
            </Button>
          </>
        }
      >
        {closing?.orderId
          ? 'Chỉ đóng tab này. Đơn đã lưu vẫn còn trong Đơn hàng và Bàn; thay đổi chưa lưu sẽ bị bỏ.'
          : 'Giỏ hàng và ghi chú chưa lưu trong tab này sẽ bị bỏ.'}
      </Modal>
      <Modal
        open={!!renamingId}
        onClose={() => setRenamingId(null)}
        title="Đổi tên tab"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenamingId(null)}>
              Hủy
            </Button>
            <Button
              disabled={!renameValue.trim()}
              onClick={() => {
                if (renamingId)
                  updateTab(renamingId, (tab) => ({
                    ...tab,
                    label: renameValue.trim().slice(0, 40),
                  }));
                setRenamingId(null);
              }}
            >
              Lưu tên
            </Button>
          </>
        }
      >
        <Input
          aria-label="Tên tab"
          maxLength={40}
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
        />
      </Modal>
    </div>
  );
}

function POSPane({
  tab,
  active,
  updateTab,
  onClose,
}: {
  tab: SalesDraftTab;
  active: boolean;
  updateTab: (id: string, change: (tab: SalesDraftTab) => SalesDraftTab) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const orderId = tab.orderId;
  const tableFromUrl = tab.tableId;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const { lines, orderType, orderingMode, tableId, timing, method, note, discount } = tab;
  const setField = useCallback(
    <K extends keyof SalesDraftTab>(key: K, value: SetStateAction<SalesDraftTab[K]>) =>
      updateTab(tab.id, (current) => {
        const next =
          typeof value === 'function'
            ? (value as (previous: SalesDraftTab[K]) => SalesDraftTab[K])(current[key])
            : value;
        return { ...current, dirty: current.dirty || current[key] !== next, [key]: next };
      }),
    [tab.id, updateTab],
  );
  const setLines = (value: SetStateAction<SalesLine[]>) => setField('lines', value);
  const setOrderType = useCallback(
    (value: SalesDraftTab['orderType']) => setField('orderType', value),
    [setField],
  );
  const setOrderingMode = useCallback(
    (value: SalesDraftTab['orderingMode']) => setField('orderingMode', value),
    [setField],
  );
  const setTableId = useCallback((value: string | null) => setField('tableId', value), [setField]);
  const setTiming = useCallback(
    (value: SalesDraftTab['timing']) => setField('timing', value),
    [setField],
  );
  const setMethod = (value: SalesDraftTab['method']) => setField('method', value);
  const setNote = (value: string) => setField('note', value);
  const setDiscount = (value: number) => setField('discount', value);
  const requestKey = tab.id;
  const [saved, setSaved] = useState<SalesOrder | null>(null);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [confirmCheckout, setConfirmCheckout] = useState(false);

  const catalog = useQuery({ queryKey: ['sales-catalog'], queryFn: fetchSalesCatalog });
  const settings = useQuery({ queryKey: ['sales-settings'], queryFn: () => fetchSalesSettings() });
  const tables = useQuery({ queryKey: ['sales-tables'], queryFn: () => fetchSalesTables() });
  const shift = useQuery({ queryKey: ['activeShift'], queryFn: fetchActiveShift });
  const existing = useQuery({
    queryKey: ['sales-order', orderId],
    queryFn: () => fetchSalesOrder(orderId!),
    enabled: !!orderId && active,
  });
  useEffect(() => {
    if (!existing.data) return;
    const order = existing.data;
    setSaved(order);
    if (tab.savedRevision && tab.savedRevision !== order.revision) {
      setConflict(true);
      return;
    }
    if (tab.savedRevision) return;
    updateTab(tab.id, (current) => ({
      ...current,
      lines: order.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        note: item.note ?? '',
        modifierKeys: item.modifierKeys ?? [],
      })),
      orderType: order.orderType,
      orderingMode: order.orderingMode ?? (order.tableId ? 'TABLE' : 'COUNTER'),
      tableId: order.tableId,
      note: order.note ?? '',
      discount: order.discount,
      savedRevision: order.revision,
      status:
        order.status === 'PAID' ? 'PAID' : order.status === 'CANCELLED' ? 'CANCELLED' : 'OPEN',
      dirty: false,
    }));
  }, [existing.data, tab.id, tab.savedRevision, updateTab]);
  useEffect(() => {
    if (tableFromUrl && !orderId) {
      setOrderType('DINE_IN');
      setOrderingMode('TABLE');
      setTableId(tableFromUrl);
      setTiming('LATER');
    }
  }, [tableFromUrl, orderId, setOrderType, setOrderingMode, setTableId, setTiming]);
  useEffect(() => {
    if (settings.data?.serviceType === 'DINE_IN' && !tableFromUrl && !orderId)
      setOrderType('DINE_IN');
    if (settings.data?.serviceType === 'TAKEAWAY' && !tableFromUrl && !orderId)
      setOrderType('TAKEAWAY');
  }, [settings.data?.serviceType, tableFromUrl, orderId, setOrderType]);
  useEffect(() => {
    if (orderId || orderType !== 'DINE_IN') return;
    if (settings.data?.dineInOrderingMode === 'TABLE_ONLY') setOrderingMode('TABLE');
    if (settings.data?.dineInOrderingMode === 'COUNTER_ONLY') {
      setOrderingMode('COUNTER');
      setTableId(null);
    }
  }, [orderId, orderType, settings.data?.dineInOrderingMode, setOrderingMode, setTableId]);
  useEffect(() => {
    if (orderId) return;
    if (orderingMode === 'TABLE') setTiming('LATER');
    else if (settings.data?.counterPaymentPolicy === 'IMMEDIATE_ONLY') setTiming('NOW');
    else if (settings.data?.counterPaymentPolicy === 'PAY_LATER_ALLOWED') setTiming('LATER');
  }, [orderId, orderingMode, settings.data?.counterPaymentPolicy, setTiming]);

  const products = useMemo(
    () => new Map((catalog.data ?? []).map((product) => [product.id, product])),
    [catalog.data],
  );
  const estimated = lines.reduce((sum, line) => {
    const product = products.get(line.menuItemId);
    return (
      sum +
      (product
        ? product.price +
          product.modifiers
            .filter((modifier) => line.modifierKeys.includes(modifier.key))
            .reduce((total, modifier) => total + modifier.priceExtra, 0)
        : 0) *
        line.quantity
    );
  }, 0);
  const canSave = !!shift.data && !saved && !orderId && lines.length > 0;
  const canEdit =
    !!shift.data && !!saved && !conflict && ['OPEN', 'CONFIRMED'].includes(saved.status);
  const unsavedChanges =
    !!saved &&
    (JSON.stringify(lines) !==
      JSON.stringify(
        saved.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          note: item.note ?? '',
          modifierKeys: item.modifierKeys ?? [],
        })),
      ) ||
      note !== (saved.note ?? '') ||
      discount !== saved.discount);
  const categories = Array.from(
    new Map(
      (catalog.data ?? []).map((product) => [product.categoryId, product.categoryName ?? 'Khác']),
    ),
  );
  const filtered = (catalog.data ?? []).filter(
    (product) =>
      (!category || product.categoryId === category) &&
      product.name.toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN')),
  );
  const visibleTables = (tables.data ?? []).filter(
    (table) => table.isActive && (table.effectiveStatus === 'AVAILABLE' || table.id === tableId),
  );

  const updateLine = (index: number, value: SalesLine | null) =>
    setLines((current) =>
      value
        ? current.map((line, at) => (at === index ? value : line))
        : current.filter((_, at) => at !== index),
    );
  const add = (product: SalesProduct) =>
    setLines((current) => [
      ...current,
      { menuItemId: product.id, quantity: 1, note: '', modifierKeys: [] },
    ]);
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    void queryClient.invalidateQueries({ queryKey: ['sales-tables'] });
    void queryClient.invalidateQueries({ queryKey: ['sales-shift-summary'] });
  };
  const save = useMutation({
    mutationFn: async () => {
      const latestRows = await fetchSalesCatalog();
      queryClient.setQueryData(['sales-catalog'], latestRows);
      const latest = new Map(latestRows.map((product) => [product.id, product]));
      let latestTotal = 0;
      for (const line of lines) {
        const product = latest.get(line.menuItemId);
        if (
          !product ||
          line.modifierKeys.some((key) => !product.modifiers.some((item) => item.key === key))
        )
          throw new Error(
            'Thực đơn hoặc tùy chọn món đã thay đổi. Vui lòng kiểm tra lại giỏ hàng.',
          );
        latestTotal +=
          (product.price +
            product.modifiers
              .filter((item) => line.modifierKeys.includes(item.key))
              .reduce((sum, item) => sum + item.priceExtra, 0)) *
          line.quantity;
      }
      if (latestTotal !== estimated)
        throw new Error('Giá món đã thay đổi. Vui lòng kiểm tra lại giỏ hàng trước khi lưu.');
      if (saved)
        return editSalesOrder(saved.id, { revision: saved.revision, items: lines, note, discount });
      const body = {
        requestKey,
        branchId: await currentSalesBranchId(),
        orderType,
        orderingMode,
        paymentTiming: timing,
        tableId: orderingMode === 'TABLE' ? tableId : null,
        items: lines,
        note,
        discount,
      };
      return timing === 'NOW'
        ? checkoutSalesOrder(body, method, estimated - discount)
        : createSalesOrder(body);
    },
    onSuccess: (order) => {
      setSaved(order);
      updateTab(tab.id, (current) => ({
        ...current,
        orderId: order.id,
        savedRevision: order.revision,
        status: order.status === 'PAID' ? 'PAID' : 'OPEN',
        dirty: false,
      }));
      setError('');
      setSuccess(
        order.status === 'PAID'
          ? 'Đã xác nhận thu tiền và hoàn tất đơn.'
          : 'Đã lưu đơn chờ thanh toán.',
      );
      setConfirmCheckout(false);
      invalidate();
    },
    onError: async (failure) => {
      if (!saved && !orderId) {
        try {
          const recovered = await fetchSalesOrderByRequestKey(requestKey);
          setSaved(recovered);
          updateTab(tab.id, (current) => ({
            ...current,
            orderId: recovered.id,
            savedRevision: recovered.revision,
            status: recovered.status === 'PAID' ? 'PAID' : 'OPEN',
            dirty: false,
          }));
          setConfirmCheckout(false);
          setError('');
          setSuccess(
            recovered.status === 'PAID'
              ? 'Đã đối chiếu: đơn đã thanh toán.'
              : 'Đã đối chiếu: đơn đã được lưu.',
          );
          invalidate();
          return;
        } catch {
          /* No persisted order for this key; retain the same key for safe retry. */
        }
      }
      setConfirmCheckout(false);
      setError(message(failure));
      if (axios.isAxiosError(failure) && failure.response?.status === 409) {
        void queryClient.invalidateQueries({ queryKey: ['sales-tables'] });
        void queryClient.invalidateQueries({ queryKey: ['sales-settings'] });
      }
    },
  });
  const pay = useMutation({
    mutationFn: () => paySalesOrder(saved!.id, method),
    onSuccess: (order) => {
      setSaved(order);
      updateTab(tab.id, (current) => ({
        ...current,
        savedRevision: order.revision,
        status: 'PAID',
        dirty: false,
      }));
      setConfirmPayment(false);
      setError('');
      setSuccess('Đã xác nhận thu tiền và hoàn tất đơn.');
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['sales-order', order.id] });
    },
    onError: (failure) => {
      setConfirmPayment(false);
      setError(message(failure));
    },
  });
  const chooseType = (value: 'TAKEAWAY' | 'DINE_IN') => {
    setOrderType(value);
    if (value === 'TAKEAWAY') {
      setOrderingMode('COUNTER');
      setTableId(null);
    }
  };
  const disabled = !!saved || !!orderId;
  return (
    <div className="sales-pos">
      {conflict && (
        <div className="error-state" role="alert">
          Đơn đã thay đổi trên thiết bị khác. Không thể ghi đè bản nháp này.
          <Button
            variant="secondary"
            onClick={() => {
              const order = existing.data;
              if (!order) return;
              updateTab(tab.id, (current) => ({ ...current, savedRevision: null }));
              setConflict(false);
              void existing.refetch();
            }}
          >
            Tải lại đơn từ máy chủ
          </Button>
        </div>
      )}
      {!shift.isLoading && !shift.data && (
        <div className="error-state" role="alert">
          Vui lòng bắt đầu ca tại trang Ca làm việc trước khi bán hàng.
        </div>
      )}
      {(settings.isLoading || catalog.isLoading || tables.isLoading || existing.isLoading) && (
        <div className="loading-state" role="status">
          <div className="spinner" />
          Đang tải dữ liệu bán hàng...
        </div>
      )}
      {(settings.isError || catalog.isError || tables.isError || existing.isError) && (
        <div className="error-state" role="alert">
          <AlertCircle />
          Không thể tải dữ liệu.{' '}
          <Button variant="secondary" onClick={() => void queryClient.invalidateQueries()}>
            Thử lại
          </Button>
        </div>
      )}
      {error && (
        <div className="error-state" role="alert">
          <AlertCircle />
          {error}
        </div>
      )}
      {success && (
        <div className="badge badge-success" role="status">
          {success}
        </div>
      )}
      <Button
        variant="secondary"
        className="sales-cart-jump"
        onClick={() =>
          document.getElementById(`sales-cart-${tab.id}`)?.scrollIntoView({ behavior: 'smooth' })
        }
      >
        Xem giỏ ({lines.reduce((sum, line) => sum + line.quantity, 0)} món) ·{' '}
        {money(Math.max(0, estimated - discount))}
      </Button>
      <div className="pos-layout">
        <section className="pos-menu card" aria-label="Thực đơn">
          <div className="card-header">
            <Input
              aria-label="Tìm món"
              placeholder="Tìm món..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="card-body">
            <div className="sales-category-chips" role="group" aria-label="Danh mục món">
              <button type="button" aria-pressed={!category} onClick={() => setCategory('')}>
                Tất cả
              </button>
              {categories.map(([id, name]) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={category === id}
                  onClick={() => setCategory(id)}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="pos-products">
              {filtered.map((product) => (
                <div className="card" key={product.id}>
                  <div className="card-body">
                    <strong>{product.name}</strong>
                    <p>{money(product.price)}</p>
                    <Button variant="secondary" disabled={disabled} onClick={() => add(product)}>
                      Thêm món
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {catalog.data && filtered.length === 0 && (
              <div className="empty-state">Chưa có món phù hợp.</div>
            )}
          </div>
        </section>
        <section className="card" id={`sales-cart-${tab.id}`} aria-label="Đơn hiện tại">
          <div className="card-header">
            <h2>
              <ShoppingCart size={20} /> {saved ? 'Đơn đang xử lý' : 'Đơn mới'}
            </h2>
          </div>
          <div className="card-body">
            {!saved && (
              <>
                <div>
                  <strong>Loại phục vụ</strong>
                  <div className="sales-choice" role="group" aria-label="Loại phục vụ">
                    {settings.data?.serviceType !== 'DINE_IN' && (
                      <button
                        type="button"
                        aria-pressed={orderType === 'TAKEAWAY'}
                        onClick={() => chooseType('TAKEAWAY')}
                      >
                        Mang đi
                      </button>
                    )}
                    {settings.data?.serviceType !== 'TAKEAWAY' && (
                      <button
                        type="button"
                        aria-pressed={orderType === 'DINE_IN'}
                        onClick={() => chooseType('DINE_IN')}
                      >
                        Dùng tại chỗ
                      </button>
                    )}
                  </div>
                </div>
                {orderType === 'DINE_IN' && (
                  <div>
                    <strong>Cách phục vụ</strong>
                    <div className="sales-choice" role="group" aria-label="Cách phục vụ">
                      {settings.data?.dineInOrderingMode !== 'TABLE_ONLY' && (
                        <button
                          type="button"
                          aria-pressed={orderingMode === 'COUNTER'}
                          onClick={() => {
                            setOrderingMode('COUNTER');
                            setTableId(null);
                          }}
                        >
                          Tại quầy
                        </button>
                      )}
                      {settings.data?.dineInOrderingMode !== 'COUNTER_ONLY' && (
                        <button
                          type="button"
                          aria-pressed={orderingMode === 'TABLE'}
                          onClick={() => setOrderingMode('TABLE')}
                        >
                          Tại bàn
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {orderingMode === 'TABLE' && (
                  <div>
                    <strong>Chọn bàn trống</strong>
                    <div className="sales-table-choices" role="group" aria-label="Chọn bàn trống">
                      {visibleTables.map((table) => (
                        <button
                          type="button"
                          key={table.id}
                          aria-pressed={tableId === table.id}
                          onClick={() => setTableId(table.id)}
                        >
                          {table.name}
                        </button>
                      ))}
                    </div>
                    {visibleTables.length === 0 && (
                      <p role="status">Chưa có bàn trống. Kiểm tra sơ đồ bàn.</p>
                    )}
                  </div>
                )}
                {orderingMode === 'COUNTER' &&
                  settings.data?.counterPaymentPolicy === 'STAFF_CHOICE' && (
                    <div>
                      <strong>Thời điểm thu tiền</strong>
                      <div className="sales-choice" role="group" aria-label="Thời điểm thu tiền">
                        <button
                          type="button"
                          aria-pressed={timing === 'NOW'}
                          onClick={() => setTiming('NOW')}
                        >
                          Thanh toán ngay
                        </button>
                        <button
                          type="button"
                          aria-pressed={timing === 'LATER'}
                          onClick={() => setTiming('LATER')}
                        >
                          Thanh toán sau
                        </button>
                      </div>
                    </div>
                  )}
                {orderingMode === 'COUNTER' &&
                  settings.data?.counterPaymentPolicy !== 'STAFF_CHOICE' && (
                    <p role="status">
                      {timing === 'NOW'
                        ? 'Chi nhánh thu tiền ngay tại quầy.'
                        : 'Chi nhánh lưu đơn và thu tiền sau.'}
                    </p>
                  )}
              </>
            )}
            {saved && (
              <p>
                <strong>Mã đơn:</strong> {saved.id.slice(0, 8)} ·{' '}
                <span
                  className={`badge ${saved.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}
                >
                  {saved.status === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                </span>
              </p>
            )}
            {lines.length === 0 && (
              <div className="empty-state">Chọn món từ thực đơn để bắt đầu.</div>
            )}
            {lines.map((line, index) => {
              const product = products.get(line.menuItemId);
              return (
                <div className="card" key={`${line.menuItemId}-${index}`}>
                  <div className="card-body">
                    <strong>{product?.name ?? line.menuItemId}</strong>
                    <div className="filters-bar">
                      <Button
                        variant="secondary"
                        aria-label={`Giảm số lượng ${product?.name}`}
                        disabled={saved?.status === 'PAID'}
                        onClick={() =>
                          updateLine(
                            index,
                            line.quantity > 1 ? { ...line, quantity: line.quantity - 1 } : null,
                          )
                        }
                      >
                        <Minus size={16} />
                      </Button>
                      <span>{line.quantity}</span>
                      <Button
                        variant="secondary"
                        aria-label={`Tăng số lượng ${product?.name}`}
                        disabled={saved?.status === 'PAID'}
                        onClick={() => updateLine(index, { ...line, quantity: line.quantity + 1 })}
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                    {(product?.modifiers ?? []).map((modifier) => (
                      <label key={modifier.key} style={{ display: 'block' }}>
                        <input
                          type="checkbox"
                          disabled={saved?.status === 'PAID'}
                          checked={line.modifierKeys.includes(modifier.key)}
                          onChange={(event) =>
                            updateLine(index, {
                              ...line,
                              modifierKeys: event.target.checked
                                ? [...line.modifierKeys, modifier.key]
                                : line.modifierKeys.filter((key) => key !== modifier.key),
                            })
                          }
                        />
                        {modifier.name} (+{money(modifier.priceExtra)})
                      </label>
                    ))}
                    <Input
                      aria-label={`Ghi chú ${product?.name}`}
                      placeholder="Ghi chú món"
                      disabled={saved?.status === 'PAID'}
                      value={line.note}
                      onChange={(event) => updateLine(index, { ...line, note: event.target.value })}
                    />
                  </div>
                </div>
              );
            })}
            <label>
              Ghi chú đơn
              <Input
                value={note}
                disabled={saved?.status === 'PAID'}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <label>
              Giảm giá
              <Input
                type="number"
                min={0}
                value={discount}
                disabled={saved?.status === 'PAID'}
                onChange={(event) => setDiscount(Number(event.target.value))}
              />
            </label>
            <p>
              <strong>Ước tính: {money(Math.max(0, estimated - discount))}</strong>
            </p>
            {saved && (
              <p>
                Tổng tiền từ máy chủ: <strong>{money(saved.total)}</strong>
              </p>
            )}
            {!saved && (
              <Button
                disabled={!canSave || save.isPending || (orderingMode === 'TABLE' && !tableId)}
                onClick={() => (timing === 'NOW' ? setConfirmCheckout(true) : save.mutate())}
              >
                {save.isPending
                  ? 'Đang xử lý...'
                  : timing === 'NOW'
                    ? 'Xác nhận thu tiền'
                    : 'Lưu đơn'}
              </Button>
            )}
            {canEdit && (
              <Button variant="secondary" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            )}
            {canEdit && (
              <Button
                disabled={pay.isPending || save.isPending || unsavedChanges}
                onClick={() => setConfirmPayment(true)}
              >
                Xác nhận thanh toán
              </Button>
            )}
            {canEdit && unsavedChanges && <p role="status">Lưu thay đổi trước khi thanh toán.</p>}
            {saved?.status === 'PAID' && (
              <Button variant="secondary" onClick={onClose}>
                Hoàn tất và đóng tab
              </Button>
            )}
            {saved && saved.status !== 'PAID' && (
              <Button variant="secondary" onClick={() => navigate('/app/orders')}>
                Xem danh sách đơn
              </Button>
            )}
          </div>
        </section>
      </div>
      {saved && (
        <Modal
          open={confirmPayment}
          onClose={() => setConfirmPayment(false)}
          title="Xác nhận đã nhận tiền"
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmPayment(false)}>
                Quay lại
              </Button>
              <Button disabled={pay.isPending} onClick={() => pay.mutate()}>
                {pay.isPending ? 'Đang xử lý...' : 'Đã nhận tiền'}
              </Button>
            </>
          }
        >
          <p>
            Đơn {saved.id.slice(0, 8)}: <strong>{money(saved.total)}</strong>
          </p>
          <label>
            Phương thức
            <Select
              value={method}
              onChange={(event) => setMethod(event.target.value as 'CASH' | 'BANK_TRANSFER')}
            >
              <option value="CASH">Tiền mặt</option>
              <option value="BANK_TRANSFER">Chuyển khoản</option>
            </Select>
          </label>
          <p>Chỉ xác nhận sau khi đã nhận đủ tiền.</p>
        </Modal>
      )}
      <Modal
        open={confirmCheckout}
        onClose={() => setConfirmCheckout(false)}
        title="Xác nhận thu tiền ngay"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCheckout(false)}>
              Quay lại
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Đang xử lý...' : 'Đã nhận tiền'}
            </Button>
          </>
        }
      >
        <p>
          Tổng tiền dự kiến: <strong>{money(Math.max(0, estimated - discount))}</strong>
        </p>
        <label>
          Phương thức
          <Select
            value={method}
            onChange={(event) => setMethod(event.target.value as 'CASH' | 'BANK_TRANSFER')}
          >
            <option value="CASH">Tiền mặt</option>
            <option value="BANK_TRANSFER">Chuyển khoản</option>
          </Select>
        </label>
        <p>Máy chủ sẽ kiểm tra lại giá trước khi ghi nhận. Chỉ xác nhận sau khi đã nhận đủ tiền.</p>
      </Modal>
    </div>
  );
}
