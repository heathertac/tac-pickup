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
      const val = btn.dataset.view;
      setViewAs(val === user.name.toLowerCase() ? null : val);
      buildSidebar(user);
      await navigateTo('dashboard');
    });
  });
}

function getNavItems(role) {
  const notesItem = { page: 'notes', label: 'My notes', icon: 'ti-notes' };

  if (role === 'studio') return [
    { page: 'dashboard',      label: 'Dashboard',       icon: 'ti-layout-dashboard' },
    { type: 'section', label: 'Pickups' },
    { page: 'pickups-today',  label: "Today's pickups", icon: 'ti-list-check' },
    { page: 'pickup-changes', label: 'Changes',         icon: 'ti-alert-circle' },
    { page: 'pickup-week',    label: 'This week',       icon: 'ti-calendar-week' },
    { type: 'section', label: 'Studio' },
    { page: 'students',       label: 'Students',        icon: 'ti-users' },
    { page: 'attendance',     label: 'Attendance',      icon: 'ti-clock' },
    { page: 'incidents',      label: 'Incidents',       icon: 'ti-alert-triangle' },
    { type: 'section', label: 'Workspace' },
    notesItem,
  ];

  if (role === 'admin') return [
    { page: 'dashboard',      label: 'Dashboard',       icon: 'ti-layout-dashboard' },
    { type: 'section', label: 'Inbox' },
    { page: 'pipeline',       label: 'Pipeline',        icon: 'ti-inbox',        badge: '7' },
    { page: 'calls',          label: 'Calls',           icon: 'ti-phone',        badge: '3' },
    { page: 'parties',        label: 'Party requests',  icon: 'ti-cake',         badge: '2' },
    { type: 'section', label: 'Operations' },
    { page: 'tasks',          label: 'My tasks',        icon: 'ti-checkbox' },
    { page: 'welcome-emails', label: 'Welcome emails',  icon: 'ti-mail' },
    { page: 'pickup-changes', label: 'Pickup changes',  icon: 'ti-arrow-shuffle' },
    { type: 'section', label: 'Finance' },
    { page: 'credits',        label: 'Credits ledger',  icon: 'ti-receipt' },
    { page: 'commissions',    label: 'Commissions',     icon: 'ti-coin' },
    { type: 'section', label: 'Workspace' },
    notesItem,
  ];

  if (role === 'owner') return [
    { page: 'dashboard',      label: 'Overview',        icon: 'ti-layout-dashboard' },
    { type: 'section', label: 'Business' },
    { page: 'projects',       label: 'Projects',        icon: 'ti-briefcase' },
    { page: 'metrics',        label: 'Metrics',         icon: 'ti-chart-bar' },
    { page: 'fall-schedule',  label: 'Fall schedule',   icon: 'ti-calendar' },
    { type: 'section', label: 'Operations' },
    { page: 'pipeline',       label: 'Pipeline',        icon: 'ti-inbox',        badge: '7' },
    { page: 'pickups-today',  label: 'Pickups',         icon: 'ti-arrow-shuffle' },
    { page: 'families',       label: 'Families',        icon: 'ti-users' },
    { type: 'section', label: 'Admin' },
    { page: 'doe',            label: 'DOE Contract',    icon: 'ti-file-dollar' },
    { page: 'commissions',    label: 'Commissions',     icon: 'ti-coin' },
    { page: 'settings',       label: 'Settings',        icon: 'ti-settings' },
    { type: 'section', label: 'Workspace' },
    notesItem,
  ];

  return [
    { page: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard' },
    { type: 'section', label: 'Workspace' },
    notesItem,
  ];
}

function buildMobileNav(items) {
  const mobileNav = document.getElementById('mobile-nav');
  const top = items.filter(i => i.type !== 'section' && i.page !== 'notes').slice(0, 4);
  mobileNav.innerHTML = `<div class="mobile-nav-inner">
    ${top.map(item => `
      <div class="mobile-tab${currentPage === item.page ? ' active' : ''}" data-page="${item.page}">
        <i class="ti ${item.icon}" aria-hidden="true"></i>
        ${item.label.split(' ')[0]}
      </div>`).join('')}
  </div>`;
  mobileNav.querySelectorAll('.mobile-tab').forEach(tab => {
    tab.addEventListener('click', () => navigateTo(tab.dataset.page));
  });
}

window.tacNav = (page) => navigateTo(page);

async function navigateTo(page) {
  currentPage = page;
  const content   = document.getElementById('main-content');
  const user      = getCurrentUser();
  const viewingAs = getViewingAs();
  const effective = viewingAs?.isProxied ? viewingAs.role : user.role;

  if (notesOpen && page !== 'notes') {
    notesOpen = false;
    document.getElementById('notes-panel').classList.remove('open');
  }

  document.querySelectorAll('.nav-item, .mobile-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  switch (page) {
    case 'dashboard':
    case 'pickups-today':
      if (effective === 'studio')      await renderPickupDashboard(content);
      else if (effective === 'admin')  await renderAdminHub(content);
      else                             await renderCommandCenter(content);
      break;
    case 'pipeline':
    case 'calls':
    case 'parties':
      renderPipeline(content);
      break;
    default:
      content.innerHTML = `
        <div class="hero">
          <div class="hero-eyebrow">Coming soon</div>
          <div class="hero-status">
            ${page.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
        </div>
        <div class="item-row" style="max-width:480px;">
          <div class="item-dot stone"></div>
          <div class="item-text">This section is being built. Check back soon.</div>
        </div>`;
  }

  buildSidebar(user);
}

async function setupNotesPanel(user) {
  const body  = document.getElementById('notes-body');
  const meta  = document.getElementById('notes-meta');
  const close = document.getElementById('notes-close');

  close.addEventListener('click', () => toggleNotes());

  meta.textContent = 'Loading...';
  try {
    const content    = await loadNotes(user.email);
    body.value       = content;
    meta.textContent = 'Private to you · auto-saves';
  } catch {
    body.value       = localStorage.getItem(`tac_notes_${user.email}`) || '';
    meta.textContent = 'Saved locally';
  }

  body.addEventListener('input', () => {
    saveNotesDebounced(user.email, body.value);
    meta.textContent = 'Saving...';
    clearTimeout(body._metaTimer);
    body._metaTimer = setTimeout(() => {
      meta.textContent = 'Private to you · auto-saves';
    }, 1800);
  });
}

function toggleNotes() {
  const panel      = document.getElementById('notes-panel');
  const body       = document.getElementById('notes-body');
  const viewingAs  = getViewingAs();

  notesOpen = !notesOpen;
  panel.classList.toggle('open', notesOpen);

  if (notesOpen) {
    let privateMsg = panel.querySelector('.notes-private-msg');
    if (viewingAs?.isProxied) {
      body.style.display = 'none';
      if (!privateMsg) {
        privateMsg = document.createElement('div');
        privateMsg.className   = 'notes-private-msg';
        privateMsg.textContent = 'Notes are private to each user and cannot be viewed by others.';
        panel.appendChild(privateMsg);
      }
    } else {
      body.style.display = '';
      if (privateMsg) privateMsg.remove();
      body.focus();
    }
  }
}

init();
