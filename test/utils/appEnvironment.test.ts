import { isRunningInInstalledApp } from '../../src/utils/appEnvironment';

describe('isRunningInInstalledApp', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    delete (window as unknown as { __PM_RUNNING_IN_APP__?: boolean }).__PM_RUNNING_IN_APP__;
    delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    Object.defineProperty(window.navigator, 'standalone', {
      value: undefined,
      configurable: true,
    });
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    window.history.replaceState({}, '', '/dashboard');
  });

  afterEach(() => {
    delete (window as unknown as { __PM_RUNNING_IN_APP__?: boolean }).__PM_RUNNING_IN_APP__;
    delete (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
    window.matchMedia = originalMatchMedia;
    window.history.replaceState({}, '', '/dashboard');
  });

  it('returns false on a regular desktop or mobile web browser', () => {
    expect(isRunningInInstalledApp()).toBe(false);
  });

  it('returns true when running inside ReactNativeWebView (Android/iOS app)', () => {
    (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView = {
      postMessage: jest.fn(),
    };
    expect(isRunningInInstalledApp()).toBe(true);
  });

  it('returns true when running in iOS standalone web clip mode', () => {
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      configurable: true,
    });
    expect(isRunningInInstalledApp()).toBe(true);
  });

  it('returns true when running in Android/PWA display-mode standalone', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    expect(isRunningInInstalledApp()).toBe(true);
  });

  it('returns true when ?app=1 is passed in URL', () => {
    window.history.replaceState({}, '', '/login?app=1');
    expect(isRunningInInstalledApp()).toBe(true);
  });
});
