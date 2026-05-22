import { getNotes as fetchNotes, saveNotes as persistNotes } from './airtable.js';

const SAVE_DELAY = 1500;
let _saveTimer = null;
let _recordId  = null;

function localKey(email) { return `tac_notes_${email}`; }

export async function loadNotes(userEmail) {
  _recordId = null;
  const local = localStorage.getItem(localKey(userEmail)) || '';
  try {
    const data = await fetchNotes(userEmail);
    if (data.id)      _recordId = data.id;
    if (data.content) localStorage.setItem(localKey(userEmail), data.content);
    return data.content || local;
  } catch {
    return local;
  }
}

export function saveNotesDebounced(userEmail, content) {
  localStorage.setItem(localKey(userEmail), content);
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    try {
      const result = await persistNotes(userEmail, content, _recordId);
      if (result.id && !_recordId) _recordId = result.id;
    } catch {}
  }, SAVE_DELAY);
}
