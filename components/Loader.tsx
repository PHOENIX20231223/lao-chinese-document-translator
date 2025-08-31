import React from 'react';

interface LoaderProps {
  text?: string;
  time?: number;
}

const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
};


const Loader: React.FC<LoaderProps> = ({ text = "Processing...", time }) => {
  return (
    <div className="flex items-center justify-center space-x-2" role="status">
      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>{text}</span>
      {typeof time === 'number' && time > 0 && (
          <span className="font-mono text-sm tracking-wider">({formatTime(time)})</span>
      )}
    </div>
  );
};

export default Loader;