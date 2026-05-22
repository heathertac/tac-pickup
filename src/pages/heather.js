import { getTasks, getChangesToday, formatDateHeader } from '../lib/airtable.js';

export async function renderAdminHub(container) {
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <div class="loading-text">Loading your dashboard...</div>
    </div>`;

  try {
    const [tResult, cResult] = await Promise.allSettled([
      getTasks('Heather'),
      getChangesToday(),
    ]);

    const tasks   = tResult.status === 'fulfilled' ? (tResult.value.records || []) : [];
    const changes = cResult.status === 'fulfilled' ? (cResult.value.records || []) : [];

    container.innerHTML = buildAdminHub(tasks, changes);

  } catch (err) {
    container.innerHTML = `
      <div class="error-state">
        <strong>Could not load dashboard.</strong><br>${err.message}
        <br><button class="retry-btn" onclick="location.reload()">Retry</button>
      </div>`;
  }
}

function buildAdminHub(tasks, changes) {
  const today    = new Date().toISOString().split('T')[0];
  const highPri  = tasks.filter(t => (t.fields['Priority'] || '') === 'High');
  const dueToday = tasks.filter(t => (t.fields['Due Date'] || '') === today);
  const unacked  = changes.filter(r => !r.fields['Instructor Acknowledged']);

  let heroText = 'Good morning, Heather.';
  let heroClass = '';
  if (dueToday.length > 0) {
    heroText  = `${dueToday.length} task${dueToday.length > 1 ? 's' : ''} due today.`;
    heroClass = 'warn';
  }

  return `
    <div class="hero">
      <div class="hero-eyebrow">${formatDateHeader()}</div>
      <div class="hero-status ${heroClass}">${heroText}</div>
      <div class="hero-pills">
        ${dueToday.length > 0  ? `<span class="pill pill-terra">${dueToday.length} due today</span>` : ''}
        ${highPri.length > 0   ? `<span class="pill pill-sand">${highPri.length} high priority</span>` : ''}
        ${changes.length > 0   ? `<span class="pill pill-stone">${changes.length} change${changes.length > 1 ? 's' : ''} today</span>` : ''}
        ${unacked.length > 0   ? `<span class="pill pill-terra">${unacked.length} unacknowledged</span>` : ''}
      </div>
    </div>

    <div class="stats-grid cols-4">
      <div class="stat-card"><div class="stat-n terra">${dueToday.length}</div><div class="stat-l">Due today</div></div>
      <div class="stat-card"><div class="stat-n sand">${highPri.length}</div><div class="stat-l">High priority</div></div>
      <div class="stat-card"><div class="stat-n cream">${tasks.length}</div><div class="stat-l">Total open tasks</div></div>
      <div class="stat-card"><div class="stat-n ${unacked.length > 0 ? 'terra' : 'sage'}">${changes.length}</div><div class="stat-l">Changes today</div></div>
    </div>

    <div class="content-grid cols-2">
      <div>
        <div class="section-block">
          <div class="section-title">Tasks due today</div>
          ${dueToday.length > 0
            ? dueToday.map(t => taskRow(t)).join('')
            : `<div class="item-row good"><div class="item-dot sage"></div><div class="item-text">No tasks due today.</div></div>`}
        </div>
        <div class="section-block">
          <div class="section-title">All high priority</div>
          ${highPri.length > 0
            ? highPri.map(t => taskRow(t)).join('')
            : `<div class="text-muted" style="padding:8px 0;">No high priority tasks open.</div>`}
        </div>
      </div>
      <div>
        <div class="section-block">
          <div class="section-title">Today's pickup changes</div>
          ${changes.length > 0
            ? changes.map(r => {
                const summary = r.fields['Change Summary'] || 'Route change';
                const notes   = r.fields['Notes'] || '';
                const acked   = r.fields['Instructor Acknowledged'];
                return `<div class="item-row ${acked ? '' : 'warn'}">
                  <div class="item-dot ${acked ? 'stone' : 'sand'}"></div>
                  <div class="item-text"><strong>${summary}</strong>${notes ? `<br><span style="color:var(--text-3)">${notes}</span>` : ''}</div>
                  <span class="item-badge ${acked ? 'badge-change' : 'badge-pickup'}">${acked ? 'Acked' : 'Pending'}</span>
                </div>`;
              }).join('')
            : `<div class="item-row good"><div class="item-dot sage"></div><div class="item-text">No changes today.</div></div>`}
        </div>
        <div class="section-block">
          <div class="section-title">Quick actions</div>
          <div class="item-row" style="cursor:pointer" onclick="window.tacNav('pipeline')">
            <div class="item-dot sand"></div>
            <div class="item-text"><strong>Inbound pipeline</strong> — calls, party requests, enrollment changes</div>
          </div>
          <div class="item-row" style="cursor:pointer" onclick="window.tacNav('credits')">
            <div class="item-dot stone"></div>
            <div class="item-text"><strong>Credits ledger</strong> — open credits and promo codes</div>
          </div>
          <div class="item-row" style="cursor:pointer" onclick="window.tacNav('welcome-emails')">
            <div class="item-dot sage"></div>
            <div class="item-text"><strong>Welcome email queue</strong> — pending welcome emails</div>
          </div>
        </div>
      </div>
    </div>`;
}

function taskRow(t) {
  const name     = t.fields['Task']     || 'Untitled task';
  const priority = t.fields['Priority'] || '';
  const category = t.fields['Category'] || '';
  const notes    = t.fields['Notes']    || '';
  const dotClass = priority === 'High' ? 'terra' : priority === 'Medium' ? 'sand' : 'stone';
  const rowClass = priority === 'High' ? 'urgent' : priority === 'Medium' ? 'warn' : '';

  let badgeClass = 'badge-change';
  const cat = (category || '').toLowerCase();
  if (cat.includes('pickup'))       badgeClass = 'badge-pickup';
  else if (cat.includes('party'))   badgeClass = 'badge-party';
  else if (cat.includes('fam'))     badgeClass = 'badge-enroll';
  else if (cat.includes('credit'))  badgeClass = 'badge-credit';

  return `
    <div class="item-row ${rowClass}">
      <div class="item-dot ${dotClass}"></div>
      <div class="item-text">
        <strong>${name}</strong>
        ${notes ? `<br><span style="color:var(--text-3);font-size:10px">${notes.substring(0,100)}${notes.length > 100 ? '…' : ''}</span>` : ''}
      </div>
      ${category ? `<span class="item-badge ${badgeClass}">${category.split(' ')[0]}</span>` : ''}
    </div>`;
}
