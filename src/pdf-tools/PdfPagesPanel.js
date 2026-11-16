import React, { useState } from 'react';
import { ChevronUp, ChevronDown, RotateCw, Trash2, FilePlus, Download } from 'lucide-react';
import PdfPageCanvas from './PdfPageCanvas';

/** The page-operations surface: one thumbnail per manifest entry (see
 * PdfTools.js's own comment on what a manifest entry is -- a pointer at
 * one page of one loaded source, plus a rotation, never the page's
 * actual bytes). Reordering is up/down buttons rather than drag-and-drop
 * -- less flashy, but it can't misfire on a touch screen and needs no
 * extra library, and the manifest is just an array so "move" is a
 * one-line swap either way. */
export default function PdfPagesPanel({ manifest, sources, onRotate, onDelete, onMove, onInsertFile, onExportRange }) {
  const [selected, setSelected] = useState(() => new Set());
  const insertInputRef = React.useRef(null);

  const toggleSelected = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="pdftools-pages-panel">
      <div className="pdftools-pages-panel-header">
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => insertInputRef.current?.click()}>
          <FilePlus size={14} /> Insert pages from another file
        </button>
        <input
          ref={insertInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files[0]) onInsertFile(e.target.files[0]); e.target.value = ''; }}
        />
        {selected.size > 0 && (
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => onExportRange([...selected])}>
            <Download size={14} /> Export {selected.size} selected page{selected.size > 1 ? 's' : ''} as new PDF
          </button>
        )}
      </div>

      <div className="pdftools-thumb-grid">
        {manifest.map((entry, i) => {
          const source = sources[entry.sourceId];
          if (!source) return null;
          return (
            <div key={entry.id} className={`pdftools-thumb${selected.has(entry.id) ? ' pdftools-thumb-selected' : ''}`}>
              <label className="pdftools-thumb-select">
                <input type="checkbox" checked={selected.has(entry.id)} onChange={() => toggleSelected(entry.id)} />
              </label>
              <PdfPageCanvas
                pdfjsDoc={source.pdfjsDoc}
                pageIndex={entry.pageIndex}
                rotation={entry.rotation}
                scale={0.25}
                className="pdftools-thumb-canvas"
              />
              <div className="pdftools-thumb-label">{i + 1}</div>
              <div className="pdftools-thumb-actions">
                <button type="button" className="pdftools-icon-btn" title="Move earlier" disabled={i === 0} onClick={() => onMove(entry.id, -1)}>
                  <ChevronUp size={13} />
                </button>
                <button type="button" className="pdftools-icon-btn" title="Move later" disabled={i === manifest.length - 1} onClick={() => onMove(entry.id, 1)}>
                  <ChevronDown size={13} />
                </button>
                <button type="button" className="pdftools-icon-btn" title="Rotate 90°" onClick={() => onRotate(entry.id)}>
                  <RotateCw size={13} />
                </button>
                <button type="button" className="pdftools-icon-btn" title="Delete page" onClick={() => onDelete(entry.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
