import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaCheck } from 'react-icons/fa';

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
  placeholder = 'Selecione uma categoria',
  label,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

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
        <span className={`truncate ${selectedOption ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        {React.createElement(FaChevronDown as any, {
          className: `text-slate-400 text-xs ml-2 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-700' : ''
          }`,
        })}
      </button>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1.5 bg-white rounded-xl shadow-executive-lg border border-slate-200 overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3.5 py-2.5 text-xs text-slate-400">
                Nenhuma categoria disponível
              </div>
            ) : (
              options.map((option) => {
                const isSelected = value === option.id;
                return (
                  <button
                    type="button"
                    key={option.id}
                    className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 font-normal'
                    }`}
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                    }}
                  >
                    <span className="truncate">{option.name}</span>
                    {isSelected &&
                      React.createElement(FaCheck as any, {
                        className: 'text-xs text-slate-900 flex-shrink-0 ml-2',
                      })}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
};

export default CustomSelect;
