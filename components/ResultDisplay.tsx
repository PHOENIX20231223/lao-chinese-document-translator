import React from 'react';

interface ResultDisplayProps {
  text: string;
  isTranslating: boolean;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ text, isTranslating }) => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex items-baseline space-x-3">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Translation Result</h3>
        </div>
        {text.length > 0 && (
          <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
            {text.length.toLocaleString()} characters
          </span>
        )}
      </div>

      <div
        className="w-full h-48 lg:h-full min-h-[12rem] p-4 font-mono text-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-y-auto whitespace-pre-wrap"
        aria-live="polite"
      >
        {text ? (
            <span className="text-slate-800 dark:text-slate-200">{text}</span>
        ) : (
            <span className="text-slate-400 dark:text-slate-500">
                {isTranslating ? "Receiving translation..." : "Translation will appear here..."}
            </span>
        )}
        {isTranslating && (
            <span
                className="inline-block w-0.5 h-4 bg-sky-500 ml-0.5 animate-pulse"
                style={{ animationDuration: '1s', verticalAlign: 'text-bottom' }}
                aria-hidden="true"
            ></span>
        )}
      </div>
    </div>
  );
};

export default ResultDisplay;