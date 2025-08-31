import React, { useState, useCallback, useEffect, useReducer } from 'react';
import { TranslationDirection } from './types';
import { translateDocumentStream } from './services/geminiService';
import { parseFileContent } from './services/fileParser';
import FileUpload from './components/FileUpload';
import LanguageSelector from './components/LanguageSelector';
import ResultDisplay from './components/ResultDisplay';
import PreviewDisplay from './components/PreviewDisplay';
import Loader from './components/Loader';
import { FileTextIcon, AlertTriangleIcon, DownloadIcon, ClipboardCheckIcon, FileCheckIcon, DocumentDuplicateIcon, ShieldCheckIcon } from './components/Icons';

// --- State Management ---

interface AppState {
  status: 'idle' | 'parsing' | 'ready' | 'translating' | 'complete' | 'error';
  file: File | null;
  fileContent: string;
  direction: TranslationDirection;
  translatedText: string;
  error: string | null;
  anonymize: boolean;
  downloadMode: 'translation' | 'bilingual';
  inputMode: 'upload' | 'text';
}

type AppAction =
  | { type: 'SET_INPUT_MODE'; payload: 'upload' | 'text' }
  | { type: 'START_PARSING'; payload: File }
  | { type: 'PARSE_SUCCESS'; payload: string }
  | { type: 'SET_TEXT_CONTENT'; payload: string }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'TRANSLATE' }
  | { type: 'TRANSLATION_CHUNK'; payload: string }
  | { type: 'TRANSLATION_COMPLETE' }
  | { type: 'RESET' }
  | { type: 'SET_DIRECTION'; payload: TranslationDirection }
  | { type: 'SET_ANONYMIZE'; payload: boolean }
  | { type: 'SET_DOWNLOAD_MODE'; payload: 'translation' | 'bilingual' };

const initialState: AppState = {
  status: 'idle',
  file: null,
  fileContent: '',
  direction: TranslationDirection.LaoToChinese,
  translatedText: '',
  error: null,
  anonymize: true,
  downloadMode: 'translation',
  inputMode: 'upload',
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_INPUT_MODE':
      return { ...state, inputMode: action.payload };
    case 'START_PARSING':
      return {
        ...initialState, // Reset most state on new file
        status: 'parsing',
        file: action.payload,
        inputMode: 'upload',
        direction: state.direction,
        anonymize: state.anonymize,
      };
    case 'PARSE_SUCCESS':
      return {
        ...state,
        status: 'ready',
        fileContent: action.payload,
      };
    case 'SET_TEXT_CONTENT':
      return {
        ...initialState,
        status: action.payload ? 'ready' : 'idle',
        fileContent: action.payload,
        inputMode: 'text',
        direction: state.direction,
        anonymize: state.anonymize,
      };
    case 'SET_ERROR':
      return {
        ...state,
        status: 'error',
        error: action.payload,
      };
    case 'TRANSLATE':
      return {
        ...state,
        status: 'translating',
        error: null,
        translatedText: '',
      };
    case 'TRANSLATION_CHUNK':
      return {
        ...state,
        translatedText: state.translatedText + action.payload,
      };
    case 'TRANSLATION_COMPLETE':
      return {
        ...state,
        status: 'complete',
      };
    case 'RESET':
      return {
        ...initialState,
        // Persist settings across resets
        direction: state.direction,
        anonymize: state.anonymize,
        downloadMode: state.downloadMode,
      };
    case 'SET_DIRECTION':
      return { ...state, direction: action.payload };
    case 'SET_ANONYMIZE':
      return { ...state, anonymize: action.payload };
    case 'SET_DOWNLOAD_MODE':
      return { ...state, downloadMode: action.payload };
    default:
      return state;
  }
};


const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [copied, setCopied] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    if (state.status !== 'translating') {
      setElapsedTime(0);
      setStatusMessage('');
      return;
    }

    const timerIntervalId = setInterval(() => {
      setElapsedTime(prevTime => prevTime + 1);
    }, 1000);

    const steps = [
      "Performing initial literal translation...",
      "Polishing for natural fluency...",
      "Finalizing grammar and syntax check...",
    ];

    if (state.anonymize) {
      steps.push("Applying anonymization...");
    }
    
    let stepIndex = 0;
    setStatusMessage(steps[stepIndex]);

    const statusIntervalId = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      setStatusMessage(steps[stepIndex]);
    }, 3000);

    return () => {
      clearInterval(timerIntervalId);
      clearInterval(statusIntervalId);
    };
  }, [state.status, state.anonymize]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    dispatch({ type: 'START_PARSING', payload: selectedFile });
    try {
      const text = await parseFileContent(selectedFile);
      dispatch({ type: 'PARSE_SUCCESS', payload: text });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to read or parse the uploaded file.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: 'SET_TEXT_CONTENT', payload: e.target.value });
  };
  
  const handleTranslate = useCallback(async () => {
    if (!state.fileContent) {
      dispatch({ type: 'SET_ERROR', payload: 'No content to translate. The document might be empty or failed to parse.' });
      return;
    }
    dispatch({ type: 'TRANSLATE' });

    try {
      const stream = await translateDocumentStream(state.fileContent, state.direction, state.anonymize);
      
      let firstChunk = true;
      for await (const chunk of stream) {
        if (firstChunk && chunk.promptFeedback?.blockReason) {
           throw new Error(
              `Translation was blocked due to: ${chunk.promptFeedback.blockReason}. This may be due to the document's content.`
           );
        }
        firstChunk = false;
        
        dispatch({ type: 'TRANSLATION_CHUNK', payload: chunk.text });
      }
      dispatch({ type: 'TRANSLATION_COMPLETE' });
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during translation.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.fileContent, state.direction, state.anonymize]);

  const getTranslatedFileName = (): string => {
    if (!state.file) return 'translated_document.txt';
    const nameParts = state.file.name.split('.');
    nameParts.pop(); // Remove original extension
    const baseName = nameParts.join('.');
    return `${baseName}_translated_${state.direction === TranslationDirection.LaoToChinese ? 'zh' : 'lo'}.txt`;
  };

  const handleDownload = () => {
    if (state.status !== 'complete' || !state.translatedText) return;

    let contentToDownload = state.translatedText;
    let finalFileName = getTranslatedFileName();

    if (state.downloadMode === 'bilingual') {
      const nameParts = finalFileName.split('.');
      const extension = nameParts.pop() || 'txt';
      const baseName = nameParts.join('.');
      finalFileName = `${baseName}_bilingual.${extension}`;
      
      const originalParas = state.fileContent.split(/\r?\n\s*\r?\n/).filter(p => p.trim() !== '');
      const translatedParas = state.translatedText.split(/\r?\n\s*\r?\n/).filter(p => p.trim() !== '');
      
      const maxLength = Math.max(originalParas.length, translatedParas.length);
      let bilingualContent = [];
      for (let i = 0; i < maxLength; i++) {
          const original = originalParas[i] ? `原文：\n${originalParas[i]}` : '原文：\n[...段落缺失...]';
          const translated = translatedParas[i] ? `译文：\n${translatedParas[i]}` : '译文：\n[...段落缺失...]';
          const paragraphBlock = `--- 段落 ${i + 1} ---\n\n${original}\n\n${translated}`;
          bilingualContent.push(paragraphBlock);
      }
      contentToDownload = bilingualContent.join('\n\n\n');
    }

    const blob = new Blob([contentToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (state.status !== 'complete' || !state.translatedText) return;
    navigator.clipboard.writeText(state.translatedText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };

  const isDisabled = state.status === 'parsing' || state.status === 'translating';
  const actionButtonsDisabled = state.status !== 'complete';
  const showMainView = state.file || state.fileContent;

  const isTranslationMode = state.downloadMode === 'translation';
  const dlButtonBaseClasses = "relative z-10 flex-1 flex items-center justify-center space-x-2 text-center px-3 py-2 text-sm font-semibold rounded-md transition-colors duration-300 focus:outline-none";
  const dlActiveTextClasses = "text-white";
  const dlInactiveTextClasses = "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-600";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-black font-sans">
      <div className="w-full max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-800 dark:text-white tracking-tight">Teacher YANG 老挝语-中文 文档互译</h1>
          <p className="mt-3 max-w-2xl mx-auto text-lg text-slate-500 dark:text-slate-400">
            Upload your document or paste text to get a high-fidelity translation in seconds.
          </p>
        </header>

        <main className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 sm:p-8 transition-all duration-300">
          {!showMainView ? (
             <div className="w-full">
              <div className="flex justify-center mb-6">
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button onClick={() => dispatch({ type: 'SET_INPUT_MODE', payload: 'upload' })} className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${state.inputMode === 'upload' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'}`}>
                    Upload Document
                  </button>
                  <button onClick={() => dispatch({ type: 'SET_INPUT_MODE', payload: 'text' })} className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${state.inputMode === 'text' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'}`}>
                    Paste Text
                  </button>
                </div>
              </div>
              
              {state.inputMode === 'upload' ? (
                <FileUpload onFileSelect={handleFileSelect} disabled={isDisabled} />
              ) : (
                <textarea
                  className="w-full h-64 p-4 font-sans text-sm bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  placeholder="Paste your text here to begin translation..."
                  onChange={handleTextChange}
                  disabled={isDisabled}
                  aria-label="Paste text for translation"
                />
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="flex items-center space-x-3 text-slate-700 dark:text-slate-200 min-w-0">
                      <FileTextIcon className="w-6 h-6 text-sky-500 flex-shrink-0" />
                      <span className="font-medium truncate" title={state.file?.name || "Pasted Text"}>{state.file?.name || "Pasted Text"}</span>
                  </div>
                  <button 
                    onClick={() => dispatch({ type: 'RESET' })}
                    disabled={isDisabled}
                    className="text-sm font-semibold text-slate-600 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-4"
                  >
                    Reset
                  </button>
              </div>

              {state.status === 'parsing' ? (
                 <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg min-h-[24rem]">
                    <svg className="animate-spin h-8 w-8 text-sky-600 dark:text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 font-medium text-slate-600 dark:text-slate-300">Parsing your document...</p>
                 </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <PreviewDisplay content={state.fileContent} />
                    <ResultDisplay 
                      text={state.translatedText}
                      isTranslating={state.status === 'translating'}
                    />
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-700 space-y-6">
                    <div className="flex flex-col md:flex-row items-stretch justify-center gap-4">
                      <div className="w-full md:flex-1">
                        <LanguageSelector 
                            direction={state.direction} 
                            onDirectionChange={(dir) => dispatch({ type: 'SET_DIRECTION', payload: dir })}
                            disabled={isDisabled}
                        />
                      </div>
                      <button 
                          onClick={handleTranslate} 
                          disabled={isDisabled || !state.fileContent}
                          className="w-full md:flex-1 flex items-center justify-center bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-sky-300 dark:focus:ring-sky-800 text-lg"
                      >
                          {state.status === 'translating' ? (
                            <div className="flex flex-col items-center text-center">
                              <Loader text="Translating..." time={elapsedTime} />
                              {statusMessage && <p className="text-xs text-sky-200/90 mt-1.5 animate-fade-in">{statusMessage}</p>}
                            </div>
                           ) : (state.status === 'complete' ? 'Translate Again' : 'Translate Document')}
                      </button>
                    </div>

                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row flex-wrap items-center justify-between gap-x-6 gap-y-4">
                        <div className="flex flex-col items-stretch w-full gap-4 md:flex-row md:w-auto md:items-center">
                            <div className={`flex items-center ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                <label htmlFor="anonymize-switch" className="flex items-center cursor-pointer group">
                                    <ShieldCheckIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors" />
                                    <div className="relative ml-2">
                                        <input 
                                            type="checkbox" 
                                            id="anonymize-switch" 
                                            className="sr-only" 
                                            checked={state.anonymize}
                                            onChange={e => !isDisabled && dispatch({ type: 'SET_ANONYMIZE', payload: e.target.checked })}
                                            disabled={isDisabled}
                                        />
                                        <div className={`block w-10 h-6 rounded-full transition ${state.anonymize ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${state.anonymize ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </div>
                                    <div className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                                        Anonymize PII
                                    </div>
                                </label>
                            </div>
                            
                            <div className={`relative flex w-full md:w-auto p-1 bg-slate-100 dark:bg-slate-700/60 rounded-lg ${actionButtonsDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                <span
                                    className="absolute top-1 bottom-1 bg-sky-600 rounded-md shadow-sm transition-all duration-300 ease-in-out"
                                    style={{
                                        width: 'calc(50% - 4px)',
                                        transform: isTranslationMode ? 'translateX(0px)' : 'translateX(100%)',
                                        left: '4px',
                                    }}
                                    aria-hidden="true"
                                />
                                <button
                                    onClick={() => !actionButtonsDisabled && dispatch({ type: 'SET_DOWNLOAD_MODE', payload: 'translation' })}
                                    className={`${dlButtonBaseClasses} ${isTranslationMode ? dlActiveTextClasses : dlInactiveTextClasses}`}
                                    disabled={actionButtonsDisabled}
                                    aria-pressed={isTranslationMode}
                                >
                                    <FileCheckIcon className="w-4 h-4" />
                                    <span>Translation Only</span>
                                </button>
                                <button
                                    onClick={() => !actionButtonsDisabled && dispatch({ type: 'SET_DOWNLOAD_MODE', payload: 'bilingual' })}
                                    className={`${dlButtonBaseClasses} ${!isTranslationMode ? dlActiveTextClasses : dlInactiveTextClasses}`}
                                    disabled={actionButtonsDisabled}
                                    aria-pressed={!isTranslationMode}
                                >
                                    <DocumentDuplicateIcon className="w-4 h-4" />
                                    <span>Bilingual</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                                onClick={handleCopy}
                                className="flex flex-1 justify-center items-center space-x-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Copy translated text to clipboard"
                                disabled={actionButtonsDisabled}
                            >
                                <ClipboardCheckIcon className="w-5 h-5"/>
                                <span>{copied ? 'Copied!' : 'Copy'}</span>
                            </button>
                            <button 
                                onClick={handleDownload}
                                className="flex flex-1 justify-center items-center space-x-2 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-300 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                                disabled={actionButtonsDisabled}
                            >
                                <DownloadIcon className="w-5 h-5"/>
                                <span>Download</span>
                            </button>
                        </div>
                    </div>
                  </div>
                </>
              )}


              {state.error && (
                <div className="mt-6 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative flex items-start space-x-2" role="alert">
                  <AlertTriangleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="font-bold">Error:</strong>
                    <span className="block sm:inline ml-1">{state.error}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
        <footer className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
          <p>Powered by Google Gemini API</p>
        </footer>
      </div>
    </div>
  );
};

export default App;