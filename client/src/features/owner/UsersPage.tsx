import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { DataTable } from '@/components/common/DataTable';
import { SearchInput, StatusBadge, RoleBadge, SectionCard } from '@/components/common/Foundation';
import { useWorkspace } from '@/features/auth/workspaceContext';
import { formatDateTime } from '@/lib/format';
import { canEditUser, userSchema } from './model';
import type { OwnerData, BusinessUser } from './types';
function UserEditor({
  data,
  target,
  close,
}: {
  data: OwnerData;
  target: BusinessUser | null;
  close: () => void;
}) {
  const { context } = useWorkspace();
  const [name, setName] = useState(target?.name ?? '');
  const [email, setEmail] = useState(target?.email ?? '');
  const [role, setRole] = useState(target?.role ?? 'STAFF');
  const [branchId, setBranchId] = useState(target?.branchId ?? '');
  const [notice, setNotice] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (
      context.role !== 'OWNER' ||
      (target && !canEditUser(context.role, context.user.id, target, data.users))
    ) {
      setNotice('Bạn không có quyền thay đổi tài khoản này.');
      return;
    }
    const result = userSchema.safeParse({ name, email, role, branchId });
    if (!result.success) {
      setNotice(result.error.issues[0].message);
      return;
    }
    if (role !== 'OWNER' && !data.branches.some((branch) => branch.id === branchId)) {
      setNotice('Chi nhánh không thuộc doanh nghiệp hiện tại.');
      return;
    }
    setNotice('Lưu người dùng chưa khả dụng. Chưa tạo tài khoản hoặc thay đổi phân quyền.');
  };
  return (
    <SectionCard title={target ? 'Chỉnh sửa người dùng' : 'Thêm người dùng'}>
      <form className="owner-form" noValidate onSubmit={submit} aria-label="Thông tin người dùng">
        <label>
          Họ tên
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Vai trò
          <select
            value={role}
            onChange={(event) => {
              const next = event.target.value as BusinessUser['role'];
              setRole(next);
              if (next === 'OWNER') setBranchId('');
            }}
          >
            <option value="STAFF">Nhân viên</option>
            <option value="MANAGER">Quản lý</option>
            <option value="OWNER">Chủ doanh nghiệp</option>
          </select>
        </label>
        <label>
          Chi nhánh
          <select
            value={branchId}
            disabled={role === 'OWNER'}
            onChange={(event) => setBranchId(event.target.value)}
          >
            <option value="">{role === 'OWNER' ? 'Toàn doanh nghiệp' : 'Chọn chi nhánh'}</option>
            {data.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        {role === 'OWNER' && (
          <p className="owner-notice owner-full">
            Chủ doanh nghiệp có quyền quản trị toàn bộ chi nhánh, người dùng, gói dịch vụ và cài
            đặt.
          </p>
        )}
        {notice && (
          <p role="alert" className="owner-notice owner-full">
            {notice}
          </p>
        )}
        <div className="owner-form-actions">
          <button className="button" type="submit">
            Lưu người dùng
          </button>
          <button className="button button-secondary" type="button" onClick={close}>
            Hủy
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
export function Users({ data }: { data: OwnerData }) {
  const { context } = useWorkspace();
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<BusinessUser | null | undefined>(undefined);
  const [disable, setDisable] = useState<BusinessUser | null>(null);
  const [notice, setNotice] = useState('');
  const allowed = (user: BusinessUser) =>
    canEditUser(context.role, context.user.id, user, data.users);
  const rows = data.users.filter((user) =>
    `${user.name} ${user.email}`
      .toLocaleLowerCase('vi-VN')
      .includes(search.trim().toLocaleLowerCase('vi-VN')),
  );
  return (
    <>
      <div className="owner-scope">
        <SearchInput label="Tìm người dùng" value={search} onChange={setSearch} />
        <button
          className="button"
          onClick={() => {
            setEditor(null);
            setDisable(null);
            setNotice('');
          }}
        >
          <Plus size={17} aria-hidden="true" />
          Thêm người dùng
        </button>
      </div>
      {editor !== undefined && (
        <UserEditor
          key={editor?.id ?? 'new'}
          data={data}
          target={editor}
          close={() => setEditor(undefined)}
        />
      )}
      {disable && (
        <SectionCard title={`Vô hiệu hóa ${disable.name}?`}>
          <p>
            Người dùng sẽ không thể truy cập doanh nghiệp khi thao tác này được kết nối. Hiện chưa
            có thay đổi nào.
          </p>
          <div className="owner-form-actions">
            <button
              className="button"
              onClick={() => {
                setNotice(
                  allowed(disable)
                    ? 'Vô hiệu hóa chưa khả dụng. Trạng thái người dùng chưa thay đổi.'
                    : 'Không thể vô hiệu hóa tài khoản này.',
                );
                setDisable(null);
              }}
            >
              Xác nhận vô hiệu hóa
            </button>
            <button className="button button-secondary" onClick={() => setDisable(null)}>
              Hủy
            </button>
          </div>
        </SectionCard>
      )}
      {notice && (
        <p className="owner-notice" role="status">
          {notice}
        </p>
      )}
      <SectionCard title="Người dùng trong doanh nghiệp">
        <DataTable
          caption="Danh sách người dùng và phân quyền"
          rows={rows}
          rowKey={(row) => row.id}
          columns={[
            { key: 'name', header: 'Họ tên', render: (row) => row.name },
            { key: 'email', header: 'Email', render: (row) => row.email },
            { key: 'role', header: 'Vai trò', render: (row) => <RoleBadge role={row.role} /> },
            {
              key: 'branch',
              header: 'Chi nhánh',
              render: (row) =>
                row.role === 'OWNER'
                  ? 'Toàn doanh nghiệp'
                  : data.branches.find((branch) => branch.id === row.branchId)?.name,
            },
            {
              key: 'active',
              header: 'Hoạt động gần nhất',
              render: (row) => formatDateTime(row.lastActive),
            },
            {
              key: 'status',
              header: 'Trạng thái',
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'actions',
              header: 'Thao tác',
              render: (row) => (
                <div className="owner-row-actions">
                  <button
                    className="owner-link"
                    aria-label={`Chỉnh sửa: ${row.name}`}
                    disabled={!allowed(row)}
                    onClick={() => {
                      setEditor(row);
                      setDisable(null);
                    }}
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    className="owner-link owner-danger"
                    aria-label={`Vô hiệu hóa: ${row.name}`}
                    disabled={!allowed(row) || row.status === 'INACTIVE'}
                    onClick={() => {
                      setDisable(row);
                      setEditor(undefined);
                    }}
                  >
                    Vô hiệu hóa
                  </button>
                </div>
              ),
            },
          ]}
        />
        <p className="owner-muted">
          Không chỉnh sửa hoặc vô hiệu hóa chính mình và chủ doanh nghiệp đang hoạt động cuối cùng.
        </p>
      </SectionCard>
      <SectionCard title="Tóm tắt quyền truy cập">
        <div className="owner-permissions">
          <article>
            <h3>Nhân viên</h3>
            <p>Bán hàng, đơn hàng, khu vực / bàn, ca làm và hồ sơ cá nhân.</p>
          </article>
          <article>
            <h3>Quản lý</h3>
            <p>Vận hành cửa hàng, kho, công thức, báo cáo và nhân viên trong chi nhánh.</p>
          </article>
          <article>
            <h3>Chủ doanh nghiệp</h3>
            <p>
              Phân tích toàn doanh nghiệp, tất cả chi nhánh, người dùng, gói dịch vụ, khuyến mãi và
              cài đặt doanh nghiệp.
            </p>
          </article>
        </div>
      </SectionCard>
    </>
  );
}
