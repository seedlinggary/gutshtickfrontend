import * as pdfjsLib from 'pdfjs-dist';
// Vite's `?url` suffix resolves this to the worker's built asset URL rather
// than inlining it as JS -- pdf.js renders off the main thread via this
// worker, same as every browser's own built-in PDF viewer does.
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export default pdfjsLib;
