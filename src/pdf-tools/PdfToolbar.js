import React from 'react';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download, LayoutGrid, FileUp } from 'lucide-react';

export default function PdfToolbar({
  fileName, currentPage, numPages, zoom, pagesPanelOpen,
  onPrevPage, onNextPage, onZoomIn, onZoomOut, onTogglePagesPanel, onDownload, onOpenNew,
}) {
  return (
    <div className="pdftools-toolbar">
      <div className="pdftools-toolbar-group">
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onOpenNew}>
          <FileUp size={14} /> Open another file
        </button>
        <span className="pdftools-filename" title={fileName}>{fileName}</span>
      </div>

      <div className="pdftools-toolbar-group">
        <button type="button" className="pdftools-icon-btn" title="Previous page" disabled={currentPage <= 0} onClick={onPrevPage}>
          <ChevronLeft size={16} />
        </button>
        <span className="pdftools-page-indicator">Page {currentPage + 1} of {numPages}</span>
        <button type="button" className="pdftools-icon-btn" title="Next page" disabled={currentPage >= numPages - 1} onClick={onNextPage}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="pdftools-toolbar-group">
        <button type="button" className="pdftools-icon-btn" title="Zoom out" onClick={onZoomOut}><ZoomOut size={16} /></button>
        <span className="pdftools-zoom-indicator">{Math.round(zoom * 100)}%</span>
        <button type="button" className="pdftools-icon-btn" title="Zoom in" onClick={onZoomIn}><ZoomIn size={16} /></button>
      </div>

      <div className="pdftools-toolbar-group">
        <button
          type="button"
          className={`gs-btn gs-btn-outline gs-btn-sm${pagesPanelOpen ? ' pdftools-toolbar-active' : ''}`}
          onClick={onTogglePagesPanel}
        >
          <LayoutGrid size={14} /> Pages
        </button>
        <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={onDownload}>
          <Download size={14} /> Download
        </button>
      </div>
    </div>
  );
}
