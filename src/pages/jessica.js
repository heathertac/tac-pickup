import { getAssignmentsToday, groupByInstructor, formatDateHeader } from '../lib/airtable.js';

const PROJECTS = [
  { name: 'Lead generation system',         priority: 'High',   category: 'Marketing & Lead Gen',    nextStep: 'Define specific methods and tools to use' },
  { name: 'AI agents — 6 to build',         priority: 'High',   category: 'AI Agents & Automation',  nextStep: 'Start with Marketing AI Agent' },
  { name: 'SACC licenses',                  priority: 'High',   category: 'Compliance & Legal',      nextStep: 'Clarify what SACC stands for and requirements' },
  { name: 'ASE landing page',               priority: 'High',   category: 'Marketing & Content',     nextStep: 'Design layout and gather content' },
  { name: 'SBA funds strategy',             priority: 'High',   category: 'Strategic Planning',      nextStep: 'Analyze options and create cost/benefit analysis' },
  { name: 'CRM system build',               priority: 'High',   category: 'AI Agents & Automation',  nextStep: 'Gather lead data and define process' },
  { name: 'Performance coach skill',        priority: 'High',   category: 'AI Agents & Automation',  nextStep: 'Outline key questions and framework' },
  { name: 'Client retention system',        priority: 'High',   category: 'CRM & Marketing',         nextStep: 'Design check-in process and frequency' },
  { name: 'Financial planner skill',        priority: 'High',   category: 'AI Agents & Automation',  nextStep: 'Gather financial data and define goals' },
  { name: 'Tax strategist skill',           priority: 'High',   category: 'AI Agents & Automation',  nextStep: 'Gather tax documents' },
  { name: 'Re-categorize CRM contacts',    priority: 'Medium', category: 'Operations & Admin',      nextStep: 'Identify contact management system' },
  { name: 'Sort open leads into CRM',      priority: 'Medium', category: 'Operations & Admin',      nextStep: 'Access open leads folder and CRM' },
  { name: 'Create training manual',        priority: 'Medium', category: 'Training & Guides',       nextStep: 'Determine training scope' },
  { name: 'Inventory management system',   priority: 'Medium', category: 'Systems & Operations',    nextStep: 'Define inventory items and storage locations' },
  { name: 'Teacher evaluation project',    priority: 'Medium', category: 'Operations & HR',         nextStep: 'Clarify evaluation scope and metrics' },
];

function catBadge(cat) {
  if (cat.includes('AI') || cat.includes('Automation') || cat.includes('CRM')) return 'badge-ai';
  if (cat.includes('Marketing') || cat.includes('Content') || cat.includes('Lead')) return 'badge-mkt';
  if (cat.includes('Compliance') || cat.includes('Legal')) return 'badge-legal';
  return 'badge-ops';
}

function catLabel(cat) {
  if (cat.includes('AI') || cat.includes('Automation')) return 'AI';
  if (cat.includes('Marketing') || cat.includes('Content') || cat.includes('Lead')) return 'Mkt';
  if (cat.includes('Compliance') || cat.includes('Legal')) return 'Legal';
  if (cat.includes('Strategic')) return 'Strategy';
  if (cat.includes('CRM')) return 'CRM';
  return 'Ops';
}

export async function renderCommandCenter(container) {
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <div class="loading-text">Loading command center...</div>
    </div>`;

  let confirmed = 0, total = 0;
  try {
    const result      = await getAssignmentsToday();
    const assignments = result.records || [];
    const byInstructor = groupByInstructor(assignments);
    const groups = Object.values(byInstructor).filter(g => g.id !== '__dropoff__');
    total     = groups.length;
    confirmed = groups.filter(g => g.allConfirmed).length;
  } catch {}

  const highProjects = PROJECTS.filter(p => p.priority === 'High');
  const medProjects  = PROJECTS.filter(p => p.priority === 'Medium');
  const unconfirmed  = total - confirmed;

  container.innerHTML = `
    <div class="hero">
      <div class="hero-eyebrow">${formatDateHeader()}</div>
      <div class="hero-status">${highProjects.length} high-priority projects need movement.</div>
      <div class="hero-pills">
        <span class="pill pill-terra">${highProjects.length} high priority</span>
        <span class="pill pill-stone">${medProjects.length} medium priority</span>
        ${total > 0 ? `<span class="pill ${unconfirmed > 0 ? 'pill-sand' : 'pill-sage'}">${confirmed} of ${total} pickups confirmed</span>` : ''}
        <span class="pill pill-stone">Semester ends Jun 26</span>
      </div>
    </div>

    <div class="stats-grid cols-4">
      <div class="stat-card"><div class="stat-n terra">${highProjects.length}</div><div class="stat-l">High priority projects</div></div>
      <div class="stat-card"><div class="stat-n sand">${medProjects.length}</div><div class="stat-l">Medium priority</div></div>
      <div class="stat-card"><div class="stat-n cream">$2,450</div><div class="stat-l">Monthly franchise fee</div></div>
      <div class="stat-card"><div class="stat-n sage">Jun 26</div><div class="stat-l">Semester end</div></div>
    </div>

    <div class="content-grid cols-3">
      <div>
        <div class="section-block">
          <div class="section-title">High priority — get moving</div>
          ${highProjects.slice(0, 6).map(p => `
            <div class="item-row urgent" style="margin-bottom:4px;">
              <div class="item-dot terra"></div>
              <div class="item-text">
                <strong>${p.name}</strong>
                <br><span style="color:var(--text-3);font-size:10px;">Next: ${p.nextStep}</span>
              </div>
              <span class="item-badge ${catBadge(p.category)}">${catLabel(p.category)}</span>
            </div>`).join('')}
        </div>
      </div>
      <div>
        <div class="section-block">
          <div class="section-title">Today's operations</div>
          ${total > 0 ? `
            <div class="item-row ${unconfirmed > 0 ? 'warn' : 'good'}">
              <div class="item-dot ${unconfirmed > 0 ? 'sand' : 'sage'}"></div>
              <div class="item-text"><strong>Pickups</strong> — ${confirmed} of ${total} instructors confirmed${unconfirmed > 0 ? '. Rebecca managing.' : '. All clear.'}</div>
              <span class="item-badge badge-pickup">Pickup</span>
            </div>` : ''}
          <div class="item-row warn">
            <div class="item-dot sand"></div>
            <div class="item-text"><strong>5/30 birthday party</strong> — no lead instructor confirmed yet.</div>
            <span class="item-badge badge-party">Party</span>
          </div>
          <div class="item-row good">
            <div class="item-dot sage"></div>
            <div class="item-text"><strong>QPL workshop</strong> — confirmed for tomorrow. Kevin coordinating.</div>
          </div>
        </div>
        <div class="section-block">
          <div class="section-title">Fall schedule</div>
          <div class="item-row">
            <div class="item-dot stone"></div>
            <div class="item-text">Replacing Musical Ears on Mondays. Payment plans set at 8% fee.</div>
          </div>
          <div class="item-row warn">
            <div class="item-dot sand"></div>
            <div class="item-text"><strong>Tracy Davis</strong> — Tuesday robotics inquiry for fall. Capacity check needed.</div>
          </div>
        </div>
      </div>
      <div>
        <div class="section-block">
          <div class="section-title">Medium priority</div>
          ${medProjects.slice(0, 5).map(p => `
            <div class="item-row warn" style="margin-bottom:4px;">
              <div class="item-dot sand"></div>
              <div class="item-text"><strong>${p.name}</strong></div>
              <span class="item-badge ${catBadge(p.category)}">${catLabel(p.category)}</span>
            </div>`).join('')}
        </div>
        <div class="section-block">
          <div class="section-title">Recent wins</div>
          <div class="item-row good"><div class="item-dot sage"></div><div class="item-text"><strong>Sho's party</strong> — booked May 30, $200 deposit received.</div></div>
          <div class="item-row good"><div class="item-dot sage"></div><div class="item-text"><strong>STEM kits donated</strong> — 8-9 from Jeff Blath. Great for extended day.</div></div>
          <div class="item-row good"><div class="item-dot sage"></div><div class="item-text"><strong>Airtable rollout</strong> — one-sheeter built, deep dive scheduled.</div></div>
        </div>
      </div>
    </div>`;
}
