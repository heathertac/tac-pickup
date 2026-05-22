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

    container.innerHTML = buildDashboard({ groups, unconfirmed, confirmed, dropoff, changes, past1pm })
