import { useContext, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { WorkspaceSessionContext } from '@/features/auth/workspaceContext';
import { api } from '@/services/api';
import {
  createSalesArea,
  createSalesTable,
  fetchSalesAreas,
  fetchSalesTables,
  fetchSalesSettings,
  updateSalesArea,
  updateSalesTable,
  type SalesTable,
} from '@/services/salesWorkflowApi';

const statusName = {
  AVAILABLE: 'Bàn trống',
  OCCUPIED: 'Đang phục vụ',
  DISABLED: 'Ngừng hoạt động',
  RESERVED: 'Đã đặt trước',
  CLEANING: 'Đang dọn',
};
const errorText = (error: unknown) =>
  axios.isAxiosError(error)
    ? (error.response?.data?.message ?? 'Không thể lưu thay đổi.')
    : 'Không thể lưu thay đổi.';
export default function SalesTablesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const client = useQueryClient();
  const context = useContext(WorkspaceSessionContext)?.context;
  const canManage = context?.role === 'MANAGER' || context?.role === 'OWNER';
  const branchId =
    context?.role === 'OWNER' ? (params.get('branchId') ?? '') : (context?.branch?.id ?? '');
  const [areaId, setAreaId] = useState('');
  const [formAreaId, setFormAreaId] = useState('');
  const [selected, setSelected] = useState<SalesTable | null>(null);
  const [action, setAction] = useState<'area' | 'table' | 'edit' | 'disable' | null>(null);
  const [name, setName] = useState('');
  const [seats, setSeats] = useState(4);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
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
  const areas = useQuery({
    queryKey: ['sales-areas', branchId],
    queryFn: () => fetchSalesAreas(branchId),
    enabled: !!branchId,
  });
  const tables = useQuery({
    queryKey: ['sales-tables', branchId],
    queryFn: () => fetchSalesTables(branchId),
    enabled: !!branchId,
    refetchInterval: 15000,
  });
  const settings = useQuery({
    queryKey: ['sales-settings', branchId],
    queryFn: () => fetchSalesSettings(branchId),
    enabled: !!branchId,
  });
  const save = useMutation({
    mutationFn: async () => {
      if (action === 'area') return createSalesArea(name, branchId);
      if (action === 'table')
        return createSalesTable({ areaId: formAreaId, name, seats }, branchId);
      if (action === 'edit' && selected)
        return updateSalesTable(selected.id, { name, seats, areaId: formAreaId }, branchId);
      if (action === 'disable' && selected)
        return updateSalesTable(selected.id, { isActive: !selected.isActive }, branchId);
      throw Error('Chưa chọn thao tác.');
    },
    onSuccess: () => {
      setAction(null);
      setSelected(null);
      setError('');
      setNotice('Đã cập nhật sơ đồ bàn.');
      void client.invalidateQueries({ queryKey: ['sales-tables'] });
      void client.invalidateQueries({ queryKey: ['sales-areas'] });
    },
    onError: (failure) => setError(errorText(failure)),
  });
  const shown = (tables.data ?? []).filter((table) => !areaId || table.areaId === areaId);
  const areaName = (id: string) => areas.data?.find((area) => area.id === id)?.name ?? 'Khu vực';
  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Quản lý bàn</h1>
          <p>Sơ đồ bàn theo trạng thái đơn chưa thanh toán</p>
        </div>
        {canManage && (
          <div className="filters-bar">
            <Button
              variant="secondary"
              onClick={() => {
                setAction('area');
                setName('');
              }}
            >
              Thêm khu vực
            </Button>
            <Button
              onClick={() => {
                setAction('table');
                setName('');
                setSeats(4);
                setFormAreaId(areaId);
              }}
            >
              Thêm bàn
            </Button>
          </div>
        )}
      </div>
      {context?.role === 'OWNER' && (
        <div className="card">
          <div className="card-body">
            <label>
              Chi nhánh
              <Select
                value={branchId}
                onChange={(event) => {
                  setParams({ branchId: event.target.value });
                  setAreaId('');
                  setFormAreaId('');
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
      {!branchId && <div className="empty-state">Chọn chi nhánh để xem sơ đồ bàn.</div>}
      {settings.data &&
        (settings.data.serviceType === 'TAKEAWAY' ||
          settings.data.dineInOrderingMode === 'COUNTER_ONLY') && (
          <div className="error-state" role="status">
            Chi nhánh hiện chưa bật phục vụ tại bàn. Có thể chuẩn bị khu vực và bàn trước khi bật
            cấu hình.
          </div>
        )}
      {notice && (
        <p className="badge badge-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <div className="error-state" role="alert">
          {error}
        </div>
      )}
      <div className="card">
        <div className="card-header">
          <div className="sales-area-chips" role="group" aria-label="Lọc khu vực">
            <button type="button" aria-pressed={!areaId} onClick={() => setAreaId('')}>
              Tất cả khu vực
            </button>
            {areas.data?.map((area) => (
              <button
                type="button"
                key={area.id}
                aria-pressed={areaId === area.id}
                onClick={() => setAreaId(area.id)}
              >
                {area.name}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          {(areas.isLoading || tables.isLoading) && (
            <div className="loading-state" role="status">
              <div className="spinner" />
              Đang tải sơ đồ bàn...
            </div>
          )}
          {(areas.isError || tables.isError) && (
            <div className="error-state" role="alert">
              Không thể tải sơ đồ bàn.
            </div>
          )}
          {tables.data && shown.length === 0 && (
            <div className="empty-state">Khu vực này chưa có bàn.</div>
          )}
          <div className="tables-grid">
            {shown.map((table) => (
              <div className="card" key={table.id}>
                <div className="card-body">
                  <h3>{table.name}</h3>
                  <p>
                    {areaName(table.areaId)} · {table.seats} chỗ
                  </p>
                  <span
                    className={`badge ${table.effectiveStatus === 'AVAILABLE' ? 'badge-success' : table.effectiveStatus === 'OCCUPIED' ? 'badge-warning' : 'badge-default'}`}
                  >
                    {statusName[table.effectiveStatus]}
                  </span>
                  {table.currentOrder && (
                    <p>
                      Đơn {table.currentOrder.id.slice(0, 8)} ·{' '}
                      {new Intl.NumberFormat('vi-VN').format(table.currentOrder.total)} đ · mở lúc{' '}
                      {new Date(table.currentOrder.createdAt).toLocaleTimeString('vi-VN')}
                    </p>
                  )}
                  {table.inconsistent && <p role="alert">Bàn có nhiều đơn mở; cần kiểm tra.</p>}
                  <div className="filters-bar">
                    {table.effectiveStatus === 'AVAILABLE' &&
                      context?.role !== 'OWNER' &&
                      settings.data?.serviceType !== 'TAKEAWAY' &&
                      settings.data?.dineInOrderingMode !== 'COUNTER_ONLY' && (
                        <Button onClick={() => navigate(`/app/pos?tableId=${table.id}`)}>
                          Mở bàn
                        </Button>
                      )}
                    {table.currentOrder && context?.role !== 'OWNER' && (
                      <Button onClick={() => navigate(`/app/pos?order=${table.currentOrder!.id}`)}>
                        Thêm món
                      </Button>
                    )}
                    {table.currentOrder && context?.role !== 'OWNER' && (
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/app/orders?order=${table.currentOrder!.id}`)}
                      >
                        Thanh toán / chuyển bàn
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelected(table);
                          setName(table.name);
                          setSeats(table.seats);
                          setFormAreaId(table.areaId);
                          setAction('edit');
                        }}
                      >
                        Sửa
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        variant="secondary"
                        disabled={table.effectiveStatus === 'OCCUPIED'}
                        onClick={() => {
                          setSelected(table);
                          setAction('disable');
                        }}
                      >
                        {table.isActive ? 'Ngừng dùng' : 'Bật lại'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {canManage && areas.data && areas.data.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Khu vực</h2>
          </div>
          <div className="card-body">
            {areas.data.map((area) => (
              <div className="filters-bar" key={area.id}>
                <span>{area.name}</span>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const next = window.prompt('Tên khu vực', area.name);
                    if (!next || next === area.name) return;
                    try {
                      await updateSalesArea(area.id, { name: next }, branchId);
                      void client.invalidateQueries({ queryKey: ['sales-areas'] });
                      setNotice('Đã đổi tên khu vực.');
                    } catch (failure) {
                      setError(errorText(failure));
                    }
                  }}
                >
                  Đổi tên
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (!window.confirm(`Xác nhận đổi trạng thái khu vực ${area.name}?`)) return;
                    try {
                      await updateSalesArea(area.id, { isActive: !area.isActive }, branchId);
                      void client.invalidateQueries({ queryKey: ['sales-areas'] });
                      setNotice('Đã cập nhật khu vực.');
                    } catch (failure) {
                      setError(errorText(failure));
                    }
                  }}
                >
                  {area.isActive === false ? 'Bật lại' : 'Ngừng dùng'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      {action && (
        <Modal
          open
          onClose={() => setAction(null)}
          title={
            action === 'area'
              ? 'Thêm khu vực'
              : action === 'table'
                ? 'Thêm bàn'
                : action === 'edit'
                  ? 'Sửa bàn'
                  : 'Đổi trạng thái bàn'
          }
          footer={
            <>
              <Button variant="secondary" onClick={() => setAction(null)}>
                Quay lại
              </Button>
              <Button
                disabled={
                  save.isPending ||
                  (action !== 'disable' && (!name.trim() || (action !== 'area' && !formAreaId)))
                }
                onClick={() => save.mutate()}
              >
                {save.isPending ? 'Đang lưu...' : 'Xác nhận'}
              </Button>
            </>
          }
        >
          {action !== 'disable' ? (
            <>
              <label>
                Tên
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              {action !== 'area' && (
                <>
                  <label>
                    Khu vực
                    <Select
                      value={formAreaId}
                      onChange={(event) => setFormAreaId(event.target.value)}
                    >
                      <option value="">Chọn khu vực</option>
                      {areas.data
                        ?.filter((area) => area.isActive !== false)
                        .map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.name}
                          </option>
                        ))}
                    </Select>
                  </label>
                  <label>
                    Số chỗ
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={seats}
                      onChange={(event) => setSeats(Number(event.target.value))}
                    />
                  </label>
                </>
              )}
            </>
          ) : (
            <p>
              Xác nhận {selected?.isActive ? 'ngừng sử dụng' : 'bật lại'} bàn {selected?.name}?
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
