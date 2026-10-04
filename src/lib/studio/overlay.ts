/**
 * Tracks how many Studio Mode overlays are currently open.
 *
 * Studio Mode can stack two mouse-and-keyboard affordances: the editor drawer
 * and the toolbar's "unsaved drafts" confirmation. Both want the Escape key, so
 * a shared counter lets the topmost overlay claim it instead of both reacting to
 * the same keypress (which used to close the drawer *and* the confirmation).
 *
 * Deliberately a module-level counter rather than React state: the check happens
 * inside native keydown handlers where a stale render closure would otherwise
 * report the wrong value.
 */
let openOverlays = 0;

/** Registers an overlay as open and returns its release function. */
export function trackStudioOverlay(): () => void {
  openOverlays += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    openOverlays = Math.max(0, openOverlays - 1);
  };
}

/** True when any studio overlay is open on top of the storefront. */
export function hasOpenStudioOverlay(): boolean {
  return openOverlays > 0;
}

/** Test helper: resets the counter between cases. */
export function resetStudioOverlays() {
  openOverlays = 0;
}
