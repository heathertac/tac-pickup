export const ROLES = {
  'heather@theafterschoolcollective.org': {
    role: 'admin',
    name: 'Heather',
    displayName: 'Heather Tetterton',
    title: 'Administrative Director',
    avatarBg: '#7A3820',
    canViewAs: ['rebecca', 'jessica'],
  },
  'rebecca@theafterschoolcollective.org': {
    role: 'studio',
    name: 'Rebecca',
    displayName: 'Rebecca Whittemore',
    title: 'Studio Manager',
    avatarBg: '#4A3F6B',
    canViewAs: [],
  },
  'jess@theafterschoolcollective.org': {
    role: 'owner',
    name: 'Jessica',
    displayName: 'Jessica Chakarji',
    title: 'Owner',
    avatarBg: '#2A4A3A',
    canViewAs: [],
  },
  'jessica@theafterschoolcollective.org': {
    role: 'owner',
    name: 'Jessica',
    displayName: 'Jessica Chakarji',
    title: 'Owner',
    avatarBg: '#2A4A3A',
    canViewAs: [],
  },
  'info@theafterschoolcollective.org': {
    role: 'admin',
    name: 'Admin',
    displayName: 'TAC Admin',
    title: 'Administrator',
    avatarBg: '#5A4A2A',
    canViewAs: ['rebecca', 'jessica'],
  },
};

const ROLE_BY_NAME = {
  rebecca: 'studio',
  jessica: 'owner',
  heather: 'admin',
};

const SESSION_KEY = 'tac_ops_session';

let _currentUser = null;
let _viewingAs   = null;

export function getCurrentUser()      { return _currentUser; }
export function getViewingAs()        { return _viewingAs || _currentUser; }
export function isViewingOwnDashboard() { return _viewingAs === null; }

export function setViewAs(roleName) {
  if (!_currentUser) return;
  if (!roleName || roleName === _currentUser.name.toLowerCase()) {
    _viewingAs = null;
  } else {
    _viewingAs = {
      role: ROLE_BY_NAME[roleName] || roleName,
      name: roleName.charAt(0).toUpperCase() + roleName.slice(1),
      isProxied: true,
    };
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session?.email) {
      const profile = ROLES[session.email.toLowerCase()];
      if (profile) {
        _currentUser = { email: session.email, ...profile };
        return _currentUser;
      }
    }
  } catch {}
  return null;
}

export function signIn(email, password) {
  const profile = ROLES[email.toLowerCase()];
  if (!profile) throw new Error('Email not recognized as a TAC team member.');
  if (password !== 'tacops2026') throw new Error('Incorrect password.');
  _currentUser = { email, ...profile };
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email }));
  return _currentUser;
}

export function signOut() {
  _currentUser = null;
  _viewingAs   = null;
  localStorage.removeItem(SESSION_KEY);
}
