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
    if (action === 'getLocations') {
      const d = await get(BASE, 'tblI5cwN5EIXqrdK2');
      return res.status(200).json({ records: d.records || [] });
    }
    if (action === 'getAssignments') {
      return res.status(200).json({ records: await getAll(BASE, 'tblqX1tGUs6W5VGt4') });
    }
    if (action === 'logIncident') {
      const { description, type, severity } = body;
      const r = await fetch(`https://api.airtable.com/v0/${BASE}/tblBrZKAPGrg893o1`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [{ fields: {
          fldeXepi4JsJKPsWk: description,
          fldmgu6wxyuCiOZ48: type || 'Field Note',
          fldVIfEohqez31Wmw: severity || 'Low'
        }}]})
      });
      return res.status(200).json(await r.json());
    }
    if (action === 'getAssignmentsToday') {
      const formula = encodeURIComponent(`IS_SAME({Date}, TODAY(), 'day')`);
      const records = await getAll(BASE, 'tblqX1tGUs6W5VGt4', `filterByFormula=${formula}`);
      return res.status(200).json({ records });
    }
    if (action === 'getChangesToday') {
      const formula = encodeURIComponent(`IS_SAME({Affected Pickup Date}, TODAY(), 'day')`);
      const d = await get(BASE, 'tblEdgjx4phKSj4wS', `filterByFormula=${formula}`);
      return res.status(200).json({ records: d.records || [] });
    }
    if (action === 'confirmInstructor') {
      const { recordIds } = body;
      if (!recordIds || !recordIds.length) {
        return res.status(400).json({ error: 'recordIds required' });
      }
      const updates = recordIds.map(id => ({
        id,
        fields: { '1pm Confirmation': true }
      }));
      const results = await patchBatch(BASE, 'tblqX1tGUs6W5VGt4', updates);
      return res.status(200).json({ records: results });
    }
    if (action === 'getActiveStudents') {
      const formula = encodeURIComponent(`{Status} = 'Active'`);
      const records = await getAll(BASE, 'tblJSQjtxq7yc29cY', `filterByFormula=${formula}`);
      return res.status(200).json({ records });
    }
    if (action === 'getTasks') {
      const { assignee } = body;
      let formula = `NOT({Status} = 'Done')`;
      if (assignee) formula = `AND(${formula}, {Assigned To} = '${assignee}')`;
      const records = await getAll(TASKS_BASE, 'tblSdeWTrFioxvpsR',
        `filterByFormula=${encodeURIComponent(formula)}`);
      return res.status(200).json({ records });
    }
    if (action === 'updateTask') {
      const { recordId, status } = body;
      const d = await patchOne(TASKS_BASE, 'tblSdeWTrFioxvpsR', recordId, { Status: status });
      return res.status(200).json(d);
    }
    if (action === 'getNotes') {
      const { userEmail } = body;
      if (!userEmail) return res.status(400).json({ error: 'userEmail required' });
      const formula = encodeURIComponent(`{User Email} = '${userEmail}'`);
      const d = await get(TASKS_BASE, 'tblUserNotes', `filterByFormula=${formula}&maxRecords=1`);
      const records = d.records || [];
      if (records.length > 0) {
        return res.status(200).json({
          id: records[0].id,
          content: records[0].fields['Notes Content'] || ''
        });
      }
      return res.status(200).json({ id: null, content: '' });
    }
    if (action === 'saveNotes') {
      const { userEmail, content, recordId } = body;
      if (!userEmail) return res.status(400).json({ error: 'userEmail required' });
      if (recordId) {
        const d = await patchOne(TASKS_BASE, 'tblUserNotes', recordId, {
          'Notes Content': content || ''
        });
        return res.status(200).json({ id: d.id });
      } else {
        const d = await post(TASKS_BASE, 'tblUserNotes', [{
          fields: {
            'User Email': userEmail,
            'Notes Content': content || ''
          }
        }]);
        const created = (d.records || [])[0];
        return res.status(200).json({ id: created?.id || null });
      }
    }
    if (action === 'getPipeline') {
      return res.status(200).json({ records: [] });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (e) {
    console.error('Proxy error:', e);
    return res.status(500).json({ error: e.message });
  }
};
