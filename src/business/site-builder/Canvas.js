import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, X, ArrowUpDown, ChevronUp, ChevronDown, Lock, Copy, Rows3, Search } from 'lucide-react';
import BlockRenderer from './blocks/BlockRenderer';
import { BLOCK_DEFS, CATEGORY_ORDER, newBlockId, isModuleSatisfied, moduleLabelFor } from './blocks/blockDefs';
import { SECTION_PRESETS } from './sectionPresets';
import { DEFAULT_SECTION_HEIGHT, SECTION_HEIGHT_STEP, MIN_SECTION_HEIGHT, MAX_SECTION_HEIGHT } from './sectionDefaults';
import { sectionBackgroundStyle, GRADIENT_ANGLES } from './sectionBackground';

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

  const updateSectionBackground = (sectionId, background) => {
    onChange(sections.map((s) => (s.id !== sectionId ? s : { ...s, background })));
  };

  // Section padding (top/bottom whitespace) was stored in the schema and
  // rendered (PublicSiteRenderer.js, this file's own style below) from
  // day one, but nothing ever let the owner actually change it from the
  // fixed 32/32 every new section starts with -- "spacing" was the one
  // generic lever this builder genuinely didn't expose anywhere. Presets
  // instead of a raw pixel input, matching this toolbar's own "easy to
  // use over granular" choice everywhere else (height is +/- a step, not
  // a number field; background is swatches, not a color-math form).
  const updateSectionPadding = (sectionId, value) => {
    const [top, bottom] = value.split(',').map(Number);
    onChange(sections.map((s) => (s.id !== sectionId ? s : { ...s, padding: { top, bottom } })));
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
    onChange(sections.map((s) => (s.id !== sectionId ? s : { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) })), { commit: true });
    if (selected && selected.blockId === blockId) onSelect(null, null);
  };

  // Offset 3% so the copy is visibly a separate block instead of sitting
  // exactly on top of the original -- clamped so duplicating a block
  // already near the section's edge doesn't push it out of bounds.
  const duplicateBlock = (sectionId, blockId) => {
    const section = sections.find((s) => s.id === sectionId);
    const block = section?.blocks.find((b) => b.id === blockId);
    if (!block) return;
    const copy = {
      ...block, id: newBlockId('block'),
      x: clamp(block.x + 3, 0, 100 - block.w), y: clamp(block.y + 3, 0, 100 - block.h),
      content: { ...block.content },
    };
    onChange(sections.map((s) => (s.id !== sectionId ? s : { ...s, blocks: [...s.blocks, copy] })), { commit: true });
    onSelect(sectionId, copy.id);
  };

  const duplicateSection = (index) => {
    const source = sections[index];
    const copy = {
      ...source, id: newBlockId('section'),
      blocks: source.blocks.map((b) => ({ ...b, id: newBlockId('block'), content: { ...b.content } })),
    };
    const next = [...sections];
    next.splice(index + 1, 0, copy);
    onChange(next, { commit: true });
  };

  const insertPresetSection = (preset) => {
    onChange([...sections, preset.build()], { commit: true });
  };

  // Delete/Backspace removes the selected block, Escape deselects,
  // Ctrl/Cmd+D duplicates the selected block -- skipped while focus is in
  // a text input/textarea (the inspector's own fields, or a text block's
  // nothing here, but future-proofs against one) so this never fights
  // normal typing/deleting text.
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if (!selected?.blockId) {
        if (e.key === 'Escape') onSelect(null, null);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeBlock(selected.sectionId, selected.blockId);
      } else if (e.key === 'Escape') {
        onSelect(null, null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateBlock(selected.sectionId, selected.blockId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, sections]);

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
            ...sectionBackgroundStyle(section.background),
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
            <SectionBackgroundMenu background={section.background} onChange={(bg) => updateSectionBackground(section.id, bg)} />
            <select className="sb-icon-btn" title="Top/bottom spacing" value={`${section.padding?.top ?? 32},${section.padding?.bottom ?? 32}`}
              onChange={(e) => updateSectionPadding(section.id, e.target.value)} style={{ padding: '4px 6px' }}>
              <option value="12,12">Tight spacing</option>
              <option value="32,32">Normal spacing</option>
              <option value="56,56">Spacious</option>
              <option value="88,88">Extra spacious</option>
            </select>
            <button type="button" className="sb-icon-btn" title="Duplicate this section" onClick={() => duplicateSection(index)}>
              <Copy size={13} />
            </button>
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
                        className="sb-block-duplicate"
                        title="Duplicate (Ctrl+D)"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); duplicateBlock(section.id, block.id); }}
                      >
                        <Copy size={11} />
                      </button>
                      <button
                        type="button"
                        className="sb-block-remove"
                        title="Delete (Del)"
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
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '16px auto' }}>
        <button type="button" className="gs-btn gs-btn-outline" onClick={addSection}>
          <Plus size={15} /> Add blank section
        </button>
        <InsertPresetMenu onInsert={insertPresetSection} />
      </div>
    </div>
  );
}

/** "Add a blank section" (above) starts from nothing; this starts from a
 * finished, pre-laid-out section instead -- a hero, a features grid, an
 * FAQ, etc. (see sectionPresets.js) -- so building a real page doesn't
 * mean placing and positioning every single block by hand every time. */
function InsertPresetMenu({ onInsert }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sb-add-block-menu">
      <button type="button" className="gs-btn gs-btn-sm" onClick={() => setOpen((o) => !o)}>
        <Rows3 size={14} /> Insert ready-made section
      </button>
      {open && (
        <div className="sb-preset-dropdown">
          {SECTION_PRESETS.map((preset) => (
            <button key={preset.id} type="button" className="sb-preset-option" onClick={() => { onInsert(preset); setOpen(false); }}>
              <strong>{preset.label}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Solid color (the original behavior) or a multi-stop linear gradient --
 * a section background option that didn't exist at all before, needed
 * recreating a real business's actual hero section, which used a dark-
 * navy-to-lighter-navy fade rather than a flat color. Stored as
 * {type:'gradient', value:{stops:[...], angle}} -- see sectionBackground.js
 * for how this turns into real CSS, shared with the public renderer so the
 * canvas preview never drifts from what a visitor actually sees. */
function SectionBackgroundMenu({ background, onChange }) {
  const [open, setOpen] = useState(false);
  const isGradient = background?.type === 'gradient';
  const stops = isGradient ? (background.value?.stops || ['#000000', '#ffffff']) : ['#000000', '#ffffff'];
  const angle = isGradient ? (background.value?.angle ?? 180) : 180;

  const setGradient = (nextStops, nextAngle) => onChange({ type: 'gradient', value: { stops: nextStops, angle: nextAngle } });

  return (
    <div className="sb-section-bg-menu">
      <button type="button" className="sb-icon-btn" title="Section background" onClick={() => setOpen((o) => !o)}
        style={{ background: isGradient ? `linear-gradient(90deg, ${stops.join(', ')})` : undefined }}>
        Background
      </button>
      {open && (
        <div className="sb-section-bg-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="sb-section-bg-tabs">
            <button type="button" className={!isGradient ? 'active' : ''} onClick={() => onChange({ type: 'color', value: background?.type === 'color' ? background.value : '#ffffff' })}>Solid</button>
            <button type="button" className={isGradient ? 'active' : ''} onClick={() => setGradient(stops, angle)}>Gradient</button>
          </div>
          {!isGradient ? (
            <>
              <input type="color" value={background?.type === 'color' && background.value !== 'transparent' ? background.value : '#ffffff'}
                onChange={(e) => onChange({ type: 'color', value: e.target.value })} />
              <button type="button" className="sb-icon-btn" onClick={() => onChange({ type: 'color', value: 'transparent' })}>
                <X size={12} /> Clear
              </button>
            </>
          ) : (
            <>
              {stops.map((s, i) => (
                <div key={i} className="sb-section-bg-stop">
                  <input type="color" value={s} onChange={(e) => setGradient(stops.map((v, idx) => (idx === i ? e.target.value : v)), angle)} />
                  {stops.length > 2 && (
                    <button type="button" className="sb-icon-btn" onClick={() => setGradient(stops.filter((_, idx) => idx !== i), angle)}><X size={11} /></button>
                  )}
                </div>
              ))}
              {stops.length < 4 && (
                <button type="button" className="sb-icon-btn" onClick={() => setGradient([...stops, '#888888'], angle)}><Plus size={11} /> Color</button>
              )}
              <select className="gs-select" value={angle} onChange={(e) => setGradient(stops, Number(e.target.value))}>
                {GRADIENT_ANGLES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AddBlockMenu({ onAdd, enabledModules }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const entries = Object.entries(BLOCK_DEFS).filter(([, def]) => !q || def.label.toLowerCase().includes(q));
  const byCategory = CATEGORY_ORDER.map((cat) => ({ cat, items: entries.filter(([, def]) => def.category === cat) })).filter((g) => g.items.length > 0);

  return (
    <div className="sb-add-block-menu">
      <button type="button" className="sb-icon-btn" onClick={() => setOpen((o) => !o)}>
        <Plus size={13} /> Add block
      </button>
      {open && (
        <div className="sb-add-block-dropdown">
          <div className="sb-add-block-search">
            <Search size={13} />
            <input autoFocus placeholder="Search blocks…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {byCategory.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 10px' }}>No blocks match "{query}".</p>}
          {byCategory.map(({ cat, items }) => (
            <div key={cat}>
              <div className="sb-add-block-category">{cat}</div>
              {items.map(([type, def]) => {
                // Adding a gated block is still allowed (it just renders a
                // "coming soon" placeholder on the live site until the module's
                // on -- see blockDefs.js's comment) -- this is only here so that
                // shows up BEFORE adding it, not as a surprise after picking it
                // and opening the inspector (BlockInspector.js has the same note).
                const locked = def.requiresModule && !isModuleSatisfied(def.requiresModule, enabledModules);
                return (
                  <button key={type} type="button" onClick={() => { onAdd(type); setOpen(false); setQuery(''); }} title={locked ? `Needs "${moduleLabelFor(def.requiresModule)}" turned on in Features to go live` : undefined}>
                    {def.label}
                    {locked && <Lock size={11} style={{ marginLeft: 6, opacity: 0.6 }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
