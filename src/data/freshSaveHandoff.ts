import type { SaveCommitField } from "../components/SaveCommitOverlay";

// One-shot handoff from /patient/new to /patient/:hn so the destination
// page can play the SaveCommitOverlay animation without us having to
// serialize React components (Icon refs) into the History API's state,
// which would throw `DataCloneError`. Lives in module scope — keyed by
// HN so the destination grabs the right batch even if multiple saves
// happen back-to-back.

interface FreshSave {
  fields: SaveCommitField[];
}

const pending = new Map<string, FreshSave>();

export function stashFreshSave(hn: string, save: FreshSave) {
  pending.set(hn, save);
}

export function takeFreshSave(hn: string): FreshSave | undefined {
  const v = pending.get(hn);
  if (v) pending.delete(hn);
  return v;
}
