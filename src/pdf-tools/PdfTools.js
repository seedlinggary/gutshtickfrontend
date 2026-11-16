import React, { useEffect, useRef, useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { FileUp, AlertCircle } from 'lucide-react';
import pdfjsLib from './pdfWorker';
import PdfToolbar from './PdfToolbar';
import PdfPageCanvas from './PdfPageCanvas';
import PdfPagesPanel from './PdfPagesPanel';
import './pdf-tools-theme.css';

/** Loads one File into both a pdf.js document (for rendering) and a
 * pristine byte copy (for pdf-lib, which needs its own copy -- pdf.js's
 * worker transfers/consumes whatever typed array it's handed, so this
 * keeps an independent `.slice()` for pdf-lib and never hands pdf-lib's
 * own copy to pdf.js). */
async function loadSource(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const pdfjsDoc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
  return {
    id: `src-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    bytes,
    pdfjsDoc,
    numPages: pdfjsDoc.numPages,
  };
}

function manifestFromSource(source) {
  return Array.from({ length: source.numPages }, (_, i) => ({
    id: `${source.id}-p${i}`, sourceId: source.id, pageIndex: i, rotation: 0,
  }));
}

/** Replays a manifest (an ordered list of {sourceId, pageIndex, rotation}
 * pointers -- never the actual bytes, see PdfPagesPanel's own comment)
 * into one real PDF via pdf-lib, copying each page from whichever source
 * document it points at. This is the only place manifest entries ever
 * become actual PDF bytes -- everything else in this file just edits
 * the manifest array. */
async function buildPdfFromManifest(entries, sources) {
  const outDoc = await PDFDocument.create();
  const loadedSourceDocs = {};
  for (const entry of entries) {
    if (!loadedSourceDocs[entry.sourceId]) {
      loadedSourceDocs[entry.sourceId] = await PDFDocument.load(sources[entry.sourceId].bytes);
    }
    const [copiedPage] = await outDoc.copyPages(loadedSourceDocs[entry.sourceId], [entry.pageIndex]);
    if (entry.rotation) {
      const existingAngle = copiedPage.getRotation().angle || 0;
      copiedPage.setRotation(degrees((existingAngle + entry.rotation) % 360));
    }
    outDoc.addPage(copiedPage);
  }
  return outDoc.save();
}

function triggerDownload(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function PdfTools() {
  useEffect(() => { document.title = 'PDF Tools - Gut Shtick'; }, []);

  const [sources, setSources] = useState({});
  const [manifest, setManifest] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1.2);
  const [pagesPanelOpen, setPagesPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const primaryFileNameRef = useRef('');

  const hasDocument = manifest.length > 0;
  const currentEntry = manifest[Math.min(currentIndex, manifest.length - 1)];
  const currentSource = currentEntry ? sources[currentEntry.sourceId] : null;

  const openFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('That\'s not a PDF file.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const source = await loadSource(file);
      setSources({ [source.id]: source });
      setManifest(manifestFromSource(source));
      setCurrentIndex(0);
      primaryFileNameRef.current = file.name.replace(/\.pdf$/i, '');
    } catch {
      setError('Could not open this file -- is it a valid, unencrypted PDF?');
    } finally {
      setLoading(false);
    }
  };

  const insertFile = async (file) => {
    setLoading(true);
    setError('');
    try {
      const source = await loadSource(file);
      setSources((prev) => ({ ...prev, [source.id]: source }));
      setManifest((prev) => [...prev, ...manifestFromSource(source)]);
    } catch {
      setError('Could not open that file to insert its pages.');
    } finally {
      setLoading(false);
    }
  };

  const rotatePage = (entryId) => {
    setManifest((prev) => prev.map((e) => (e.id === entryId ? { ...e, rotation: (e.rotation + 90) % 360 } : e)));
  };

  const deletePage = (entryId) => {
    setManifest((prev) => {
      if (prev.length <= 1) {
        setError('A document needs at least one page.');
        return prev;
      }
      return prev.filter((e) => e.id !== entryId);
    });
  };

  const moveEntry = (entryId, direction) => {
    setManifest((prev) => {
      const idx = prev.findIndex((e) => e.id === entryId);
      const newIdx = idx + direction;
      if (idx === -1 || newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const downloadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const bytes = await buildPdfFromManifest(manifest, sources);
      triggerDownload(bytes, `${primaryFileNameRef.current || 'document'}-edited.pdf`);
    } catch (e) {
      setError(`Could not build the edited PDF -- ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportRange = async (selectedIds) => {
    const idSet = new Set(selectedIds);
    const entries = manifest.filter((e) => idSet.has(e.id));
    setLoading(true);
    setError('');
    try {
      const bytes = await buildPdfFromManifest(entries, sources);
      triggerDownload(bytes, `${primaryFileNameRef.current || 'document'}-pages.pdf`);
    } catch (e) {
      setError(`Could not export those pages -- ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) openFile(file);
  };

  if (!hasDocument) {
    return (
      <div className="pdftools-page">
        <div
          className={`pdftools-dropzone${dragOver ? ' pdftools-dropzone-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <FileUp size={40} />
          <h2>PDF Tools</h2>
          <p>View, merge, split, rotate, and reorder PDFs -- free, right in your browser. Nothing you open here is ever uploaded anywhere.</p>
          <button type="button" className="gs-btn gs-btn-primary" onClick={() => fileInputRef.current?.click()}>
            Choose a PDF
          </button>
          <p className="pdftools-dropzone-hint">or drag and drop one here</p>
          {error && <p className="pdftools-error"><AlertCircle size={14} /> {error}</p>}
          {loading && <p className="pdftools-loading">Opening...</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files[0]) openFile(e.target.files[0]); e.target.value = ''; }}
        />
      </div>
    );
  }

  return (
    <div className="pdftools-page">
      <PdfToolbar
        fileName={primaryFileNameRef.current}
        currentPage={currentIndex}
        numPages={manifest.length}
        zoom={zoom}
        pagesPanelOpen={pagesPanelOpen}
        onPrevPage={() => setCurrentIndex((i) => Math.max(0, i - 1))}
        onNextPage={() => setCurrentIndex((i) => Math.min(manifest.length - 1, i + 1))}
        onZoomIn={() => setZoom((z) => Math.min(3, z + 0.2))}
        onZoomOut={() => setZoom((z) => Math.max(0.4, z - 0.2))}
        onTogglePagesPanel={() => setPagesPanelOpen((o) => !o)}
        onDownload={downloadAll}
        onOpenNew={() => fileInputRef.current?.click()}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files[0]) openFile(e.target.files[0]); e.target.value = ''; }}
      />

      {error && <p className="pdftools-error"><AlertCircle size={14} /> {error}</p>}
      {loading && <p className="pdftools-loading">Working...</p>}

      {pagesPanelOpen && (
        <PdfPagesPanel
          manifest={manifest}
          sources={sources}
          onRotate={rotatePage}
          onDelete={deletePage}
          onMove={moveEntry}
          onInsertFile={insertFile}
          onExportRange={exportRange}
        />
      )}

      <div className="pdftools-viewer">
        {currentSource && currentEntry && (
          <PdfPageCanvas
            key={currentEntry.id}
            pdfjsDoc={currentSource.pdfjsDoc}
            pageIndex={currentEntry.pageIndex}
            rotation={currentEntry.rotation}
            scale={zoom}
            className="pdftools-page-canvas"
          />
        )}
      </div>
    </div>
  );
}
