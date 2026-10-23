import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari standalone check
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // If prompt event not available (e.g. manual Android Chrome or iOS), toggle guide
      setShowGuide((prev) => !prev);
    }
  };

  if (isInstalled || isDismissed) return null;

  return (
    <aside className="install-banner" aria-label="Install App Banner">
      <div className="install-banner-content">
        <Smartphone size={20} className="install-icon text-accent" />
        <div className="install-banner-text">
          <span className="install-title">Install Daily Budget</span>
          <span className="install-desc">Works 100% offline directly from your home screen</span>
        </div>
      </div>

      <div className="install-banner-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleInstallClick}
        >
          <Download size={14} />
          <span>Install</span>
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => setIsDismissed(true)}
          aria-label="Dismiss install banner"
        >
          <X size={16} />
        </button>
      </div>

      {showGuide && (
        <div className="install-manual-guide">
          <p>
            To install on Android Chrome: Tap the top-right <strong>⋮ (Menu)</strong> and select{' '}
            <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
          </p>
        </div>
      )}
    </aside>
  );
};
