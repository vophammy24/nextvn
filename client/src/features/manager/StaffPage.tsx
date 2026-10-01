import { useState, type FormEvent } from 'react';
import { Plus, Pencil, UserRoundX } from 'lucide-react';
import { SearchInput, StatusBadge, SectionCard } from '@/components/common/Foundation';
import { DataTable } from '@/components/common/DataTable';
import { useWorkspace } from '@/features/auth/workspaceContext';
import { copy } from '@/locales/vi';
import { formatDateTime } from '@/lib/format';
import { canManageStaff, staffDraftSchema } from './model';
import type { ManagerData, StaffMember } from './types';
function StaffEditor({ target, onClose }: { target: StaffMember | null; onClose: () => void }) {
  const { context } = useWorkspace();
  const [name, setName] = useState(target?.name ?? '');
  const [email, setEmail] = useState(target?.email ?? '');
  const [role, setRole] = useState(target?.role ?? 'STAFF');
  const [message, setMessage] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (
      context.role !== 'MANAGER' ||
      (target && !canManageStaff(context.role, context.user.id, target))
    ) {
      setMessage('Bạn không có quyền thay đổi tài khoản này.');
      return;
    }
    const result = staffDraftSchema.safeParse({ name, email, role });
    setMessage(
      result.success
        ? 'Lưu nhân viên chưa khả dụng. Chưa tạo tài khoản hoặc thay đổi phân quyền.'
        : result.error.issues[0].message,
    );
  };
  return (
    <SectionCard
      title={target ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên'}
      actions={
        <button className="manager-text-button" onClick={onClose}>
          Đóng biểu mẫu
        </button>
      }
    >
      <form className="manager-form" noValidate onSubmit={submit} aria-label="Thông tin nhân viên">
        <label className="manager-field">
          Họ tên
          <input required value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="manager-field">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="manager-field manager-full">
          Vai trò
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as 'STAFF' | 'MANAGER')}
          >
            <option value="STAFF">Nhân viên</option>
            <option value="MANAGER">Quản lý cửa hàng</option>
          </select>
          <small>Quản lý không được cấp vai trò Chủ doanh nghiệp.</small>
        </label>
        {message && (
          <p className="manager-notice manager-full" role="alert">
            {message}
          </p>
        )}
        <button className="button manager-full" type="submit">
          Lưu nhân viên
        </button>
      </form>
    </SectionCard>
  );
}
export function Staff({ data }: { data: ManagerData }) {
  const { context } = useWorkspace();
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<StaffMember | null | undefined>(undefined);
  const [disableTarget, setDisableTarget] = useState<StaffMember | null>(null);
  const [message, setMessage] = useState('');
  const rows = data.staff.filter((member) =>
    `${member.name} ${member.email}`
      .toLocaleLowerCase('vi-VN')
      .includes(search.trim().toLocaleLowerCase('vi-VN')),
  );
  return (
    <>
      <div className="manager-toolbar">
        <SearchInput
          label="Tìm nhân viên"
          placeholder="Tìm theo tên hoặc email..."
          value={search}
          onChange={setSearch}
        />
        <button
          className="button"
          onClick={() => {
            setEditor(null);
            setDisableTarget(null);
          }}
        >
          <Plus size={17} aria-hidden="true" />
          Thêm nhân viên
        </button>
      </div>
      <p className="manager-muted">
        Quyền quản lý giới hạn trong chi nhánh. Tài khoản Chủ doanh nghiệp và tài khoản của chính
        bạn không thể chỉnh sửa tại đây.
      </p>
      {editor !== undefined && (
        <StaffEditor
          key={editor?.id ?? 'new'}
          target={editor}
          onClose={() => setEditor(undefined)}
        />
      )}
      {disableTarget && (
        <SectionCard title="Xác nhận vô hiệu hóa">
          <p>
            Tài khoản được chọn: <strong>{disableTarget.name}</strong>
          </p>
          <div className="manager-actions">
            <button className="button button-secondary" onClick={() => setDisableTarget(null)}>
              Hủy
            </button>
            <button
              className="button button-danger"
              onClick={() => {
                if (!canManageStaff(context.role, context.user.id, disableTarget)) {
                  setMessage('Bạn không có quyền vô hiệu hóa tài khoản này.');
                  return;
                }
                setMessage('Vô hiệu hóa chưa khả dụng. Trạng thái tài khoản chưa thay đổi.');
              }}
            >
              Xác nhận vô hiệu hóa
            </button>
          </div>
        </SectionCard>
      )}
      {message && (
        <p className="manager-notice" role="status">
          {message}
        </p>
      )}
      <DataTable
        caption="Danh sách nhân viên"
        rows={rows}
        rowKey={(member) => member.id}
        columns={[
          { key: 'name', header: 'Họ tên', render: (member) => <strong>{member.name}</strong> },
          { key: 'email', header: 'Email', render: (member) => member.email },
          { key: 'role', header: 'Vai trò', render: (member) => copy.roles[member.role] },
          { key: 'shift', header: 'Ca làm', render: (member) => member.shift },
          {
            key: 'login',
            header: 'Đăng nhập gần nhất',
            render: (member) =>
              member.lastLogin ? formatDateTime(member.lastLogin) : 'Chưa đăng nhập',
          },
          {
            key: 'status',
            header: 'Trạng thái',
            render: (member) => <StatusBadge status={member.status} />,
          },
          {
            key: 'actions',
            header: 'Thao tác',
            render: (member) => {
              const allowed = canManageStaff(context.role, context.user.id, member);
              return (
                <div className="manager-row-actions">
                  <button
                    className="manager-text-button"
                    disabled={!allowed}
                    aria-label={`Chỉnh sửa ${member.name}`}
                    onClick={() => {
                      if (allowed) {
                        setEditor(member);
                        setDisableTarget(null);
                      }
                    }}
                  >
                    <Pencil size={14} aria-hidden="true" />
                    Chỉnh sửa
                  </button>
                  <button
                    className="manager-text-button manager-danger"
                    disabled={!allowed || member.status === 'INACTIVE'}
                    aria-label={`Vô hiệu hóa ${member.name}`}
                    onClick={() => {
                      if (allowed) {
                        setDisableTarget(member);
                        setEditor(undefined);
                        setMessage('');
                      }
                    }}
                  >
                    <UserRoundX size={14} aria-hidden="true" />
                    Vô hiệu hóa
                  </button>
                </div>
              );
            },
          },
        ]}
      />
    </>
  );
}
