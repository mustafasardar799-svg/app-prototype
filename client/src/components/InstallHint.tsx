import { useEffect, useState } from 'react';
import { useT } from '../lib/i18n';
import { IconClose, IconShare } from './Icons';

const DISMISS_KEY = 'eliavit.installHintDismissed';

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS 13+ reports itself as a Mac; the touch points give it away.
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // Safari's own flag — it does not implement display-mode on iOS.
  (window.navigator as { standalone?: boolean }).standalone === true;

/**
 * iOS has no install prompt event, so Safari users have to be told the
 * Share → Add to Home Screen route. Shown once, and never in the installed app.
 */
export function InstallHint() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      return;
    }
    if (isIos() && !isStandalone()) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Dismissal simply will not stick; harmless.
    }
  };

  return (
    <div className="install-hint">
      <IconShare size={20} />
      <div className="body">
        <strong>{t('installTitle')}</strong>
        {t('installBody')}
      </div>
      <button className="close" onClick={dismiss} aria-label={t('dismiss')}>
        <IconClose size={16} />
      </button>
    </div>
  );
}
