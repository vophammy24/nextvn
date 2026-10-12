import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { api } from '@/services/api';
import { env } from '@/config/env';
import { authCopy } from '../copy';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (callback?: (notification: { isNotDisplayed?: () => boolean; isSkippedMoment?: () => boolean }) => void) => void;
        };
      };
    };
  }
}

export function GoogleSignIn() {
  const descriptionId = useId();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientId = env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    const loadSdk = () => {
      const scriptId = 'google-gsi-script';
      const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

      if (existingScript) {
        if (window.google?.accounts?.id) setIsReady(true);
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.accounts?.id) setIsReady(true);
      };
      document.body.appendChild(script);
    };

    if (window.google?.accounts?.id) {
      setIsReady(true);
      return;
    }

    loadSdk();
  }, [clientId]);

  const handleGoogleResponse = async ({ credential }: { credential?: string }) => {
    if (!credential) {
      setError(authCopy.googleUnavailable);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await api.post(
        '/auth/google',
        { credential },
        {
          withCredentials: true,
        },
      );
      navigate('/app');
    } catch {
      setError('Không thể xác thực Google. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClick = () => {
    if (!clientId || !window.google?.accounts?.id) {
      setError(authCopy.googleUnavailable);
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.prompt((notification) => {
      if (notification?.isNotDisplayed?.()) {
        setError(authCopy.googleUnavailable);
      }
      if (notification?.isSkippedMoment?.()) {
        setError(authCopy.googleUnavailable);
      }
    });
  };

  const disabled = !clientId || !isReady || isSubmitting;
  return (
    <div className="auth-google">
      <button
        type="button"
        className="auth-button auth-button-google"
        disabled={disabled}
        aria-describedby={descriptionId}
        onClick={handleClick}
      >
        <span className="auth-google-mark" aria-hidden="true">
          G
        </span>
        {isSubmitting ? 'Đang đăng nhập…' : 'Tiếp tục với Google'}
      </button>
      <p id={descriptionId} className="auth-notice">
        <Info size={16} aria-hidden="true" />
        <span>
          {error ??
            (clientId ? 'Bạn sẽ được chuyển hướng sau khi xác thực Google.' : authCopy.googleUnavailable)}
        </span>
      </p>
    </div>
  );
}
