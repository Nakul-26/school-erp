/**
 * PWA Install Service
 * 
 * Captures the `beforeinstallprompt` event globally so it can be triggered
 * from anywhere in the app (e.g., Profile page install button) — even after
 * the user dismissed the auto-banner.
 */

let _deferredPrompt: any = null;

export function capturePwaInstallPrompt(event: Event) {
  event.preventDefault();
  _deferredPrompt = event;
}

export function canInstallPwa(): boolean {
  return !!_deferredPrompt && !isPwaInstalled();
}

export function isPwaInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
}

export async function triggerPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!_deferredPrompt) return 'unavailable';

  _deferredPrompt.prompt();
  const { outcome } = await _deferredPrompt.userChoice;

  // Event can only be used once — clear it
  _deferredPrompt = null;

  return outcome === 'accepted' ? 'accepted' : 'dismissed';
}
