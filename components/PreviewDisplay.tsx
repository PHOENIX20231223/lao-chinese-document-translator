import React from 'react';
import { FileCheckIcon } from './Icons';

interface PreviewDisplayProps {
  content: string;
}

const PreviewDisplay: React.FC<PreviewDisplayProps> = ({ content }) => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
            <FileCheckIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Extracted Text Preview
            </h3>
        </div>
        <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
          {content.length.toLocaleString()} characters
        </span>
      </div>
      <textarea
        readOnly
        value={content}
        className="w-full h-48 lg:h-full min-h-[12rem] p-4 font-sans text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
        placeholder="Extracted text will appear here..."
        aria-label="Extracted text preview"
      />
    </div>
  );
};

export default PreviewDisplay;