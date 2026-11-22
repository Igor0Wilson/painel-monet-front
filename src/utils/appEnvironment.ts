export function isRunningInInstalledApp(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.removeItem('pm_app_installed');
    sessionStorage.removeItem('pm_app_installed');
  } catch {
    // Ignore storage access errors in private mode
  }

  const win = window as unknown as {
    __PM_RUNNING_IN_APP__?: boolean;
    ReactNativeWebView?: unknown;
  };

  if (win.__PM_RUNNING_IN_APP__) {
    return true;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('app') === '1' || params.get('standalone') === '1') {
    win.__PM_RUNNING_IN_APP__ = true;
    return true;
  }

  const detected =
    Boolean((window.navigator as unknown as { standalone?: boolean }).standalone) ||
    Boolean(
      typeof window.matchMedia === 'function' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          window.matchMedia('(display-mode: fullscreen)').matches),
    ) ||
    Boolean(win.ReactNativeWebView);

  if (detected) {
    win.__PM_RUNNING_IN_APP__ = true;
  }

  return detected;
}
