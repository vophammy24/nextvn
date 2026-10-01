import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useWorkspaceQuery } from '@/features/auth/workspaceQuery';
import { useWorkspace } from '@/features/auth/workspaceContext';
import { api } from '@/services/api';
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  SectionCard,
  StatCard,
} from '@/components/common/Foundation';
import { DataTable } from '@/components/common/DataTable';
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/format';
import '@/features/inventory/integration.css';
import '@/features/manager/manager.css';
const summarySchema = z.object({
  branches: z.array(
    z.object({
      branch: z.object({ id: z.string(), name: z.string() }),
      asOf: z.string(),
      lowStockCount: z.number(),
      nearExpiryCount: z.number(),
      inventoryValue: z.number(),
      ingredients: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          unit: z.string(),
          stock: z.number(),
          minimum: z.number(),
        }),
      ),
      consumptionLast30Days: z.array(
        z.object({
          ingredientId: z.string(),
          name: z.string(),
          unit: z.string(),
          quantity: z.number(),
          estimatedCost: z.number(),
        }),
      ),
    }),
  ),
});
function OwnerSummary() {
  const { context } = useWorkspace();
  const businessId = context.business.id;
  const query = useQuery({
    queryKey: ['inventory-summary', businessId],
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return summarySchema.parse(
          (
            await api.get<unknown>(
              `/business/${encodeURIComponent(businessId)}/inventory/summary`,
              { signal },
            )
          ).data,
        );
      } catch {
        throw new Error('Không thể tải tổng hợp kho. Vui lòng thử lại.');
      }
    },
  });
  if (query.isPending) return <LoadingState />;
  if (query.isError)
    return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
  if (!query.data.branches.length) return <EmptyState title="Chưa có dữ liệu kho chi nhánh" />;
  return (
    <div className="manager-workspace">
      {query.data.branches.map((row) => (
        <SectionCard key={row.branch.id} title={row.branch.name}>
          <p>Cập nhật: {formatDateTime(row.asOf)}</p>
          <div className="manager-recipe-kpis">
            <StatCard
              label="Nguyên liệu sắp hết / hết hàng"
              value={formatNumber(row.lowStockCount)}
            />
            <StatCard label="Nguyên liệu sắp hết hạn" value={formatNumber(row.nearExpiryCount)} />
            <StatCard label="Giá trị tồn kho ước tính" value={formatCurrency(row.inventoryValue)} />
          </div>
          <DataTable
            caption={`Tồn kho ${row.branch.name}`}
            rows={row.ingredients}
            rowKey={(i) => i.id}
            columns={[
              { key: 'name', header: 'Nguyên liệu', render: (i) => i.name },
              { key: 'unit', header: 'Đơn vị', render: (i) => i.unit },
              {
                key: 'stock',
                header: 'Tồn hiện tại',
                numeric: true,
                render: (i) => formatNumber(i.stock),
              },
              {
                key: 'minimum',
                header: 'Tồn tối thiểu',
                numeric: true,
                render: (i) => formatNumber(i.minimum),
              },
            ]}
          />
          <DataTable
            caption={`Tiêu thụ 30 ngày · ${row.branch.name}`}
            rows={row.consumptionLast30Days}
            rowKey={(i) => i.ingredientId}
            columns={[
              { key: 'name', header: 'Nguyên liệu tiêu thụ trong 30 ngày', render: (i) => i.name },
              {
                key: 'quantity',
                header: 'Số lượng',
                numeric: true,
                render: (i) => `${formatNumber(i.quantity)} ${i.unit}`,
              },
              {
                key: 'cost',
                header: 'Chi phí ước tính',
                numeric: true,
                render: (i) => formatCurrency(i.estimatedCost),
              },
            ]}
          />
        </SectionCard>
      ))}
      <p>
        Giá trị theo đơn giá bình quân, bao gồm lô quá hạn chưa hủy. Đây là số liệu ước tính vận
        hành.
      </p>
    </div>
  );
}
export default function InventoryOverviewPage() {
  const workspace = useWorkspaceQuery();
  return (
    <div className="inventory-integration">
      <PageHeader
        title="Tổng quan kho doanh nghiệp"
        description="Theo dõi tồn kho các chi nhánh · Chỉ xem"
      />
      {workspace.isPending ? (
        <LoadingState />
      ) : workspace.isError ? (
        <ErrorState message={workspace.error.message} onRetry={() => void workspace.refetch()} />
      ) : workspace.data.role !== 'OWNER' ? (
        <ErrorState message="Bạn không có quyền xem tổng hợp kho doanh nghiệp." />
      ) : (
        <OwnerSummary />
      )}
    </div>
  );
}
