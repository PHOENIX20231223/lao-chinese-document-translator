
import React from 'react';
import { TranslationDirection } from '../types';
import { SwitchHorizontalIcon } from './Icons';

interface LanguageSelectorProps {
  direction: TranslationDirection;
  onDirectionChange: (direction: TranslationDirection) => void;
  disabled: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ direction, onDirectionChange, disabled }) => {
  const isLaoToChinese = direction === TranslationDirection.LaoToChinese;
  
  const sourceLang = isLaoToChinese ? 'Lao 🇱🇦' : 'Chinese 🇨🇳';
  const targetLang = isLaoToChinese ? 'Chinese 🇨🇳' : 'Lao 🇱🇦';

  const handleSwap = () => {
    if (disabled) return;
    onDirectionChange(isLaoToChinese ? TranslationDirection.ChineseToLao : TranslationDirection.LaoToChinese);
  };

  return (
    <div className={`flex h-full items-center justify-around p-2 bg-slate-100 dark:bg-slate-800 rounded-xl gap-4 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <div className="text-center flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">From</p>
        <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">{sourceLang}</p>
      </div>
      <button
        onClick={handleSwap}
        disabled={disabled}
        className="p-3 rounded-full bg-white dark:bg-slate-700 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-slate-600 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-300 transition-all duration-300 transform rotate-0 hover:rotate-180 disabled:transform-none disabled:bg-slate-100 dark:disabled:bg-slate-700"
        aria-label="Swap translation direction"
      >
        <SwitchHorizontalIcon className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      <div className="text-center flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">To</p>
        <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">{targetLang}</p>
      </div>
    </div>
  );
};

export default LanguageSelector;