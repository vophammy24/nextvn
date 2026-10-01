import { useId } from 'react';
import { Info } from 'lucide-react';
import { authCopy } from '../copy';

export function GoogleSignIn() {
  const descriptionId = useId();
  return (
    <div className="auth-google">
      <button
        type="button"
        className="auth-button auth-button-google"
        disabled
        aria-describedby={descriptionId}
      >
        <span className="auth-google-mark" aria-hidden="true">
          G
        </span>
        Tiếp tục với Google
      </button>
      <p id={descriptionId} className="auth-notice">
        <Info size={16} aria-hidden="true" />
        <span>{authCopy.googleUnavailable}</span>
      </p>
    </div>
  );
}
