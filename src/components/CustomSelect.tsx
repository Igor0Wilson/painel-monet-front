import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaChevronDown, FaCheck } from 'react-icons/fa';
import { getCategoryMeta, translateCategoryName } from '../utils/categories';

interface Option {
  id: string;
  name: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

const CustomSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  placeholder,
  label,
  error,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);
  const selectedMeta = selectedOption ? getCategoryMeta(selectedOption.name) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="exec-label">{label}</label>}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`exec-input flex items-center justify-between text-left ${
          error ? 'exec-input-error' : ''
        }`}
      >
        {selectedOption && selectedMeta ? (
          <span className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedMeta.iconBgClass}`}
            >
              {React.createElement(selectedMeta.icon as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
            </span>
            <span className="truncate text-slate-900 dark:text-slate-100 font-semibold">
              {translateCategoryName(selectedMeta.name)}
            </span>
          </span>
        ) : (
          <span className="truncate text-slate-400">
            {placeholder || t('modals.expense.categoryLabel')}
          </span>
        )}
        {React.createElement(FaChevronDown as unknown as React.ComponentType<{ className?: string }>, {
          className: `text-slate-400 text-xs ml-2 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-700 dark:text-slate-200' : ''
          }`,
        })}
      </button>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1.5 bg-white dark:bg-slate-900 rounded-xl shadow-executive-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="max-h-60 overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3.5 py-2.5 text-xs text-slate-400">
                {t('expenses.emptyTitle')}
              </div>
            ) : (
              options.map((option) => {
                const isSelected = value === option.id;
                const meta = getCategoryMeta(option.name);
                return (
                  <button
                    type="button"
                    key={option.id}
                    className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 font-normal'
                    }`}
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.iconBgClass}`}
                      >
                        {React.createElement(meta.icon as unknown as React.ComponentType<{ className?: string }>, { className: 'text-xs' })}
                      </span>
                      <span className="truncate">{translateCategoryName(meta.name)}</span>
                    </span>
                    {isSelected &&
                      React.createElement(FaCheck as unknown as React.ComponentType<{ className?: string }>, {
                        className: 'text-xs text-slate-900 dark:text-emerald-400 flex-shrink-0 ml-2',
                      })}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
    </div>
  );
};

export default CustomSelect;
