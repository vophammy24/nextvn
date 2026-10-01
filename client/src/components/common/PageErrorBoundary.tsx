import { Component, type ReactNode } from 'react';
import { ErrorState } from './Foundation';
export class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <ErrorState
        message="Không thể hiển thị trang. Vui lòng tải lại để thử lại."
        onRetry={() => window.location.reload()}
      />
    ) : (
      this.props.children
    );
  }
}
