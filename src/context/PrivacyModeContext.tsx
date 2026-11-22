import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, getLocaleFormatting } from '../utils/formatters';

const PRIVACY_STORAGE_KEY = 'pm_hide_values';

export function getMaskedCurrencyDisplay(localeOverride?: string): string {
  const { currency } = getLocaleFormatting(localeOverride);
  if (currency === 'USD') return '$ •••••';
  if (currency === 'EUR') return '€ •••••';
  return 'R$ •••••';
}

interface PrivacyModeContextValue {
  hideValues: boolean;
  toggleHideValues: () => void;
  setHideValues: (hide: boolean) => void;
  formatProtectedCurrency: (val: number, localeOverride?: string) => string;
}

const PrivacyModeContext = createContext<PrivacyModeContextValue>({
  hideValues: false,
  toggleHideValues: () => {},
  setHideValues: () => {},
  formatProtectedCurrency: (val: number) => formatCurrency(val),
});

function readInitialPrivacyState(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(PRIVACY_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export const PrivacyModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { i18n } = useTranslation();
  const [hideValues, setHideValuesState] = useState<boolean>(readInitialPrivacyState);

  const setHideValues = useCallback((nextValue: boolean) => {
    setHideValuesState(nextValue);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(PRIVACY_STORAGE_KEY, String(nextValue));
      }
    } catch {
      // ignore storage errors in restricted contexts
    }
  }, []);

  const toggleHideValues = useCallback(() => {
    setHideValuesState((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(PRIVACY_STORAGE_KEY, String(next));
        }
      } catch {
        // ignore storage errors in restricted contexts
      }
      return next;
    });
  }, []);

  const formatProtectedCurrency = useCallback(
    (val: number, localeOverride?: string): string => {
      if (hideValues) {
        return getMaskedCurrencyDisplay(localeOverride || i18n.language);
      }
      return formatCurrency(val);
    },
    [hideValues, i18n.language],
  );

  const value = useMemo(
    () => ({
      hideValues,
      toggleHideValues,
      setHideValues,
      formatProtectedCurrency,
    }),
    [hideValues, toggleHideValues, setHideValues, formatProtectedCurrency],
  );

  return (
    <PrivacyModeContext.Provider value={value}>
      {children}
    </PrivacyModeContext.Provider>
  );
};

export function usePrivacyMode(): PrivacyModeContextValue {
  return useContext(PrivacyModeContext);
}
