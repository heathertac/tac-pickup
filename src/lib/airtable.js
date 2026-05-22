const PROXY = '/api/proxy';

export async function proxyCall(action, extra = {}) {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  });
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
  return res.json();
}

export function getAssignmentsToday() {
  return proxyCall('getAssignmentsToday');
}
export function getChangesToday() {
  return proxyCall('getChangesToday');
}
export function confirmInstructor(recordIds) {
  return proxyCall('confirmInstructor', { recordIds });
}
export function getActiveStudents() {
  return proxyCall('getActiveStudents');
}
export function getTasks(assignee) {
  return proxyCall('getTasks', assignee ? { assignee } : {});
}
export function updateTask(recordId, status) {
  return proxyCall('updateTask', { recordId, status });
}
export function getNotes(userEmail) {
  return proxyCall('getNotes', { userEmail });
}
export function saveNotes(userEmail, content, recordId) {
  return proxyCall('saveNotes', { userEmail, content, recordId });
}

export function formatDateHeader() {
  const d = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

export function isPast1pm() {
  return new Date().getHours() >= 13;
}

export function initials(name) {
  if (!name) return '??';
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function groupByInstructor(assignments) {
  const byInstructor = {};
  for (const r of assignments) {
    const f        = r.fields || {};
    const instrArr = f['Assigned Instructor'];
    const name     = instrArr?.length ? instrArr[0].name : '__dropoff__';
    const id       = instrArr?.length ? instrArr[0].id   : '__dropoff__';
    if (!byInstructor[id]) {
      byInstructor[id] = { name, id, records: [], allConfirmed: true };
    }
    byInstructor[id].records.push(r);
    if (!f['1pm Confirmation']) byInstructor[id].allConfirmed = false;
  }
  return byInstructor;
}
