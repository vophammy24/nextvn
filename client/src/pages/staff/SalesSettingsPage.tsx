import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import { WorkspaceSessionContext } from '@/features/auth/workspaceContext';
import { api } from '@/services/api';
import {
  fetchSalesSettings,
  fetchSalesAreas,
  fetchSalesTables,
  updateSalesSettings,
  type SalesSettings,
} from '@/services/salesWorkflowApi';

export default function SalesSettingsPage() {
  const context = useContext(WorkspaceSessionContext)?.context;
  const client = useQueryClient();
  const [selectedBranchId, setBranchId] = useState('');
  const branchId = context?.role === 'MANAGER' ? (context.branch?.id ?? '') : selectedBranchId;
  const [form, setForm] = useState<SalesSettings | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const allowed = context?.role === 'OWNER' || context?.role === 'MANAGER';
  const branches = useQuery({
    queryKey: ['owner-sales-branches', context?.business.id],
    queryFn: async () =>
      (
        await api.get<{ data: { id: string; name: string; isActive: boolean }[] }>(
          `/business/${context!.business.id}/owner/branches`,
        )
      ).data.data,
    enabled: context?.role === 'OWNER',
  });
  const settings = useQuery({
    queryKey: ['sales-settings', branchId],
    queryFn: () => fetchSalesSettings(branchId),
    enabled: !!branchId && allowed,
  });
  const tableMode =
    !!form && form.serviceType !== 'TAKEAWAY' && form.dineInOrderingMode !== 'COUNTER_ONLY';
  const areaSummary = useQuery({
    queryKey: ['sales-areas', branchId],
    queryFn: () => fetchSalesAreas(branchId),
    enabled: !!branchId && tableMode,
  });
  const tableSummary = useQuery({
    queryKey: ['sales-tables', branchId],
    queryFn: () => fetchSalesTables(branchId),
    enabled: !!branchId && tableMode,
  });
  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);
  const save = useMutation({
    mutationFn: () => updateSalesSettings(branchId, form!),
    onSuccess: () => {
      setError('');
      setNotice('Đã lưu cấu hình bán hàng.');
      void client.invalidateQueries({ queryKey: ['sales-settings'] });
    },
    onError: (failure) =>
      setError(
        axios.isAxiosError(failure)
          ? (failure.response?.data?.message ?? 'Không thể lưu cấu hình.')
          : 'Không thể lưu cấu hình.',
      ),
  });
  if (!context)
    return (
      <div className="page-content">
        <div className="loading-state" role="status">
          Đang tải phiên làm việc...
        </div>
      </div>
    );
  if (!allowed)
    return (
      <div className="page-content">
        <div className="error-state" role="alert">
          Bạn không có quyền cấu hình bán hàng.
        </div>
      </div>
    );
  return (
    <div className="page-content sales-settings">
      <div className="page-header">
        <div>
          <h1>Cấu hình bán hàng</h1>
          <p>Quy định cách phục vụ và thời điểm thu tiền theo chi nhánh</p>
        </div>
      </div>
      {context.role === 'OWNER' && (
        <div className="card">
          <div className="card-body">
            <label>
              Chi nhánh
              <Select
                value={branchId}
                onChange={(event) => {
                  setBranchId(event.target.value);
                  setForm(null);
                }}
              >
                <option value="">Chọn chi nhánh</option>
                {branches.data
                  ?.filter((branch) => branch.isActive)
                  .map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
              </Select>
            </label>
            {branches.isError && (
              <div className="error-state" role="alert">
                Không thể tải chi nhánh.
              </div>
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="error-state" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <p className="badge badge-success" role="status">
          {notice}
        </p>
      )}
      {settings.isLoading && (
        <div className="loading-state" role="status">
          <div className="spinner" />
          Đang tải cấu hình...
        </div>
      )}
      {settings.isError && (
        <div className="error-state" role="alert">
          Không thể tải cấu hình bán hàng.
        </div>
      )}
      {form && (
        <div className="card">
          <div className="card-body">
            <div>
              <h2>1. Loại phục vụ</h2>
              <div className="sales-choice" role="group" aria-label="Loại phục vụ">
                {(
                  [
                    ['TAKEAWAY', 'Chỉ mang đi'],
                    ['DINE_IN', 'Chỉ dùng tại chỗ'],
                    ['BOTH', 'Cả hai'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={form.serviceType === value}
                    onClick={() =>
                      setForm({
                        ...form,
                        serviceType: value,
                        ...(value === 'TAKEAWAY' ? { dineInOrderingMode: 'COUNTER_ONLY' } : {}),
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {form.serviceType === 'TAKEAWAY' && (
                <p>Chế độ gọi món tại chỗ sẽ được đặt về “Tại quầy” khi lưu.</p>
              )}
            </div>
            {form.serviceType !== 'TAKEAWAY' && (
              <div>
                <h2>2. Gọi món tại chỗ</h2>
                <div className="sales-choice" role="group" aria-label="Gọi món tại chỗ">
                  {(
                    [
                      ['COUNTER_ONLY', 'Tại quầy'],
                      ['TABLE_ONLY', 'Tại bàn'],
                      ['BOTH', 'Cả hai'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={form.dineInOrderingMode === value}
                      onClick={() =>
                        setForm({
                          ...form,
                          dineInOrderingMode: value,
                          ...(value === 'TABLE_ONLY'
                            ? { counterPaymentPolicy: 'IMMEDIATE_ONLY' }
                            : {}),
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {form.dineInOrderingMode === 'TABLE_ONLY' && (
                  <p>
                    Đơn tại bàn luôn thu tiền sau; chính sách quầy sẽ được đặt “Thu tiền ngay” khi
                    lưu.
                  </p>
                )}
              </div>
            )}
            {(form.serviceType === 'TAKEAWAY' || form.dineInOrderingMode !== 'TABLE_ONLY') && (
              <div>
                <h2>3. Thanh toán tại quầy</h2>
                <div className="sales-choice" role="group" aria-label="Thanh toán tại quầy">
                  {(
                    [
                      ['IMMEDIATE_ONLY', 'Thu tiền ngay'],
                      ['PAY_LATER_ALLOWED', 'Ghi đơn, thu tiền sau'],
                      ['STAFF_CHOICE', 'Nhân viên chọn'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={form.counterPaymentPolicy === value}
                      onClick={() => setForm({ ...form, counterPaymentPolicy: value })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p>
              Đơn tại bàn luôn được ghi chờ thanh toán. Hệ thống chặn tắt phục vụ tại bàn khi còn
              đơn mở.
            </p>
            {form.serviceType !== 'TAKEAWAY' && form.dineInOrderingMode !== 'COUNTER_ONLY' && (
              <div className="card">
                <div className="card-body">
                  <h2>4. Khu vực và bàn</h2>
                  <p>
                    {areaSummary.data?.length ?? '…'} khu vực · {tableSummary.data?.length ?? '…'}{' '}
                    bàn
                  </p>
                  <Link to={`/app/tables?branchId=${branchId}`}>
                    Xem, thêm hoặc sửa khu vực và bàn
                  </Link>
                </div>
              </div>
            )}
            <div className="card" role="status">
              <div className="card-body">
                <strong>5. Với cấu hình này, nhân viên có thể:</strong>
                {form.serviceType === 'TAKEAWAY'
                  ? ' Tạo đơn mang đi.'
                  : form.dineInOrderingMode === 'TABLE_ONLY'
                    ? ' Tạo đơn tại bàn, chọn bàn trống và thu tiền khi khách kết thúc.'
                    : ' Bán tại quầy; đơn tại bàn được ghi chờ thanh toán khi chế độ bàn được bật.'}
              </div>
            </div>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
