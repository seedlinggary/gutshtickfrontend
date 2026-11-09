import React, { useEffect, useState } from 'react';
import { X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Minus, Plus as PlusIcon, Trash2, Undo2, Redo2 } from 'lucide-react';
import UploadFile from '../../Uploadfile';
import apiRequest from '../../ApiRequest';
import { BLOCK_DEFS, moduleLabelFor } from './blocks/blockDefs';
import { ICON_NAMES } from './blocks/ContentBlocks';
import { CONTACT_DEFAULT_EXTRA_FIELDS } from './blocks/ContactFormBlock';

const NUDGE_STEP = 5; // percent per tap

/** Tap-to-nudge move/resize -- the reliable way to position a block on a
 * touchscreen. Dragging the canvas directly DOES work on mobile (Canvas.js
 * uses Pointer Events, which cover touch), but fine pixel-precision
 * dragging with a fingertip is genuinely harder than with a mouse, and a
 * 12px resize handle is a bad target regardless of how big the CSS makes
 * it feel -- this gives every block a big, impossible-to-miss way to move
 * and resize that works exactly the same on any device, dragging or not.
 * Lives alongside (not instead of) the exact numeric fields below for
 * anyone who wants to type a precise value directly. */
function NudgeControls({ block, onChange }) {
  const move = (dx, dy) => {
    const x = Math.min(100 - block.w, Math.max(0, Math.round((block.x + dx) * 10) / 10));
    const y = Math.min(100 - block.h, Math.max(0, Math.round((block.y + dy) * 10) / 10));
    onChange({ x, y });
  };
  const resize = (dw, dh) => {
    const w = Math.min(100 - block.x, Math.max(4, Math.round((block.w + dw) * 10) / 10));
    const h = Math.min(100 - block.y, Math.max(4, Math.round((block.h + dh) * 10) / 10));
    onChange({ w, h });
  };

  return (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
      <div>
        <div className="gs-label" style={{ marginBottom: 6 }}>Move</div>
        <div className="sb-nudge-pad">
          <button type="button" className="sb-nudge-btn" style={{ gridColumn: 2, gridRow: 1 }} onClick={() => move(0, -NUDGE_STEP)}><ArrowUp size={16} /></button>
          <button type="button" className="sb-nudge-btn" style={{ gridColumn: 1, gridRow: 2 }} onClick={() => move(-NUDGE_STEP, 0)}><ArrowLeft size={16} /></button>
          <button type="button" className="sb-nudge-btn" style={{ gridColumn: 3, gridRow: 2 }} onClick={() => move(NUDGE_STEP, 0)}><ArrowRight size={16} /></button>
          <button type="button" className="sb-nudge-btn" style={{ gridColumn: 2, gridRow: 3 }} onClick={() => move(0, NUDGE_STEP)}><ArrowDown size={16} /></button>
        </div>
      </div>
      <div>
        <div className="gs-label" style={{ marginBottom: 6 }}>Width</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="sb-nudge-btn" onClick={() => resize(-NUDGE_STEP, 0)}><Minus size={14} /></button>
          <button type="button" className="sb-nudge-btn" onClick={() => resize(NUDGE_STEP, 0)}><PlusIcon size={14} /></button>
        </div>
        <div className="gs-label" style={{ margin: '10px 0 6px' }}>Height</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="sb-nudge-btn" onClick={() => resize(0, -NUDGE_STEP)}><Minus size={14} /></button>
          <button type="button" className="sb-nudge-btn" onClick={() => resize(0, NUDGE_STEP)}><PlusIcon size={14} /></button>
        </div>
      </div>
    </div>
  );
}

function ProductPicker({ businessId, value, onChange }) {
  const [products, setProducts] = useState(null);
  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/${businessId}/products`)
      .then((d) => setProducts(d.products))
      .catch(() => setProducts([]));
  }, [businessId]);

  if (products === null) return <p style={{ fontSize: 12, color: 'var(--muted)' }}>Loading products…</p>;
  if (products.length === 0) return <p style={{ fontSize: 12, color: 'var(--muted)' }}>Add a product in the Products panel first.</p>;

  return (
    <select className="gs-select" value={value || ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">Choose a product…</option>
      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}

function ServiceTypePicker({ businessId, value, onChange }) {
  const [services, setServices] = useState(null);
  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/${businessId}/service-types`)
      .then((d) => setServices(d.service_types))
      .catch(() => setServices([]));
  }, [businessId]);

  if (services === null) return <p style={{ fontSize: 12, color: 'var(--muted)' }}>Loading services…</p>;
  if (services.length === 0) return <p style={{ fontSize: 12, color: 'var(--muted)' }}>Add a service in the Bookings panel first.</p>;

  return (
    <select
      className="gs-select"
      value={value || ''}
      onChange={(e) => {
        const service = services.find((s) => String(s.id) === e.target.value);
        onChange(service ? { serviceTypeId: service.id, serviceName: service.name } : { serviceTypeId: null, serviceName: null });
      }}
    >
      <option value="">Choose a service…</option>
      {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );
}

function FormPicker({ businessId, value, onChange }) {
  const [forms, setForms] = useState(null);
  useEffect(() => {
    apiRequest('GET', null, `/nonprofit/businesses/${businessId}/forms/for-picker`)
      .then((d) => setForms(d.forms))
      .catch(() => setForms([]));
  }, [businessId]);

  if (forms === null) return <p style={{ fontSize: 12, color: 'var(--muted)' }}>Loading forms…</p>;
  if (forms.length === 0) return <p style={{ fontSize: 12, color: 'var(--muted)' }}>Build a form in the staff portal's Forms section first.</p>;

  // Keyed by SLUG, not id -- the public embed fetches
  // /nonprofit/public/<subdomain>/forms/<slug>, same endpoint the
  // standalone /forms/:slug page uses, which only ever resolves a form
  // by its slug.
  return (
    <>
      <select className="gs-select" value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Choose a form…</option>
        {forms.map((f) => <option key={f.id} value={f.slug}>{f.title}{!f.is_open ? ' (closed)' : ''}</option>)}
      </select>
      {value && !forms.find((f) => f.slug === value)?.is_open && (
        <p style={{ fontSize: 12, color: 'var(--danger, #b42318)', marginTop: 6 }}>
          This form is currently closed -- open it in the staff portal before publishing, or visitors will see nothing here.
        </p>
      )}
    </>
  );
}

function LabeledNumber({ label, value, onChange }) {
  return (
    <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label}
      <input className="gs-input" type="number" min={0} max={100}
        value={Math.round(value)} onChange={(e) => onChange(clampNumber(e.target.value))} />
    </label>
  );
}

function clampNumber(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Shared by every content block that renders an optional heading through
 * the same `.sb-faq-heading` element (faq_accordion, feature_grid,
 * testimonial_grid, service_list, logo_strip) -- one control instead of
 * five copies, and it stays in sync if a 6th block adopts the same
 * heading convention later. */
function HeadingSizeColorControls({ content, updateContent }) {
  if (!content.heading) return null;
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        Heading size
        <input className="gs-input" type="number" min={13} max={48} style={{ width: 70 }}
          value={content.headingSize || 22} onChange={(e) => updateContent({ headingSize: Number(e.target.value) || 22 })} />
      </label>
      <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        Heading color
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="color" value={content.headingColor || '#2b2118'} onChange={(e) => updateContent({ headingColor: e.target.value })}
            style={{ width: 36, height: 30, padding: 0, border: '1px solid var(--border)', borderRadius: 6 }} />
          {content.headingColor && (
            <button type="button" className="sb-icon-btn" title="Use site default" onClick={() => updateContent({ headingColor: null })}><X size={11} /></button>
          )}
        </div>
      </label>
    </div>
  );
}

/** Desktop-only column-count override for the grid-based repeating blocks
 * (feature_grid, testimonial_grid) -- "Auto" (default) keeps the existing
 * responsive auto-fit/minmax behavior (already collapses on its own at
 * any width, including mobile); picking a specific count applies ONLY
 * above the site's own 720px mobile breakpoint (see the sb-grid-cols-*
 * classes in theme.css), so forcing e.g. 4 columns on desktop can never
 * reintroduce the squeezed-on-a-phone problem a fixed inline style would. */
function GridColumnsControl({ value, onChange }) {
  return (
    <div className="gs-field">
      <div className="gs-label">Layout (desktop)</div>
      <select className="gs-select" value={value || 'auto'} onChange={(e) => onChange(e.target.value === 'auto' ? null : Number(e.target.value))}>
        <option value="auto">Auto (fits as many as the width allows)</option>
        <option value="2">2 columns</option>
        <option value="3">3 columns</option>
        <option value="4">4 columns</option>
      </select>
    </div>
  );
}

/** Shared "repeating item" list editor for the 3 new structured-content
 * block types below -- each item is a fixed set of fields (declared by
 * the caller via `fields`), rendered as a small card with a remove
 * button, plus an "Add" button that appends one more using `blank`. Kept
 * as one generic component rather than three near-identical ones, same
 * reasoning LinksEditor (ChromeInspector.js) already established for its
 * own single-shape repeating list. */
/** Opt-in light-text mode for a content block placed directly on a dark
 * section background -- every color these blocks use (sb-text, sb-muted,
 * sb-heading-color) is a token tuned for a light page background, so
 * placed straight onto a dark hero/CTA section (not inside its own white
 * card) that text is barely legible. Same convention the real site's own
 * GoogleRatingBadge already uses (a `variant="dark"` prop) -- nothing
 * here can see its own section's background color to detect this
 * automatically, so it's a toggle the owner sets. */
function DarkBackgroundToggle({ content, updateContent }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 12 }}>
      <input type="checkbox" checked={!!content.dark} onChange={(e) => updateContent({ dark: e.target.checked })} />
      On a dark background (use light text instead of the normal theme colors)
    </label>
  );
}

function ItemListEditor({ items, onChange, fields, blank, addLabel }) {
  const list = items || [];
  const updateItem = (i, patch) => onChange(list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeItem = (i) => onChange(list.filter((_, idx) => idx !== i));
  const addItem = () => onChange([...list, { ...blank }]);

  return (
    <div>
      {list.map((item, i) => (
        <div key={i} style={{ border: '1px solid var(--border, #e5e1d6)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
            <button type="button" className="sb-icon-btn" onClick={() => removeItem(i)}><Trash2 size={13} /></button>
          </div>
          {fields.map((f) => (
            <div key={f.key} style={{ marginBottom: 6 }}>
              {f.label && <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{f.label}</div>}
              {f.type === 'image' ? (
                <>
                  {item[f.key] && <img src={item[f.key]} alt="" style={{ maxWidth: '100%', maxHeight: 60, borderRadius: 6, marginBottom: 6, display: 'block' }} />}
                  <UploadFile apiextension="/business/upload" setInvestors={(filename) =>
                    apiRequest('GET', null, `/business/upload-url/${filename}`).then(({ url }) => updateItem(i, { [f.key]: url }))} />
                </>
              ) : f.type === 'textarea' ? (
                <textarea className="gs-input" rows={2} value={item[f.key] || ''} placeholder={f.placeholder}
                  onChange={(e) => updateItem(i, { [f.key]: e.target.value })} />
              ) : f.type === 'list' ? (
                <textarea className="gs-input" rows={3} value={(item[f.key] || []).join('\n')} placeholder={f.placeholder}
                  onChange={(e) => updateItem(i, { [f.key]: e.target.value.split('\n') })} />
              ) : f.type === 'select' ? (
                <select className="gs-select" value={item[f.key] || ''} onChange={(e) => updateItem(i, { [f.key]: e.target.value })}>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'checkbox' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <input type="checkbox" checked={!!item[f.key]} onChange={(e) => updateItem(i, { [f.key]: e.target.checked })} />
                  {f.checkboxLabel || f.label}
                </label>
              ) : (
                <input className="gs-input" value={item[f.key] || ''} placeholder={f.placeholder}
                  onChange={(e) => updateItem(i, { [f.key]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
      ))}
      <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={addItem}>
        <PlusIcon size={13} /> {addLabel}
      </button>
    </div>
  );
}

/** The only place block.content ever gets edited -- the canvas renders
 * blocks read-only (see Canvas.js/BlockRenderer.js), selecting one opens
 * it here. Keeping editing out of the canvas itself avoids building
 * contentEditable-in-place editing (fragile, hard to keep consistent with
 * the public renderer) for not much UX benefit over a side panel. */
export default function BlockInspector({ businessId, block, onChange, onClose, history }) {
  if (!block) return null;
  const def = BLOCK_DEFS[block.type];
  const update = (patch) => onChange({ ...block, ...patch });
  const updateContent = (patch) => update({ content: { ...block.content, ...patch } });
  const updateStyle = (patch) => update({ style: { ...block.style, ...patch } });

  const uploadToUrl = (filename, cb) => {
    apiRequest('GET', null, `/business/upload-url/${filename}`).then(({ url }) => cb(url));
  };

  return (
    <div className="sb-inspector">
      <div className="sb-inspector-header">
        <strong>{def?.label || block.type}</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Same undo/redo this page already has in its top toolbar --
              mirrored here too since editing a block's settings is exactly
              when a "whoops, undo that" moment tends to happen, and this
              panel can cover the toolbar above it on a small screen. */}
          {history && (
            <>
              <button type="button" className="sb-icon-btn" title="Undo (Ctrl+Z)" disabled={!history.canUndo} onClick={history.undo}><Undo2 size={14} /></button>
              <button type="button" className="sb-icon-btn" title="Redo (Ctrl+Shift+Z)" disabled={!history.canRedo} onClick={history.redo}><Redo2 size={14} /></button>
            </>
          )}
          <button type="button" className="sb-icon-btn" onClick={onClose}><X size={14} /></button>
        </div>
      </div>

      {block.type === 'text' && (
        <>
          <div className="gs-field">
            <div className="gs-label">Text</div>
            <textarea className="gs-input" rows={4} value={block.content.text || ''} onChange={(e) => updateContent({ text: e.target.value })} />
          </div>
          <div className="gs-field">
            <div className="gs-label">Font size</div>
            <input className="gs-input" type="number" min={10} max={72} value={block.content.fontSize || 18} onChange={(e) => updateContent({ fontSize: Number(e.target.value) || 18 })} />
          </div>
          <div className="gs-field">
            <div className="gs-label">Align</div>
            <select className="gs-select" value={block.content.align || 'left'} onChange={(e) => updateContent({ align: e.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div className="gs-field">
            <div className="gs-label">Text color</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={block.content.color && block.content.color !== 'inherit' ? block.content.color : '#2b2118'}
                onChange={(e) => updateContent({ color: e.target.value })} style={{ width: 40, height: 32, padding: 0, border: '1px solid var(--border)', borderRadius: 6 }} />
              <button type="button" className="sb-icon-btn" onClick={() => updateContent({ color: null })}>Use site default</button>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 8 }}>
            <input type="checkbox" checked={!!block.content.heading} onChange={(e) => updateContent({ heading: e.target.checked })} />
            Style as a heading (heading font + heading color from Look &amp; feel, unless overridden above)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 12 }}>
            <input type="checkbox" checked={!!block.content.eyebrow} onChange={(e) => updateContent({ eyebrow: e.target.checked })} />
            Style as an eyebrow label (uppercase, bold, letter-spaced)
          </label>
        </>
      )}

      {block.type === 'image' && (
        <div className="gs-field">
          <div className="gs-label">Image</div>
          {block.content.src && <img src={block.content.src} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />}
          <UploadFile apiextension="/business/upload" setInvestors={(filename) => uploadToUrl(filename, (url) => updateContent({ src: url }))} />
          <input className="gs-input" placeholder="Alt text (for accessibility)" value={block.content.alt || ''}
            onChange={(e) => updateContent({ alt: e.target.value })} style={{ marginTop: 8 }} />
        </div>
      )}

      {block.type === 'button' && (
        <>
          <div className="gs-field">
            <div className="gs-label">Button text</div>
            <input className="gs-input" value={block.content.text || ''} onChange={(e) => updateContent({ text: e.target.value })} />
          </div>
          <div className="gs-field">
            <div className="gs-label">Link (https://...)</div>
            <input className="gs-input" value={block.content.href || ''} onChange={(e) => updateContent({ href: e.target.value })} />
          </div>
          <div className="gs-field">
            <div className="gs-label">Style</div>
            {/* Every button on the site shares one look by default (Look &
                feel's Buttons picker) -- this is the escape hatch for the
                one button that should feel different, without having to
                change the site-wide default to get it. */}
            <select className="gs-select" value={block.content.buttonStyle || ''} onChange={(e) => updateContent({ buttonStyle: e.target.value || null })}>
              <option value="">Use site default</option>
              <option value="rounded">Rounded</option>
              <option value="pill">Pill</option>
              <option value="square">Square</option>
              <option value="outline">Outline</option>
            </select>
          </div>
          <div className="gs-field">
            <div className="gs-label">Text color</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={block.content.textColor || '#ffffff'} onChange={(e) => updateContent({ textColor: e.target.value })}
                style={{ width: 40, height: 32, padding: 0, border: '1px solid var(--border)', borderRadius: 6 }} />
              {block.content.textColor && (
                <button type="button" className="sb-icon-btn" onClick={() => updateContent({ textColor: null })}>Use site default</button>
              )}
            </div>
          </div>
        </>
      )}

      {block.type === 'map' && (
        <div className="gs-field">
          <div className="gs-label">Address</div>
          <input className="gs-input" value={block.content.address || ''} onChange={(e) => updateContent({ address: e.target.value })} />
        </div>
      )}

      {block.type === 'form' && (
        <div className="gs-field">
          <div className="gs-label">Heading</div>
          <input className="gs-input" value={block.content.heading || ''} onChange={(e) => updateContent({ heading: e.target.value })} />
          <div className="gs-label" style={{ marginTop: 12 }}>Style</div>
          <select className="gs-select" value={block.content.formStyle || ''} onChange={(e) => updateContent({ formStyle: e.target.value || null })}>
            <option value="">Use site default</option>
            <option value="boxed">Boxed</option>
            <option value="underline">Underline</option>
            <option value="soft">Soft</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, margin: '10px 0 0 0' }}>
            <input type="checkbox" checked={!!block.content.noCard} onChange={(e) => updateContent({ noCard: e.target.checked })} />
            No card background (use when the section around it already provides one)
          </label>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '10px 0 6px' }}>
            Name and email are always required (there's no way to reply otherwise). Everything below is yours to edit --
            add as many extra fields as you want, and mark any of them optional. Every answer is included in the
            notification and email you get.
          </p>
          <ItemListEditor
            items={block.content.fields || CONTACT_DEFAULT_EXTRA_FIELDS}
            // ItemListEditor's own "Add" just spreads `blank` (a static
            // object shared across every click), so a freshly-added field
            // has no `key` yet -- ContactFormBlock.js keys both its inputs
            // and its answer state by field.key, so every field needs one
            // of its own. Assigned here, once, the first time a field is
            // saved without one; already-keyed fields pass through untouched.
            onChange={(fields) => updateContent({ fields: fields.map((f, i) => (f.key ? f : { ...f, key: `field-${Date.now().toString(36)}-${i}` })) })}
            blank={{ label: '', type: 'text', required: false }}
            addLabel="Add field"
            fields={[
              { key: 'label', label: 'Field label', placeholder: 'Phone number' },
              { key: 'type', label: 'Type', type: 'select', options: ['text', 'email', 'tel', 'textarea'] },
              { key: 'required', label: '', checkboxLabel: 'Required', type: 'checkbox' },
            ]}
          />
        </div>
      )}

      {block.type === 'gallery' && (
        <div className="gs-field">
          <div className="gs-label">Images</div>
          <UploadFile apiextension="/business/upload" setInvestors={(filename) => uploadToUrl(filename, (url) => updateContent({ images: [...(block.content.images || []), url] }))} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {(block.content.images || []).map((src, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={src} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} />
                <button type="button" className="sb-icon-btn sb-gallery-remove"
                  onClick={() => updateContent({ images: block.content.images.filter((_, idx) => idx !== i) })}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {block.type === 'product_detail' && (
        <div className="gs-field">
          <div className="gs-label">Product</div>
          <ProductPicker businessId={businessId} value={block.content.productId} onChange={(productId) => updateContent({ productId })} />
        </div>
      )}

      {block.type === 'booking_widget' && (
        <div className="gs-field">
          <div className="gs-label">Service</div>
          <ServiceTypePicker businessId={businessId} value={block.content.serviceTypeId} onChange={(patch) => updateContent(patch)} />
        </div>
      )}

      {(block.type === 'donation_form' || block.type === 'membership_form' || block.type === 'holiday_seats_form') && (
        <div className="gs-field">
          <div className="gs-label">Heading</div>
          <input className="gs-input" value={block.content.heading || ''} onChange={(e) => updateContent({ heading: e.target.value })} style={{ marginBottom: 10 }} />
          <div className="gs-label">Intro text (optional)</div>
          <textarea className="gs-input" rows={2} value={block.content.intro || ''} onChange={(e) => updateContent({ intro: e.target.value })}
            placeholder="A line above the form explaining what it's for." />
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            {block.type === 'donation_form' && 'A full donation form -- amount, name, email -- that sends the visitor to your payment processor on submit.'}
            {block.type === 'membership_form' && "A full membership signup form -- tier, name, email -- that sets up a monthly standing order on submit."}
            {block.type === 'holiday_seats_form' && 'Lets visitors pick open holidays, seat counts, and pay for them, same as your dedicated holiday-seats page.'}
          </p>
          {block.type === 'membership_form' && (
            <>
              <div className="gs-label" style={{ marginTop: 10 }}>Membership tiers shown (optional — defaults to Associate/Full)</div>
              <ItemListEditor
                items={block.content.tiers}
                onChange={(tiers) => updateContent({ tiers })}
                blank={{ id: '', label: '', sub: '' }}
                addLabel="Add tier"
                fields={[
                  { key: 'id', label: 'ID (must be "associate" or "full")', placeholder: 'associate' },
                  { key: 'label', label: 'Label', placeholder: 'Associate Member' },
                  { key: 'sub', label: 'Price note (optional)', placeholder: '₪100 / month' },
                ]}
              />
            </>
          )}
        </div>
      )}

      {block.type === 'dynamic_form' && (
        <div className="gs-field">
          <div className="gs-label">Form</div>
          <FormPicker businessId={businessId} value={block.content.formSlug} onChange={(formSlug) => updateContent({ formSlug })} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, margin: '12px 0 6px' }}>
            <input type="checkbox" checked={!!block.content.cardHeader} onChange={(e) => updateContent({ cardHeader: e.target.checked })} />
            Card with a colored header strip (eyebrow + title + subtitle) above the fields
          </label>
          {!block.content.cardHeader && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 12 }}>
              <input type="checkbox" checked={!!block.content.noCard} onChange={(e) => updateContent({ noCard: e.target.checked })} />
              No card background (use when the section around it already provides one)
            </label>
          )}
          {block.content.cardHeader && (
            <>
              <div className="gs-label">Header eyebrow (optional)</div>
              <input className="gs-input" value={block.content.headerEyebrow || ''} onChange={(e) => updateContent({ headerEyebrow: e.target.value })} placeholder="Free, No-Obligation" style={{ marginBottom: 10 }} />
              <div className="gs-label">Header subtitle (optional)</div>
              <input className="gs-input" value={block.content.headerSubtitle || ''} onChange={(e) => updateContent({ headerSubtitle: e.target.value })} placeholder="Tell us about your building — we'll reach out within 24 hours." style={{ marginBottom: 10 }} />
            </>
          )}
          <div className="gs-label">Submit button text (optional)</div>
          <input className="gs-input" value={block.content.submitText || ''} onChange={(e) => updateContent({ submitText: e.target.value })} placeholder="Submit" style={{ marginBottom: 10 }} />
          <div className="gs-label">Helper text below the button (optional)</div>
          <input className="gs-input" value={block.content.helperText || ''} onChange={(e) => updateContent({ helperText: e.target.value })} placeholder="We'll prepare a custom proposal and reach out within 24 hours." />
        </div>
      )}

      {block.type === 'family_login_button' && (
        <div className="gs-field">
          <div className="gs-label">Button text</div>
          <input className="gs-input" value={block.content.text || ''} onChange={(e) => updateContent({ text: e.target.value })} />
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            Links to this site's family portal (/family-portal), where a family puts in their email, gets a one-time code,
            and sees their own donations, membership, and holiday seats. No separate page to build -- it already works.
          </p>
        </div>
      )}

      {block.type === 'faq_accordion' && (
        <div className="gs-field">
          <div className="gs-label">Heading (optional)</div>
          <input className="gs-input" value={block.content.heading || ''} onChange={(e) => updateContent({ heading: e.target.value })} style={{ marginBottom: 12 }} />
          <HeadingSizeColorControls content={block.content} updateContent={updateContent} />
          <DarkBackgroundToggle content={block.content} updateContent={updateContent} />
          <div className="gs-label">Questions</div>
          <ItemListEditor
            items={block.content.items}
            onChange={(items) => updateContent({ items })}
            blank={{ question: '', answer: '' }}
            addLabel="Add question"
            fields={[
              { key: 'question', label: 'Question', placeholder: 'What areas do you serve?' },
              { key: 'answer', label: 'Answer', type: 'textarea', placeholder: 'We serve...' },
            ]}
          />
        </div>
      )}

      {block.type === 'feature_grid' && (
        <div className="gs-field">
          <div className="gs-label">Heading (optional)</div>
          <input className="gs-input" value={block.content.heading || ''} onChange={(e) => updateContent({ heading: e.target.value })} style={{ marginBottom: 12 }} />
          <HeadingSizeColorControls content={block.content} updateContent={updateContent} />
          <div className="gs-label">Card style</div>
          <select className="gs-select" value={block.content.cardStyle || 'card'} onChange={(e) => updateContent({ cardStyle: e.target.value })} style={{ marginBottom: 12 }}>
            <option value="card">Bordered card (icon, title, description)</option>
            <option value="row">Row (round icon left, text right, no border)</option>
            <option value="checklist">Checklist (check mark + one line, light card)</option>
            <option value="timeline">Timeline (a short badge like a year, instead of an icon)</option>
            <option value="stat">Stat (a big number + small label, no icon or border)</option>
            <option value="panel">Panel (a simple bordered box: heading + text, no icon)</option>
          </select>
          <GridColumnsControl value={block.content.columns} onChange={(columns) => updateContent({ columns })} />
          <DarkBackgroundToggle content={block.content} updateContent={updateContent} />
          <div className="gs-label">Items</div>
          <ItemListEditor
            items={block.content.items}
            onChange={(items) => updateContent({ items })}
            blank={{ icon: 'Star', title: '', description: '', badge: '' }}
            addLabel="Add item"
            fields={
              block.content.cardStyle === 'timeline'
                ? [
                  { key: 'badge', label: 'Badge (e.g. a year)', placeholder: '2011' },
                  { key: 'title', label: 'Title', placeholder: 'Where it started' },
                  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'A short description...' },
                ]
                : block.content.cardStyle === 'stat'
                  ? [
                    { key: 'title', label: 'Number', placeholder: '2011' },
                    { key: 'description', label: 'Label', placeholder: 'Managing NYC Properties Since' },
                  ]
                  : block.content.cardStyle === 'panel'
                    ? [
                      { key: 'title', label: 'Heading', placeholder: 'Where to Find Us' },
                      { key: 'description', label: 'Text', type: 'textarea', placeholder: 'Across from...' },
                      { key: 'href', label: 'Links to (optional)', placeholder: '/services' },
                    ]
                    : block.content.cardStyle === 'checklist'
                    ? [
                      { key: 'icon', label: 'Icon', type: 'select', options: ICON_NAMES },
                      { key: 'title', label: 'Text', placeholder: 'Financial clarity & precision' },
                    ]
                    : [
                      { key: 'icon', label: 'Icon', type: 'select', options: ICON_NAMES },
                      { key: 'title', label: 'Title', placeholder: 'Financial Management' },
                      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'A short description...' },
                      { key: 'badge', label: 'Badge (optional, e.g. "New")', placeholder: 'New' },
                      { key: 'href', label: 'Links to (optional)', placeholder: '/services' },
                    ]
            }
          />
        </div>
      )}

      {block.type === 'testimonial_grid' && (
        <div className="gs-field">
          <div className="gs-label">Heading (optional)</div>
          <input className="gs-input" value={block.content.heading || ''} onChange={(e) => updateContent({ heading: e.target.value })} style={{ marginBottom: 12 }} />
          <HeadingSizeColorControls content={block.content} updateContent={updateContent} />
          <div className="gs-label">Style</div>
          <select className="gs-select" value={block.content.cardStyle || 'card'} onChange={(e) => updateContent({ cardStyle: e.target.value })} style={{ marginBottom: 12 }}>
            <option value="card">Cards (boxed, with a quote icon)</option>
            <option value="quote">Pull-quote (one large centered quote, no card)</option>
          </select>
          {(block.content.cardStyle || 'card') === 'card' && (
            <GridColumnsControl value={block.content.columns} onChange={(columns) => updateContent({ columns })} />
          )}
          <DarkBackgroundToggle content={block.content} updateContent={updateContent} />
          <div className="gs-label">Testimonials</div>
          <ItemListEditor
            items={block.content.items}
            onChange={(items) => updateContent({ items })}
            blank={{ quote: '', author: '', role: '' }}
            addLabel="Add testimonial"
            fields={[
              { key: 'quote', label: 'Quote', type: 'textarea', placeholder: 'What they said...' },
              { key: 'author', label: 'Name', placeholder: 'Jane Smith' },
              { key: 'role', label: 'Title / company (optional)', placeholder: 'Board President, 123 Main St' },
            ]}
          />
        </div>
      )}

      {block.type === 'service_list' && (
        <div className="gs-field">
          <div className="gs-label">Heading (optional)</div>
          <input className="gs-input" value={block.content.heading || ''} onChange={(e) => updateContent({ heading: e.target.value })} style={{ marginBottom: 12 }} />
          <HeadingSizeColorControls content={block.content} updateContent={updateContent} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 12 }}>
            <input type="checkbox" checked={block.content.numbered !== false} onChange={(e) => updateContent({ numbered: e.target.checked })} />
            Show numbered index (01, 02, …)
          </label>
          <DarkBackgroundToggle content={block.content} updateContent={updateContent} />
          <div className="gs-label">Services</div>
          <ItemListEditor
            items={block.content.items}
            onChange={(items) => updateContent({ items })}
            blank={{ icon: 'Star', title: '', description: '', points: [] }}
            addLabel="Add service"
            fields={[
              { key: 'icon', label: 'Icon', type: 'select', options: ICON_NAMES },
              { key: 'title', label: 'Title', placeholder: 'Condo & Co-op Management' },
              { key: 'description', label: 'Description', type: 'textarea', placeholder: 'A paragraph describing this service...' },
              { key: 'points', label: 'Supporting points (one per line)', type: 'list', placeholder: 'Dedicated property manager\nMonthly financial statements' },
              { key: 'href', label: 'Links to (optional)', placeholder: '/services#this-one' },
            ]}
          />
        </div>
      )}

      {block.type === 'logo_strip' && (
        <div className="gs-field">
          <div className="gs-label">Heading (optional)</div>
          <input className="gs-input" value={block.content.heading || ''} onChange={(e) => updateContent({ heading: e.target.value })} placeholder="As Featured In" style={{ marginBottom: 10 }} />
          <HeadingSizeColorControls content={block.content} updateContent={updateContent} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 12 }}>
            <input type="checkbox" checked={block.content.grayscale !== false} onChange={(e) => updateContent({ grayscale: e.target.checked })} />
            Grayscale logos (color on hover)
          </label>
          <DarkBackgroundToggle content={block.content} updateContent={updateContent} />
          <div className="gs-label">Logos</div>
          <ItemListEditor
            items={block.content.items}
            onChange={(items) => updateContent({ items })}
            blank={{ src: null, alt: '', href: '' }}
            addLabel="Add logo"
            fields={[
              { key: 'src', label: 'Image', type: 'image' },
              { key: 'alt', label: 'Name (shown if no image)', placeholder: 'Acme Co.' },
              { key: 'href', label: 'Links to (optional)', placeholder: 'https://example.com' },
            ]}
          />
        </div>
      )}

      {block.type === 'callout' && (
        <div className="gs-field">
          <div className="gs-label">Icon</div>
          <select className="gs-select" value={block.content.icon || 'Phone'} onChange={(e) => updateContent({ icon: e.target.value })} style={{ marginBottom: 12 }}>
            {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <div className="gs-label">Color</div>
          <select className="gs-select" value={block.content.colorScheme || 'red'} onChange={(e) => updateContent({ colorScheme: e.target.value })} style={{ marginBottom: 12 }}>
            <option value="red">Red (warning / emergency)</option>
            <option value="amber">Amber (caution)</option>
            <option value="blue">Blue (info)</option>
            <option value="green">Green (success / tip)</option>
            <option value="gray">Gray (neutral)</option>
          </select>
          <div className="gs-label">Heading</div>
          <input className="gs-input" value={block.content.heading || ''} onChange={(e) => updateContent({ heading: e.target.value })} style={{ marginBottom: 6 }} />
          <input className="gs-input" type="number" min={11} max={28} value={block.content.headingSize || 15}
            onChange={(e) => updateContent({ headingSize: Number(e.target.value) || 15 })} placeholder="Heading text size (px)" style={{ marginBottom: 12 }} />
          <div className="gs-label">Text</div>
          <textarea className="gs-input" rows={3} value={block.content.text || ''} onChange={(e) => updateContent({ text: e.target.value })} style={{ marginBottom: 6 }} />
          <input className="gs-input" type="number" min={10} max={22} value={block.content.textSize || 13}
            onChange={(e) => updateContent({ textSize: Number(e.target.value) || 13 })} placeholder="Body text size (px)" />
        </div>
      )}

      {block.type === 'google_reviews_badge' && (
        <div className="gs-field">
          <div className="gs-label">Rating (out of 5)</div>
          <input className="gs-input" type="number" min={0} max={5} step={0.1} value={block.content.rating ?? 5}
            onChange={(e) => updateContent({ rating: Number(e.target.value) })} style={{ marginBottom: 12 }} />
          <div className="gs-label">Review count (optional)</div>
          <input className="gs-input" type="number" min={0} step={1} value={block.content.reviewCount ?? ''}
            placeholder="e.g. 27" onChange={(e) => updateContent({ reviewCount: e.target.value ? Number(e.target.value) : null })} style={{ marginBottom: 12 }} />
          <div className="gs-label">Link to your Google reviews (optional)</div>
          <input className="gs-input" value={block.content.url || ''} placeholder="https://g.page/r/.../review"
            onChange={(e) => updateContent({ url: e.target.value })} />
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
            Enter these from your Google Business Profile -- they're not fetched automatically. Update them here whenever your rating changes.
            Find your review link under your Business Profile's "Ask for reviews" / share link.
          </p>
        </div>
      )}

      {def?.requiresModule && (
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          This block goes live once "{moduleLabelFor(def.requiresModule)}" is turned on in your site's Features.
        </p>
      )}

      {block.type !== 'spacer' && (
        <>
          <hr style={{ margin: '16px 0', border: 0, borderTop: '1px solid var(--border, #e5e1d6)' }} />
          <div className="gs-field">
            {/* Generic, works on any block -- a panel/backdrop behind the
                block's own content, independent of whatever that content
                already draws (a plain text/button/FAQ block has no
                background of its own at all; a card-style block like
                feature_grid still shows it through the gaps between
                cards). Applied on the same wrapper div in Canvas.js
                (editable) and PublicSiteRenderer.js (both the desktop and
                mobile trees) -- see block.style there. */}
            <div className="gs-label">Background</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <input type="color" value={block.style?.bg || '#ffffff'} onChange={(e) => updateStyle({ bg: e.target.value })}
                style={{ width: 40, height: 32, padding: 0, border: '1px solid var(--border)', borderRadius: 6 }} />
              {block.style?.bg && (
                <button type="button" className="sb-icon-btn" onClick={() => updateStyle({ bg: null })}>None</button>
              )}
            </div>
            {block.style?.bg && (
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Corner radius
                  <input className="gs-input" type="number" min={0} max={48} style={{ width: 70 }}
                    value={block.style?.radius ?? 0} onChange={(e) => updateStyle({ radius: Number(e.target.value) || 0 })} />
                </label>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Inner padding
                  <input className="gs-input" type="number" min={0} max={64} style={{ width: 70 }}
                    value={block.style?.padding ?? 0} onChange={(e) => updateStyle({ padding: Number(e.target.value) || 0 })} />
                </label>
              </div>
            )}
          </div>
        </>
      )}

      <hr style={{ margin: '16px 0', border: 0, borderTop: '1px solid var(--border, #e5e1d6)' }} />
      <div className="gs-field">
        <div className="gs-label">Position &amp; size (% of this section)</div>
        {/* One click to stretch instead of dragging the resize handle (or
            typing exact numbers below) to get there -- the quickest way to
            fix a block that looks squished at its default size. */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" className="sb-icon-btn" onClick={() => update({ x: 0, w: 100 })}>Fill width</button>
          <button type="button" className="sb-icon-btn" onClick={() => update({ y: 0, h: 100 })}>Fill height</button>
          <button type="button" className="sb-icon-btn" onClick={() => update({ x: 0, y: 0, w: 100, h: 100 })}>Fill section</button>
        </div>
        <NudgeControls block={block} onChange={update} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <LabeledNumber label="X" value={block.x} onChange={(v) => update({ x: v })} />
          <LabeledNumber label="Y" value={block.y} onChange={(v) => update({ y: v })} />
          <LabeledNumber label="Width" value={block.w} onChange={(v) => update({ w: v })} />
          <LabeledNumber label="Height" value={block.h} onChange={(v) => update({ h: v })} />
        </div>
      </div>
    </div>
  );
}
