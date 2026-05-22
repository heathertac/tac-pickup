import { formatDateHeader } from '../lib/airtable.js';

const PIPELINE_ITEMS = [
  { id: 1, name: 'Jack Butler',    sub: 'Called 12:13pm · (914) 409-5394 · general inquiry',                    type: 'call',   assigned: 'Heather', status: 'new',     age: '3h',   urgent: true },
  { id: 2, name: 'Matthew Mueller',sub: 'Called 2:57pm · (917) 684-XXXX · inquiry type unknown',                type: 'call',   assigned: 'Heather', status: 'new',     age: '1h',   urgent: true },
  { id: 3, name: 'Judy Tam',       sub: 'Party request Jun 27 · Motor Mania · ~20 kids',                        type: 'party',  assigned: 'Heather', status: 'new',     age: '5d',   urgent: true },
  { id: 4, name: 'Tina Shah',      sub: 'Enrollment change · conflicting requests for 5/28 and 6/23-26',        type: 'change', assigned: 'Heather', status: 'replied', age: 'today', urgent: false },
  { id: 5, name: 'Juliet (Kiara)', sub: '$215 credit from Nov 2025 · apply to Creature Creator 6/19',           type: 'credit', assigned: 'Heather', status: 'replied', age: 'today', urgent: false },
  { id: 6, name: 'Tracy Davis',    sub: 'Fall Tuesday robotics inquiry · capacity question',                     type: 'enroll', assigned: 'Jessica', status: 'pending', age: '1d',   urgent: false },
  { id: 7, name: 'Leslie Thorne',  sub: 'Called yesterday 1:46pm · (212) 721-XXXX · unassigned',               type: 'call',   assigned: null,      status: 'new',     age: '1d',   urgent: true },
];

const TYPE_LABELS  = { call: 'Call', party: 'Party', change: 'Change', credit: 'Credit', enroll: 'Enrollment' };
const TYPE_BADGES  = { call: 'badge-call', party: 'badge-party', change: 'badge-change', credit: 'badge-credit', enroll: 'badge-enroll' };
const STATUS_PILLS = { new: 'status-new', pending: 'status-pending', replied: 'status-replied', resolved: 'status-resolved' };
const STATUS_LABELS= { new: 'New', pending: 'Pending', replied: 'Replied', resolved: 'Resolved' };

export function renderPipeline(container) {
  const open    = PIPELINE_ITEMS.filter(i => i.status !== 'resolved');
  const calls   = open.filter(i => i.type === 'call');
  const parties = open.filter(i => i.type === 'party');
  const other   = open.filter(i => !['call','party'].includes(i.type));
  const urgent  = open.filter(i => i.urgent);

  container.innerHTML = `
    <div class="hero">
      <div class="hero-eyebrow">${formatDateHeader()}</div>
      <div class="hero-status ${urgent.length > 0 ? 'warn' : 'good'}">
        ${urgent.length > 0 ? `${urgent.length} items need immediate attention.` : 'Pipeline is clear.'}
      </div>
      <div class="hero-pills">
        <span class="pill pill-terra">${calls.length} calls unread</span>
        <span class="pill pill-sand">${parties.length} party requests</span>
        <span class="pill pill-stone">${other.length} other open</span>
      </div>
    </div>

    <div class="stats-grid cols-3">
      <div class="stat-card"><div class="stat-n terra">${calls.length}</div><div class="stat-l">Calls not followed up</div></div>
      <div class="stat-card"><div class="stat-n sand">${parties.length}</div><div class="stat-l">Party requests pending</div></div>
      <div class="stat-card"><div class="stat-n cream">${other.length}</div><div class="stat-l">Credits & changes open</div></div>
    </div>

    <div class="section-block">
      <div class="pipeline-table">
        <div class="pipeline-header pipeline-grid-4">
          <div>Contact & inquiry</div>
          <div>Type</div>
          <div>Assigned</div>
          <div>Status</div>
        </div>
        ${open.map(item => `
          <div class="pipeline-row pipeline-grid-4 ${item.urgent ? 'urgent' : ''}">
            <div>
              <div class="pl-name">${item.name}</div>
              <div class="pl-sub">${item.sub}</div>
            </div>
            <div><span class="item-badge ${TYPE_BADGES[item.type]}">${TYPE_LABELS[item.type]}</span></div>
            <div class="pl-assign ${!item.assigned ? 'unassigned' : ''}">${item.assigned || 'Unassigned'}</div>
            <div><span class="status-pill ${STATUS_PILLS[item.status]}">${STATUS_LABELS[item.status]} · ${item.age}</span></div>
          </div>`).join('')}
      </div>
    </div>

    <div class="section-block">
      <div class="section-title">Resolved this week</div>
      <div class="item-row good">
        <div class="item-dot sage"></div>
        <div class="item-text"><strong>Sho's party</strong> — booked May 30, $200 deposit received. Closed.</div>
        <span class="item-badge badge-party">Party</span>
      </div>
      <div class="item-row good">
        <div class="item-dot sage"></div>
        <div class="item-text"><strong>Lucas Jaramillo</strong> — no bus 5/21, family pickup. Acknowledged.</div>
        <span class="item-badge badge-change">Change</span>
      </div>
    </div>`;
}
