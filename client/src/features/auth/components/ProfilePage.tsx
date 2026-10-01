import { useState } from 'react';
import { KeyRound, LogOut, UserRound } from 'lucide-react';
import {
  PageHeader,
  LoadingState,
  ErrorState,
  SectionCard,
  RoleBadge,
  Avatar,
} from '@/components/common/Foundation';
import { useAuthMe } from '../session';
import '@/features/operations/operations.css';
export function ProfilePage() {
  const me = useAuthMe();
  const [notice, setNotice] = useState('');
  return (
    <>
      <PageHeader title="Hồ sơ cá nhân" description="Thông tin từ phiên đăng nhập của bạn" />
      {me.isPending ? (
        <LoadingState label="Đang tải hồ sơ…" />
      ) : me.isError ? (
        <ErrorState message={me.error.message} onRetry={() => void me.refetch()} />
      ) : (
        <div className="profile-workspace">
          <SectionCard title="Thông tin tài khoản">
            <div className="profile-identity">
              <Avatar name={me.data.user.fullName} />
              <div>
                <h2>{me.data.user.fullName}</h2>
                <RoleBadge role={me.data.membership.role} />
              </div>
              <UserRound size={24} aria-hidden="true" />
            </div>
            <dl className="profile-details">
              <div>
                <dt>Họ và tên</dt>
                <dd>{me.data.user.fullName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{me.data.user.email}</dd>
              </div>
              <div>
                <dt>Số điện thoại</dt>
                <dd>{me.data.user.phone || 'Chưa cập nhật'}</dd>
              </div>
              <div>
                <dt>Doanh nghiệp</dt>
                <dd>{me.data.membership.business.name}</dd>
              </div>
              <div>
                <dt>Chi nhánh</dt>
                <dd>
                  {me.data.membership.branch?.name ??
                    (me.data.membership.role === 'OWNER'
                      ? 'Toàn doanh nghiệp'
                      : 'Chưa được phân công')}
                </dd>
              </div>
            </dl>
          </SectionCard>
          <SectionCard title="Bảo mật tài khoản">
            <p>Quản lý mật khẩu và phiên đăng nhập.</p>
            <div className="profile-actions">
              <button
                className="button button-secondary"
                onClick={() =>
                  setNotice('Đổi mật khẩu chưa khả dụng. Mật khẩu của bạn chưa thay đổi.')
                }
              >
                <KeyRound size={18} aria-hidden="true" />
                Đổi mật khẩu
              </button>
              <button
                className="button button-secondary"
                onClick={() =>
                  setNotice(
                    'Dịch vụ đăng xuất chưa được kết nối. Phiên đăng nhập chưa được kết thúc.',
                  )
                }
              >
                <LogOut size={18} aria-hidden="true" />
                Đăng xuất
              </button>
            </div>
            {notice && (
              <p className="ops-inline-note" role="status">
                {notice}
              </p>
            )}
          </SectionCard>
        </div>
      )}
    </>
  );
}
