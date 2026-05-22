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
  return proxyCall('getNotes', {
