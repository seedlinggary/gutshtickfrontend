import { useCallback, useRef, useState } from 'react';

// How long a burst of rapid changes (a drag gesture firing on every
// pointermove, a text field firing on every keystroke) gets folded into
// ONE undo step. Without this, Ctrl+Z after dragging a block would only
// nudge it back by a pixel instead of undoing the whole move -- too fine-
// grained to be useful. 500ms comfortably covers a normal drag or a burst
// of typing; a genuinely separate edit that happens to land within that
// window just gets bundled into the same undo step, which is the right
// tradeoff for a page builder (nobody wants 40 undo steps for one hero
// section).
const COALESCE_MS = 500;
const MAX_HISTORY = 50;

/** Drop-in replacement for useState that also tracks undo/redo history.
 * `set` accepts the same value-or-updater-function shape useState's
 * setter does, so every existing `onChange={setSections}` call site needs
 * no changes at all. Pass `{ commit: true }` as a second arg to force a
 * new history step regardless of timing (used for discrete actions like
 * "add block" or "delete section", which should never merge with
 * whatever happened just before them). */
export default function useHistoryState(initial) {
  const [state, setState] = useState({ past: [], present: initial, future: [] });
  const lastPushRef = useRef(0);

  const set = useCallback((updater, opts) => {
    setState((s) => {
      const next = typeof updater === 'function' ? updater(s.present) : updater;
      if (next === s.present) return s;
      const now = Date.now();
      const shouldPush = opts?.commit || now - lastPushRef.current > COALESCE_MS;
      lastPushRef.current = now;
      if (!shouldPush) {
        // Still inside the same burst -- update present in place without
        // opening a new history step (the step's "before" snapshot stays
        // whatever it was at the start of this burst).
        return { ...s, present: next };
      }
      return { past: [...s.past.slice(-(MAX_HISTORY - 1)), s.present], present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    lastPushRef.current = 0; // next edit after an undo always starts a fresh step
    setState((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      return { past: s.past.slice(0, -1), present: previous, future: [s.present, ...s.future] };
    });
  }, []);

  const redo = useCallback(() => {
    lastPushRef.current = 0;
    setState((s) => {
      if (s.future.length === 0) return s;
      const [next, ...rest] = s.future;
      return { past: [...s.past, s.present], present: next, future: rest };
    });
  }, []);

  const reset = useCallback((value) => {
    lastPushRef.current = 0;
    setState({ past: [], present: value, future: [] });
  }, []);

  return [state.present, set, { undo, redo, reset, canUndo: state.past.length > 0, canRedo: state.future.length > 0 }];
}
