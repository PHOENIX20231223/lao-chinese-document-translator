// Add this at the top to use the global mammoth object from the script tag


// ✅ 正确的 Vite 用法：把 worker 当成静态资源引入

import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

// 告诉 PDF.js 使用我们引入的 worker
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

// Set worker source for pdfjs. This is crucial for it to work in a web environment.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export const parseFileContent = async (file: File): Promise<string> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  if (!fileExtension) {
      throw new Error("Could not determine file type.");
  }

  const arrayBuffer = await file.arrayBuffer();

  try {
    switch (fileExtension) {
      case 'pdf': {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const pageTexts = [];
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          // The `item` can be `TextItem` or `TextMarkedContent`. `TextItem` has `str`.
          const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
          pageTexts.push(pageText);
        }
        return pageTexts.join('\n\n');
      }
      case 'docx': {
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      }
      case 'txt':
      case 'md': {
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(arrayBuffer);
      }
      case 'doc':
        throw new Error('.doc files are not supported. Please save as .docx or .pdf.');
      default:
        // Attempt to read as text for unknown types which might be text-based
        if (file.type.startsWith('text/')) {
           const decoder = new TextDecoder('utf-8');
           return decoder.decode(arrayBuffer);
        }
        throw new Error(`Unsupported file type: .${fileExtension}. Please upload a PDF, DOCX, or text file.`);
    }
  } catch (error) {
     console.error('File parsing error:', error);
     if (error instanceof Error) {
        throw new Error(`Failed to parse file: ${error.message}`);
     }
     throw new Error(`An unknown error occurred while parsing the file.`);
  }
};
