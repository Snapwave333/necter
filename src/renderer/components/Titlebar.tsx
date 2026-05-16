import { Minus, Square, X, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import nectarLockupWhite from '../assets/nectar-lockup-white.png';
import nectarLockupBlack from '../assets/nectar-lockup-black.png';
import { useAppStore } from '../store';

const isMac = typeof window !== 'undefined' && window.electronAPI?.platform === 'darwin';

export function Titlebar() {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);
  const settings = useAppStore((s) => s.settings);
  const systemDarkMode = useAppStore((s) => s.systemDarkMode);
  const isLight = settings.theme === 'light' || (settings.theme === 'system' && !systemDarkMode);

  const handleMinimize = () => {
    window.electronAPI?.window.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.window.maximize();
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    window.electronAPI?.window.close();
  };

  return (
    <div className="h-10 bg-background/82 backdrop-blur-xl border-b border-border-muted flex items-center titlebar-drag shrink-0 relative shadow-[0_1px_0_var(--color-border-subtle)]">
      {/* macOS: left padding for traffic lights */}
      {isMac && <div className="pl-20" />}

      {/* Centered wordmark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src={isLight ? nectarLockupBlack : nectarLockupWhite}
          alt="Nectar"
          className="h-4 object-contain opacity-75"
          draggable={false}
        />
      </div>

      {/* Window Controls (Windows/Linux only — macOS uses native traffic lights) */}
      {!isMac && (
        <div className="ml-auto flex items-center titlebar-no-drag h-full">
          <button
            onClick={handleMinimize}
            className="w-12 h-full flex items-center justify-center hover:bg-surface/80 transition-colors"
            title={t('window.minimize')}
          >
            <Minus className="w-3.5 h-3.5 text-text-muted" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-12 h-full flex items-center justify-center hover:bg-surface/80 transition-colors"
            title={isMaximized ? t('window.restore') : t('window.maximize')}
          >
            {isMaximized ? (
              <Copy className="w-3 h-3 text-text-muted" />
            ) : (
              <Square className="w-3 h-3 text-text-muted" />
            )}
          </button>
          <button
            onClick={handleClose}
            className="w-12 h-full flex items-center justify-center hover:bg-red-500/90 transition-colors group"
            title={t('window.close')}
          >
            <X className="w-3.5 h-3.5 text-text-muted group-hover:text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
