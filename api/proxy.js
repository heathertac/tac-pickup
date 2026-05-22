module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const TOKEN = process.env.AIRTABLE_API_KEY;
  const BASE = 'appnWviGYgpWT2VPH';
  const TASKS_BASE = 'appyftZnsFAKOT5SS';

  async function get(base, table, params = '') {
    const r = await fetch(`https://api.airtable.com/v0/${base}/${table}?${params}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    return r.json();
  }

  async function getAll(base, table, params = '') {
    let records = [], offset = null;
    do {
      const qs = offset ? `offset=${offset}${params ? '&' + params : ''}` : params;
      const d = await get(base, table, qs);
      records = records.concat(d.records || []);
      offset = d.offset;
    } while (offset);
    return records;
  }

  async function patch(base, table, records) {
    const r = await fetch(`https://api.airtable.com/v0/${base}/${table}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records })
    });
    return r.json();
  }

  async function post(base, table, records) {
    const r = await fetch(`https://api.airtable.com/v0/${base}/${table}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records })
    });
    return r.json();
  }

  async function patchOne(base, table, id, fields) {
    const r = await fetch(`https://api.airtable.com/v0/${base}/${table}/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    return r.json();
  }

  async function patchBatch(base, table, updates) {
    const results = [];
    for (let i = 0; i < updates.length; i += 10) {
      const batch = updates.slice(i, i + 10);
      const d = await patch(base, table, batch);
      results.push(...(d.records || []));
    }
    return results;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action } = body || {};

    // ── EXISTING INSTRUCTOR APP ACTIONS ──────────────────────
    if (action === 'getStudents') {
      return res.status(200).json({ records: await getAll(BASE, 'tblJSQjtxq7yc29cY') });
    }

    if (action === 'getStaff') {
      const d = await get(BASE, 'tblWuCldxuiPhtUUC');
      return res.status(200).json({ records: d.records || [] });
    }

    if (action === 'getChanges') {
      const d = await get(BASE, 'tblEdgjx4phKSj4wS');
      return res.status(200).json({ records: d.records || [] });
    }

    if (act
