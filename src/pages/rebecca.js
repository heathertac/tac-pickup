import {
  getAssignmentsToday, getChangesToday, confirmInstructor,
  groupByInstructor, formatDateHeader, isPast1pm, initials
} from '../lib/airtable.js';

export async function renderPickupDashboard(container) {
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <div class="loading-text">Loading today's pickups...</div>
    </div>`;
  try {
    const [aResult, cResult] = await Promise.allSettled([
      getAssignmentsToday(),
      getChangesToday(),
    ]);
    const assignments  = aResult.status === 'fulfilled' ? (aResult.value.records || []) : [];
    const changes      = cResult.status === 'fulfilled' ? (cResult.value.records || []) : [];
    const byInstructor = groupByInstructor(assignments);
    const groups       = Object.values(byInstructor).filter(g => g.id !== '__dropoff__');
    const dropoff      = byInstructor['__dropoff__'];
    const unconfirmed  = groups.filter(g => !g.allConfirmed);
    const confirmed    = groups.filter(g => g.allConfirmed);
    const past1pm      = isPast1pm();
    container.innerHTML = buildDashboard({ groups, unconfirmed, confirmed, dropoff, changes, past1pm });
    attachConfirmHandlers(container, groups);
  } catch (err) {
    container.innerHTML = `
      <div class="error-state">
        <strong>Could not load pickup data.</strong><br>${err.message}
        <br><button class="retry-btn" onclick="location.reload()">Retry</button>
      </div>`;
  }
}

function buildDashboard({ groups, unconfirmed, confirmed, dropoff, changes, past1pm }) {
  const total        = groups.length;
  const studentTotal = groups.reduce((s, g) => s + g.records.length, 0);
  let heroText, heroClass;
  if (total === 0) {
    heroText = 'No pickups scheduled today.'; heroClass = 'good';
  } else if (unconfirmed.length === 0) {
    heroText = `You're covered. All ${total} instructors confirmed.`; heroClass = 'good';
  } else if (past1pm) {
    heroText = `${unconfirmed.length} instructor${unconfirmed.length > 1 ? 's have' : ' has'} not confirmed. Call now.`; heroClass = 'warn';
  } else {
    heroText = `${unconfirmed.length} instructor${unconfirmed.length > 1 ? " haven't" : " hasn't"} confirmed yet.`; heroClass = '';
  }
  const pills = [
    `<span class="pill pill-sage">${confirmed.length} confirmed</span>`,
    unconfirmed.length > 0 ? `<span class="pill ${past1pm ? 'pill-terra' : 'pill-sand'}">${unconfirmed.length} awaiting</span>` : '',
    changes.length > 0 ? `<span class="pill pill-stone">${changes.length} change${changes.length > 1 ? 's' : ''}</span>` : '',
    `<span class="pill pill-stone">${studentTotal} students</span>`,
  ].filter(Boolean).join('');
  const changesHTML = changes.length > 0 ? `
    <div class="section-block">
      <div class="section-title">Today's changes</div>
      ${changes.map(r => {
        const summary = r.fields['Change Summary'] || 'Route change';
        const notes   = r.fields['Notes'] || '';
        const acked   = r.fields['Instructor Acknowledged'];
        return `<div class="item-row ${acked ? '' : 'warn'}">
          <div class="item-dot ${acked ? 'stone' : 'sand'}"></div>
          <div class="item-text"><strong>${summary}</strong>${notes ? `<br><span style="color:var(--text-3)">${notes}</span>` : ''}</div>
          <span class="item-badge ${acked ? 'badge-change' : 'badge-pickup'}">${acked ? 'Acknowledged' : 'Needs attention'}</span>
        </div>`;
      }).join('')}
    </div>` : '';
  const dropoffHTML = dropoff?.records.length ? `
    <div class="section-block">
      <div class="section-title">Parent drop-off</div>
      ${dropoff.records.map(r => {
        const s    = r.fields['Student'];
        const name = s?.length ? s[0].name : 'Unknown';
        const note = r.fields['Notes'] || r.fields['Notes (Nice to Know)'] || '';
        return `<div class="item-row">
          <div class="item-dot stone"></div>
          <div class="item-text"><strong>${name}</strong>${note ? ` — ${note}` : ''}</div>
        </div>`;
      }).join('')}
    </div>` : '';
  const allClearHTML = unconfirmed.length === 0 && confirmed.length > 0 ? `
    <div class="item-row good" style="margin-bottom:16px;">
      <div class="item-dot sage"></div>
      <div class="item-text"><strong>All instructors confirmed for today.</strong></div>
    </div>` : '';
  const needsHTML = unconfirmed.length > 0 ? `
    <div class="section-block">
      <div class="section-title">Needs confirmation</div>
      ${unconfirmed.map(g => instructorCard(g, past1pm)).join('')}
    </div>` : '';
  const confirmedHTML = confirmed.length > 0 ? `
    <div class="section-block">
      <div class="section-title">Confirmed</div>
      ${confirmed.map(g => instructorCard(g, past1pm)).join('')}
    </div>` : '';
  return `
    <div class="hero">
      <div class="hero-eyebrow">${formatDateHeader()}</div>
      <div class="hero-status ${heroClass}">${heroText}</div>
      <div class="hero-pills">${pills}</div>
    </div>
    <div class="stats-grid cols-4">
      <div class="stat-card"><div class="stat-n terra">${unconfirmed.length}</div><div class="stat-l">Unconfirmed</div></div>
      <div class="stat-card"><div class="stat-n sage">${confirmed.length}</div><div class="stat-l">Confirmed</div></div>
      <div class="stat-card"><div class="stat-n cream">${studentTotal}</div><div class="stat-l">Students today</div></div>
      <div class="stat-card"><div class="stat-n sand">${changes.length}</div><div class="stat-l">Route changes</div></div>
    </div>
    <div class="content-grid cols-2">
      <div>${allClearHTML}${needsHTML}${confirmedHTML}</div>
      <div>${changesHTML}${dropoffHTML}</div>
    </div>`;
}

function instructorCard(group, past1pm) {
  const { name, id, records, allConfirmed } = group;
  const isUrgent     = !allConfirmed && past1pm;
  const cardClass    = allConfirmed ? 'confirmed' : isUrgent ? 'urgent' : '';
  const avBg         = allConfirmed ? '#2A4A2A' : isUrgent ? '#7A3820' : '#5A4A2A';
  const allergyCount = records.filter(r => r.fields['Allergies']).length;
  const recordIds    = records.map(r => r.id);
  const statusHTML = allConfirmed
    ? `<div class="confirm-check">&#x2713;</div>`
    : `<div class="confirm-ring ${isUrgent ? 'urgent' : ''}"></div>
       <button class="confirm-btn-inline ${isUrgent ? 'urgent' : 'waiting'}"
         data-record-ids="${recordIds.join(',')}"
         data-instructor-name="${name.split(' ')[0]}">
         ${isUrgent ? 'Call now' : 'Confirm'}
       </button>`;
  return `
    <div class="instructor-card ${cardClass}" style="margin-bottom:6px;">
      <div class="instructor-avatar" style="background:${avBg}">${initials(name)}</div>
      <div class="instructor-meta">
        <div class="instructor-name">${name}</div>
        <div class="instructor-sub">${records.length} student${records.length > 1 ? 's' : ''}${allergyCount > 0 ? ` · ${allergyCount} allergy flag${allergyCount > 1 ? 's' : ''}` : ''}</div>
      </div>
      ${statusHTML}
    </div>`;
}

function attachConfirmHandlers(container, groups) {
  container.querySelectorAll('.confirm-btn-inline').forEach(btn => {
    btn.addEventListener('click', async () => {
      const recordIds = btn.dataset.recordIds.split(',').filter(Boolean);
      btn.disabled    = true;
      btn.textContent = 'Saving...';
      try {
        await confirmInstructor(recordIds);
        const group = groups.find(g => g.records.some(r => recordIds.includes(r.id)));
        if (group) {
          group.allConfirmed = true;
          group.records.forEach(r => { r.fields['1pm Confirmation'] = true; });
        }
        renderPickupDashboard(container);
      } catch (err) {
        btn.disabled    = false;
        btn.textContent = 'Retry';
        alert(`Could not save: ${err.message}`);
      }
    });
  });
}
