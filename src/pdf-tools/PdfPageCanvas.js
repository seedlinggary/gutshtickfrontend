import React, { useEffect, useRef } from 'react';

/** Renders one page of one already-loaded pdf.js document to a canvas.
 * `rotation` is ADDED to the page's own inherent rotation (pdf.js's own
 * viewport math does this, not us) -- a page-operation rotation from
 * PdfPagesPanel's manifest, separate from whatever rotation the PDF
 * already had baked in. Re-renders whenever the page/rotation/scale
 * actually change; pdf.js's own render task is cancelled on unmount/
 * change so a slow render of a page the user has already left doesn't
 * land on top of the next one. */
export default function PdfPageCanvas({ pdfjsDoc, pageIndex, rotation = 0, scale = 1.2, className }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!pdfjsDoc) return undefined;

    pdfjsDoc.getPage(pageIndex + 1).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (renderTaskRef.current) renderTaskRef.current.cancel();
      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      task.promise.catch((err) => {
        if (err?.name !== 'RenderingCancelledException') console.error(err);
      });
    });

    return () => {
      cancelled = true;
      if (renderTaskRef.current) renderTaskRef.current.cancel();
    };
  }, [pdfjsDoc, pageIndex, rotation, scale]);

  return <canvas ref={canvasRef} className={className} />;
}
