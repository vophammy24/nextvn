import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '@/services/api';
import { SectionCard, LoadingState, ErrorState } from '@/components/common/Foundation';
import { DataTable } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
type Invitation = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  branchId: string;
  status: string;
  deliveryStatus: string;
  expiresAt: string;
};
export function OwnerInvitations({
  businessId,
  branches = [],
}: {
  businessId: string;
  branches?: { id: string; name: string }[];
}) {
  const [page, setPage] = useState(1),
    [confirmation, setConfirmation] = useState<Invitation | null>(null),
    [notice, setNotice] = useState('');
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['owner-invitations', businessId, page],
    retry: false,
    queryFn: async ({ signal }) =>
      (
        await api.get<{ data: { invitations: Invitation[]; hasNext: boolean } }>(
          `/business/${businessId}/owner/invitations`,
          { params: { page }, signal },
        )
      ).data.data,
  });
  const mutation = useMutation({
    onMutate: () => setNotice(''),
    mutationFn: ({ id, action }: { id: string; action: 'resend' | 'revoke' }) =>
      api.post(`/business/${businessId}/owner/invitations/${id}/${action}`, {}, { timeout: 45000 }),
    onSuccess: (_response, variables) => {
      setConfirmation(null);
      setNotice(
        variables.action === 'resend'
          ? 'Đã gửi lại lời mời tới máy chủ thư. Liên kết cũ không còn hiệu lực.'
          : 'Đã thu hồi lời mời.',
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['owner-invitations', businessId] }),
  });
  return (
    <SectionCard title="Lời mời thành viên">
      <p>
        Lời mời chưa phải là thành viên hoạt động. Chỉ người nhận đăng nhập đúng email và chấp nhận
        mới được cấp quyền.
      </p>
      <p>
        Muốn đổi vai trò hoặc chi nhánh của lời mời: thu hồi rồi gửi lời mời mới bằng form phía
        trên.
      </p>
      {notice && <p role="status">{notice}</p>}
      {mutation.isError && (
        <ErrorState
          message={
            isAxiosError(mutation.error)
              ? mutation.error.response?.data?.message
              : 'Không thể cập nhật lời mời.'
          }
        />
      )}
      {query.isPending ? (
        <LoadingState />
      ) : query.isError || !query.data || !Array.isArray(query.data.invitations) ? (
        <ErrorState
          message="Không thể tải lời mời. Danh sách thành viên vẫn được giữ nguyên."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <DataTable
            caption="Lời mời thành viên"
            rows={query.data.invitations}
            rowKey={(r) => r.id}
            emptyMessage="Chưa có lời mời"
            columns={[
              {
                key: 'email',
                header: 'Người nhận',
                render: (r) => (
                  <>
                    {r.fullName}
                    <p>{r.email}</p>
                  </>
                ),
              },
              {
                key: 'role',
                header: 'Vai trò',
                render: (r) => (r.role === 'MANAGER' ? 'Quản lý' : 'Nhân viên'),
              },
              {
                key: 'branch',
                header: 'Chi nhánh',
                render: (r) =>
                  branches.find((b) => b.id === r.branchId)?.name ?? 'Chi nhánh đã được gán',
              },
              {
                key: 'status',
                header: 'Trạng thái',
                render: (r) => (
                  <Badge
                    tone={
                      r.status === 'ACCEPTED'
                        ? 'success'
                        : r.deliveryStatus === 'FAILED'
                          ? 'danger'
                          : 'neutral'
                    }
                  >
                    {r.status === 'ACCEPTED'
                      ? 'Đã chấp nhận'
                      : r.status === 'REVOKED'
                        ? 'Đã thu hồi'
                        : Date.parse(r.expiresAt) <= Date.now()
                          ? 'Đã hết hạn'
                          : r.deliveryStatus === 'SENT'
                            ? 'Đã gửi — chờ chấp nhận'
                            : r.deliveryStatus === 'FAILED'
                              ? 'Chưa xác nhận gửi được'
                              : 'Đang gửi / cần kiểm tra lại'}
                  </Badge>
                ),
              },
              {
                key: 'expires',
                header: 'Hết hạn',
                render: (r) =>
                  new Date(r.expiresAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
              },
              {
                key: 'actions',
                header: 'Thao tác',
                render: (r) =>
                  r.status !== 'ACCEPTED' ? (
                    <div className="page-actions">
                      <Button
                        variant="secondary"
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate({ id: r.id, action: 'resend' })}
                      >
                        Gửi lại
                      </Button>
                      {r.status !== 'REVOKED' && (
                        <Button
                          variant="danger"
                          disabled={mutation.isPending}
                          onClick={() => {
                            mutation.reset();
                            setConfirmation(r);
                          }}
                        >
                          Thu hồi
                        </Button>
                      )}
                    </div>
                  ) : (
                    'Đã trở thành thành viên'
                  ),
              },
            ]}
          />
          <nav className="pagination" aria-label="Phân trang lời mời">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Trước
            </Button>
            <span>Trang {page}</span>
            <Button
              variant="secondary"
              disabled={!query.data.hasNext}
              onClick={() => setPage(page + 1)}
            >
              Sau
            </Button>
          </nav>
        </>
      )}
      <Modal
        open={!!confirmation}
        title="Thu hồi lời mời"
        onClose={() => {
          if (!mutation.isPending) setConfirmation(null);
        }}
        footer={
          <Button
            variant="danger"
            loading={mutation.isPending}
            onClick={() => {
              if (confirmation) mutation.mutate({ id: confirmation.id, action: 'revoke' });
            }}
          >
            Xác nhận thu hồi
          </Button>
        }
      >
        <p>Liên kết đã gửi tới {confirmation?.email} sẽ không còn dùng được.</p>
        {mutation.isError && (
          <ErrorState
            message={
              isAxiosError(mutation.error)
                ? mutation.error.response?.data?.message
                : 'Không thể thu hồi lời mời.'
            }
          />
        )}
      </Modal>
    </SectionCard>
  );
}
