import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGE_STORAGE_KEY } from '../../src/i18n';
import { ThemeProvider } from '../../src/context/ThemeContext';
import ThemeAndLangControls from '../../src/components/ThemeAndLangControls';

const TranslatedProbe: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <span data-testid="probe-new-expense">{t('dashboard.newExpenseBtn')}</span>
      <span data-testid="probe-balance-title">{t('kpi.balanceTitle')}</span>
    </div>
  );
};

describe('ThemeAndLangControls', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
    await act(async () => {
      await i18n.changeLanguage('pt-BR');
    });
  });

  afterEach(async () => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
    await act(async () => {
      await i18n.changeLanguage('pt-BR');
    });
  });

  it('switches between pt-BR, en-US and es-ES flag buttons and persists pm_language', () => {
    render(
      <ThemeProvider>
        <ThemeAndLangControls />
        <TranslatedProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('lang-btn-pt-BR')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('probe-new-expense')).toHaveTextContent('Nova Despesa');
    expect(screen.getByTestId('probe-balance-title')).toHaveTextContent('Patrimônio Disponível');

    fireEvent.click(screen.getByTestId('lang-btn-en-US'));
    expect(screen.getByTestId('lang-btn-en-US')).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en-US');
    expect(document.documentElement.lang).toBe('en-US');
    expect(screen.getByTestId('probe-new-expense')).toHaveTextContent('New Expense');
    expect(screen.getByTestId('probe-balance-title')).toHaveTextContent('Available Wealth');

    fireEvent.click(screen.getByTestId('lang-btn-es-ES'));
    expect(screen.getByTestId('lang-btn-es-ES')).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es-ES');
    expect(document.documentElement.lang).toBe('es-ES');
    expect(screen.getByTestId('probe-new-expense')).toHaveTextContent('Nuevo Gasto');
    expect(screen.getByTestId('probe-balance-title')).toHaveTextContent('Patrimonio Disponible');
  });

  it('toggles smooth dark mode via moon/sun button and persists pm_theme', () => {
    render(
      <ThemeProvider>
        <ThemeAndLangControls />
      </ThemeProvider>,
    );

    const toggleBtn = screen.getByTestId('theme-toggle-btn');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('pm_theme')).toBe('dark');

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('pm_theme')).toBe('light');
  });
});
