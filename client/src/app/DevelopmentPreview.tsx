import { useNavigate } from 'react-router-dom';
import { getNavigation, type BusinessRole } from './navigation';
import { useWorkspaceStore } from '@/stores/workspace';
import { copy } from '@/locales/vi';
export function DevelopmentPreview() {
  const role = useWorkspaceStore((state) => state.previewRole);
  const setPreviewRole = useWorkspaceStore((state) => state.setPreviewRole);
  const navigate = useNavigate();
  return (
    <aside className="development-preview" aria-label="Công cụ phát triển">
      <label htmlFor="preview-role">Xem trước giao diện · Không phải đăng nhập</label>
      <select
        id="preview-role"
        value={role ?? ''}
        onChange={(event) => {
          const nextRole = event.target.value as BusinessRole | '';
          setPreviewRole(nextRole || null);
          navigate(nextRole ? getNavigation(nextRole)[0].path : '/app');
        }}
      >
        <option value="">Sử dụng phiên đăng nhập thực</option>
        {Object.entries(copy.roles).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </aside>
  );
}
