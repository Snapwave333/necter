import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { GlobalNotice, GlobalNoticeAction } from '../store';

interface Props {
  notice: GlobalNotice | null;
  onDismiss: () => void;
  onAction: (action: GlobalNoticeAction) => void;
}

const noticeToneClass: Record<
  GlobalNotice['type'],
  { border: string; text: string; icon: string; Icon: typeof Info }
> = {
  info: {
    border: 'border-border-subtle',
    text: 'text-text-primary',
    icon: 'text-accent',
    Icon: Info,
  },
  warning: {
    border: 'border-warning/35',
    text: 'text-text-primary',
    icon: 'text-warning',
    Icon: AlertTriangle,
  },
  error: {
    border: 'border-error/35',
    text: 'text-text-primary',
    icon: 'text-error',
    Icon: XCircle,
  },
  success: {
    border: 'border-success/35',
    text: 'text-text-primary',
    icon: 'text-success',
    Icon: CheckCircle2,
  },
};

export function GlobalNoticeToast({ notice, onDismiss, onAction }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!notice) {
    return null;
  }

  const tone = noticeToneClass[notice.type];
  const NoticeIcon = tone.Icon;
  const message = notice.messageKey ? t(notice.messageKey, notice.messageValues) : notice.message;
  const actionLabel =
    notice.actionLabel ||
    (notice.action === 'open_api_settings' ? t('api.openSettingsAction') : '');
  const noticeAction = notice.action;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-50">
      <div
        className={`max-w-sm overflow-hidden rounded-[1.35rem] border bg-surface/92 backdrop-blur-xl shadow-elevated ${tone.border}`}
      >
        <div className="flex items-start gap-3 px-4 py-3.5">
          <div
            className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-background/70 ${tone.icon}`}
          >
            <NoticeIcon className="h-4 w-4" />
          </div>
          <div className={`flex-1 text-sm leading-relaxed ${tone.text}`}>{message}</div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {noticeAction && actionLabel && (
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={() => onAction(noticeAction)}
              className="w-full rounded-xl border border-accent/40 bg-accent/10 px-3 py-2.5 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
