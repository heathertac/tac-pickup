import { formatDateHeader } from './lib/airtable.js';
import { loadSession, signIn, signOut, getCurrentUser, getViewingAs, setViewAs } from './lib/auth.js';
import { loadNotes, saveNotesDebounced } from './lib/notes.js';
import { renderPickupDashboard } from './pages/rebecca.js';
import { renderAdminHub } from './pages/heather.js';
import { renderCommandCenter } from './pages/jessica.js';
import { renderPipeline } from './pages/pipeline.js';

let currentPage = 'dashboard';
let notesOpen   = false;

async function init() {
  const user = loadSession();
  if (user) {
    await showApp(user);
  } else {
    showAuth();
  }
  setupAuthHandlers();
}

function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display  = 'none';
}

async function showApp(user) {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = 'flex';
  buildSidebar(user);
  await navigateTo('dashboard');
  setupNotesPanel(user);
}

function setupAuthHandlers() {
  document.getElementById('email-sign-in').addEventListener('click', handleEmailSignIn);
  document.getElementById('auth-email').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('auth-password').focus();
