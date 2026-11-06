import React, { useCallback, useRef, useState } from 'react';
import { Plus, X, ArrowUpDown, ChevronUp, ChevronDown, Lock } from 'lucide-react';
import BlockRenderer from './blocks/BlockRenderer';
import { BLOCK_DEFS, MODULE_LABELS, newBlockId } from './blocks/blockDefs';
import { DEFAULT_SECTION_HEIGHT, SECTION_HEIGHT_STEP, MIN_SECTION_HEIGHT, MAX_SECTION_HEIGHT } from './sectionDefaults';

const MIN_SIZE = 4; // percent, floor for either dimension

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/**
 * The drag/resize surface. Deliberately hand-rolled (pointer events +
 * percentage math) rather than a third-party drag/resize library -- the
 * schema is already percentage-of-section (business_site.py's BLOCK_TYPES
 * docstring), so there's no pixel<->percent conversion layer to fight, and
 * it keeps this feature's most interactive, hardest-to-debug part fully
 * inside this codebase instead of behind an external API this session
 * hasn't exercised before.
 *
 * Sections always stack full-width top to bottom; only the INSIDE of a
 * section is freeform (drag + resize blocks within its box) -- see the
 * same docstring for why (keeps a well-defined mobile fallback instead of
 * classic Wix absolute-position-everywhere breakage).
 */
// Pixels of pointer movement before a pointerdown counts as a drag rather
// than a click -- below this, it's treated as a click (select/open the
// inspector) even though a pointerdown->pointerup pair technically fired
// pointermove once or twice (trackpad/touch jitter).
const DRAG_THRESHOLD = 4;

export default function Canvas({ sections, onChange, selected, onSelect, subdomain, businessId, theme, enabledModules }) {
  const dragRef = useRef(null);
  // Click fires right after pointerup for the same element -- this is how
  // the subsequent onClick knows whether that pointerdown/up pair was a
  // genuine drag (don't select) or effectively stationary (select/open the
  // inspector). Can't read dragRef for this since onPointerUp already nulls
  // it before onClick runs.
  const lastDragMovedRef = useRef(false);

  const updateBlock = useCallback((sectionId, blockId, patch) => {
    onChange(sections.map((s) => (s.id !== sectionId ? s : {
      ...s,
      blocks: s.blocks.map((b) => (b.id !== blockId ? b : { ...b, ...patch })),
    })));
  }, [sections, onChange]);

  // Patches are always the ABSOLUTE value computed from the drag's
  // original startBlock/startHeight, never an incremental delta on top of
  // the previous patch -- so it's safe for this to run against whatever
  // `sections` this closure captured at the LAST render before the drag
  // started (onPointerMove itself is re-created, via updateSectionHeight/
  // updateBlock's own deps, every time sections changes, but the one
  // listener instance bound in startDrag for this gesture keeps using the
  // version it had at pointerdown -- every call still lands on the same
  // single section/block, so overwriting its x/y/w/h/height from the
  // original starting values is correct regardless of which render's
  // `sections` snapshot this happens to be).
  const updateSectionHeight = useCallback((sectionId, height) => {
    onChange(sections.map((s) => (s.id !== sectionId ? s : { ...s, height })));
  }, [sections, onChange]);

  const onPointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { mode, sectionId, blockId } = drag;

    if (mode === 'section-resize') {
      const dy = e.clientY - drag.startY;
      if (!drag.moved && Math.abs(dy) > DRAG_THRESHOLD) drag.moved = true;
      const height = clamp(drag.startHeight + dy, MIN_SECTION_HEIGHT, MAX_SECTION_HEIGHT);
      updateSectionHeight(sectionId, height);
      return;
    }

    const { sectionRect, startX, startY, startBlock } = drag;
    if (!drag.moved && Math.hypot(e.clientX - startX, e.clientY - startY) > DRAG_THRESHOLD) drag.moved = true;
    const dxPct = ((e.clientX - startX) / sectionRect.width) * 100;
    const dyPct = ((e.clientY - startY) / sectionRect.height) * 100;
    if (mode === 'move') {
      const x = clamp(startBlock.x + dxPct, 0, 100 - startBlock.w);
      const y = clamp(startBlock.y + dyPct, 0, 100 - startBlock.h);
      updateBlock(sectionId, blockId, { x, y });
    } else {
      const w = clamp(startBlock.w + dxPct, MIN_SIZE, 100 - startBlock.x);
      const h = clamp(startBlock.h + dyPct, MIN_SIZE, 100 - startBlock.y);
      updateBlock(sectionId, blockId, { w, h });
    }
  }, [updateBlock, updateSectionHeight]);

  const onPointerUp = useCallback(() => {
    lastDragMovedRef.current = !!(dragRef.current && dragRef.current.moved);
    dragRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  }, [onPointerMove]);

  const startDrag = (mode, section, block, e) => {
    e.stopPropagation();
    e.preventDefault();
    const sectionEl = e.currentTarget.closest('.sb-section');
    const sectionRect = sectionEl.getBoundingClientRect();
    dragRef.current = {
      mode, sectionId: section.id, blockId: block.id,
      startX: e.clientX, startY: e.clientY,
      startBlock: { x: block.x, y: block.y, w: block.w, h: block.h },
      sectionRect,
      moved: false,
    };
    // Selecting here used to be unconditional, which is the actual bug this
    // fixes -- opening the inspector the instant a drag begins, before any
    // movement happened, made every drag also pop the sidebar open and
    // visibly fight the drag (canvas width shifts via .sb-body-inspector-
    // open). Selection now only happens from the block's onClick below,
    // which checks lastDragMovedRef so a real drag never selects/opens the
    // inspector, but a stationary click still does. Still select+open here
    // for the resize-handle case (mode === 'resize'), since that handle only
    // renders once the block is already selected -- nothing to suppress.
    if (mode === 'resize') onSelect(section.id, block.id);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    // A touch drag gets interrupted far more often than a mouse one (an
    // incoming notification, the OS's own edge-swipe gesture, a second
    // finger landing) -- without this, an interrupted drag never clears
    // dragRef, so the block silently keeps "dragging" against whatever
    // pointer events happen to fire next.
    window.addEventListener('pointercancel', onPointerUp);
  };

  const startSectionResize = (section, e) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      mode: 'section-resize', sectionId: section.id,
      startY: e.clientY, startHeight: section.height || DEFAULT_SECTION_HEIGHT,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const addSection = () => {
    onChange([...sections, {
      id: newBlockId('section'),
      background: { type: 'color', value: 'transparent' },
      padding: { top: 32, bottom: 32 },
      height: DEFAULT_SECTION_HEIGHT,
      blocks: [],
    }]);
  };

  const removeSection = (sectionId) => {
    onChange(sections.filter((s) => s.id !== sectionId));
    if (selected && selected.sectionId === sectionId) onSelect(null, null);
  };

  const resizeSection = (sectionId, deltaPx) => {
    onChange(sections.map((s) => (s.id !== sectionId ? s : {
      ...s, height: Math.min(MAX_SECTION_HEIGHT, Math.max(MIN_SECTION_HEIGHT, (s.height || DEFAULT_SECTION_HEIGHT) + deltaPx)),
    })));
  };

  const updateSectionBackground = (sectionId, color) => {
    onChange(sections.map((s) => (s.id !== sectionId ? s : { ...s, background: { type: 'color', value: color } })));
  };

  const moveSection = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addBlock = (section, type) => {
    const def = BLOCK_DEFS[type];
    const block = {
      id: newBlockId('block'), type,
      x: 5, y: 5, w: def.defaultSize.w, h: def.defaultSize.h,
      z: section.blocks.length, content: { ...def.defaultContent }, mobileLayout: null,
    };
    onChange(sections.map((s) => (s.id !== section.id ? s : { ...s, blocks: [...s.blocks, block] })));
    onSelect(section.id, block.id);
  };

  const removeBlock = (sectionId, blockId) => {
    onChange(sections.map((s) => (s.id !== sectionId ? s : { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) })));
    if (selected && selected.blockId === blockId) onSelect(null, null);
  };

  return (
    <div className="sb-canvas">
      {sections.length === 0 && (
        <p className="gs-empty" style={{ textAlign: 'center' }}>No sections yet -- add one to start building.</p>
      )}
      {sections.map((section, index) => (
        <div
          key={section.id}
          className={`sb-section${selected && selected.sectionId === section.id && !selected.blockId ? ' sb-section-selected' : ''}`}
          style={{
            background: section.background?.type === 'color' ? section.background.value : undefined,
            backgroundImage: section.background?.type === 'image' ? `url(${section.background.value})` : undefined,
            paddingTop: section.padding?.top ?? 32,
            paddingBottom: section.padding?.bottom ?? 32,
          }}
          onClick={() => onSelect(section.id, null)}
        >
          <div className="sb-section-toolbar" onClick={(e) => e.stopPropagation()}>
            <AddBlockMenu onAdd={(type) => addBlock(section, type)} enabledModules={enabledModules} />
            <button type="button" className="sb-icon-btn" title="Move section up" disabled={index === 0} onClick={() => moveSection(index, -1)}>
              <ChevronUp size={14} />
            </button>
            <button type="button" className="sb-icon-btn" title="Move section down" disabled={index === sections.length - 1} onClick={() => moveSection(index, 1)}>
              <ChevronDown size={14} />
            </button>
            <button type="button" className="sb-icon-btn" title="Shorter section" onClick={() => resizeSection(section.id, -SECTION_HEIGHT_STEP)}>
              <ArrowUpDown size={14} /> −
            </button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{section.height || DEFAULT_SECTION_HEIGHT}px</span>
            <button type="button" className="sb-icon-btn" title="Taller section" onClick={() => resizeSection(section.id, SECTION_HEIGHT_STEP)}>
              <ArrowUpDown size={14} /> +
            </button>
            <input
              type="color"
              title="Section background color"
              className="sb-section-bg-swatch"
              value={section.background?.type === 'color' && section.background.value !== 'transparent' ? section.background.value : '#ffffff'}
              onChange={(e) => updateSectionBackground(section.id, e.target.value)}
            />
            {section.background?.type === 'color' && section.background.value !== 'transparent' && (
              <button type="button" className="sb-icon-btn" title="Clear background color" onClick={() => updateSectionBackground(section.id, 'transparent')}>
                <X size={12} />
              </button>
            )}
            <button type="button" className="sb-icon-btn" title="Remove section" onClick={() => removeSection(section.id)}>
              <X size={14} />
            </button>
          </div>

          <div className="sb-section-body" style={{ height: `${section.height || DEFAULT_SECTION_HEIGHT}px` }}>
            {section.blocks.map((block) => {
              const isSelected = !!(selected && selected.sectionId === section.id && selected.blockId === block.id);
              return (
                <div
                  key={block.id}
                  className={`sb-block${isSelected ? ' sb-block-selected' : ''}`}
                  style={{ left: `${block.x}%`, top: `${block.y}%`, width: `${block.w}%`, height: `${block.h}%` }}
                  onPointerDown={(e) => startDrag('move', section, block, e)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (lastDragMovedRef.current) { lastDragMovedRef.current = false; return; }
                    onSelect(section.id, block.id);
                  }}
                >
                  <div className="sb-block-body">
                    <BlockRenderer block={block} editable subdomain={subdomain} businessId={businessId} theme={theme} />
                  </div>
                  {isSelected && (
                    <>
                      <button
                        type="button"
                        className="sb-block-remove"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); removeBlock(section.id, block.id); }}
                      >
                        <X size={11} />
                      </button>
                      <div className="sb-resize-handle" onPointerDown={(e) => startDrag('resize', section, block, e)} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div
            className="sb-section-resize-handle"
            title="Drag to resize this section"
            onPointerDown={(e) => startSectionResize(section, e)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ))}
      <button type="button" className="gs-btn gs-btn-outline" onClick={addSection} style={{ margin: '16px auto', display: 'flex' }}>
        <Plus size={15} /> Add section
      </button>
    </div>
  );
}

function AddBlockMenu({ onAdd, enabledModules }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sb-add-block-menu">
      <button type="button" className="sb-icon-btn" onClick={() => setOpen((o) => !o)}>
        <Plus size={13} /> Add block
      </button>
      {open && (
        <div className="sb-add-block-dropdown">
          {Object.entries(BLOCK_DEFS).map(([type, def]) => {
            // Adding a gated block is still allowed (it just renders a
            // "coming soon" placeholder on the live site until the module's
            // on -- see blockDefs.js's comment) -- this is only here so that
            // shows up BEFORE adding it, not as a surprise after picking it
            // and opening the inspector (BlockInspector.js has the same note).
            const locked = def.requiresModule && !enabledModules?.[def.requiresModule];
            return (
              <button key={type} type="button" onClick={() => { onAdd(type); setOpen(false); }} title={locked ? `Needs "${MODULE_LABELS[def.requiresModule] || def.requiresModule}" turned on in Features to go live` : undefined}>
                {def.label}
                {locked && <Lock size={11} style={{ marginLeft: 6, opacity: 0.6 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
