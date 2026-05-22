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
  });
  document.getElementById('auth-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleEmailSignIn();
  });
  document.getElementById('google-sign-in').addEventListener('click', () => {
    document.getElementById('auth-error').textContent =
      'Use email sign-in for now — Google login coming soon.';
  });
}

async function handleEmailSignIn() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl    = document.getElementById('auth-error');
  errEl.textContent = '';
  try {
    const user = signIn(email, password);
    await showApp(user);
  } catch (err) {
    errEl.textContent = err.message;
  }
}

function buildSidebar(user) {
  const nav       = document.getElementById('sidebar-nav');
  const userEl    = document.getElementById('sidebar-user');
  const viewingAs = getViewingAs();
  const effective = viewingAs?.isProxied ? viewingAs.role : user.role;
  const navItems  = getNavItems(effective);

  nav.innerHTML = navItems.map(item => {
    if (item.type === 'section') return `<div class="nav-section">${item.label}</div>`;
    const badge = item.badge ? `<span class="nav-badge">${item.badge}</span>` : '';
    return `<div class="nav-item${currentPage === item.page ? ' active' : ''}" data-page="${item.page}">
      <i class="ti ${item.icon}" aria-hidden="true"></i>${item.label}${badge}
    </div>`;
  }).join('');

  buildViewAsBar(user, viewingAs);

  userEl.innerHTML = `
    <div class="user-avatar" style="background:${user.avatarBg}">${user.name.slice(0,2).toUpperCase()}</div>
    <div class="user-info">
      <div class="user-name">${user.name}</div>
      <div class="user-role">${user.title}</div>
    </div>
    <button class="sign-out-btn" id="sign-out-btn" title="Sign out">&#x2715;</button>`;

  document.getElementById('sign-out-btn').addEventListener('click', () => {
    signOut();
    showAuth();
  });

  nav.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.page === 'notes') { toggleNotes(); return; }
      navigateTo(el.dataset.page);
    });
  });

  buildMobileNav(navItems);
}

function buildViewAsBar(user, viewingAs) {
  const mainArea = document.querySelector('.main-area');
  let vaBar = document.getElementById('view-as-bar');

  if (!user.canViewAs?.length) {
    if (vaBar) vaBar.remove();
    return;
  }

  if (!vaBar) {
    vaBar = document.createElement('div');
    vaBar.id        = 'view-as-bar';
    vaBar.className = 'view-as-bar';
    mainArea.insertBefore(vaBar, mainArea.firstChild);
  }

  const current = viewingAs?.isProxied
    ? viewingAs.name.toLowerCase()
    : user.name.toLowerCase();

  vaBar.innerHTML = `
    <span class="va-label">Viewing as</span>
    <button class="va-btn ${current === user.name.toLowerCase() ? 'active' : ''}"
      data-view="${user.name.toLowerCase()}">${user.name}</button>
    ${user.canViewAs.map(n => `
      <button class="va-btn ${current === n ? 'active' : ''}" data-view="${n}">
        ${n.charAt(0).toUpperCase() + n.slice(1)}
      </button>`).join('')}`;

  vaBar.querySelectorAll('.va-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const val =
