module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const TOKEN = process.env.AIRTABLE_API_KEY;
  const BASE = 'appnWviGYgpWT2VPH';
  const TASKS_BASE = 'appyftZnsFAKOT5SS';

  const MASTER_SCHEDULE = {
    'Ada McGuire|Monday':                  "Regina D'Soto",
    'Adina LaSota|Monday':                 'Ricardo Marquez',
    'Alice Huggins|Monday':                'Kevin Sims',
    'Asher Davis|Monday':                  'Josue Hernandez',
    'Asher Muller|Monday':                 "Regina D'Soto",
    'Eden Arriola-Oks|Monday':             'Josue Hernandez',
    'Ellis Scarlett|Monday':               'Kevin Sims',
    'Gabriel Doolittle|Monday':            'Ricardo Marquez',
    'Gaius LaSota|Monday':                 'Ricardo Marquez',
    'Ilyaas Wower|Monday':                 'Kevin Sims',
    'Lucas Martin Jaramillo|Monday':       'Rebecca Whittemore',
    'Lucas Novak|Monday':                  'Rebecca Whittemore',
    'Mikayla Kardon|Monday':               'Nicola Caminiti',
    'Naoto Shiina|Monday':                 'Rebecca Whittemore',
    'Nellie Dieterich|Monday':             'Josue Hernandez',
    'Parker Corpuel|Monday':               "Regina D'Soto",
    'Sadie Manas|Monday':                  "Regina D'Soto",
    'Sebastian Doolittle|Monday':          'Ricardo Marquez',
    'Simon Morales|Monday':                'Rebecca Whittemore',
    'Sofia Salamanca|Monday':              'Nicola Caminiti',
    'Steven Ross Ranev|Monday':            'Rebecca Whittemore',
    'Sydney Matani|Monday':                'Ricardo Marquez',
    'Tomoharu Takagi|Tuesday':             'Rebecca Whittemore',
    'Abe Blath|Tuesday':                   'Rebecca Whittemore',
    'Adam Cheung|Tuesday':                 'Josue Hernandez',
    'Adina LaSota|Tuesday':                'Ricardo Marquez',
    'Alfonso Cifuentes Baez|Tuesday':      "Regina D'Soto",
    'Asher Muller|Tuesday':                "Regina D'Soto",
    'Dylan Cheung|Tuesday':                'Josue Hernandez',
    'Elea Kitur|Tuesday':                  'Rebecca Whittemore',
    'Ellis Scarlett|Tuesday':              'Josue Hernandez',
    'Eric Kielmanowicz|Tuesday':           "Regina D'Soto",
    'Gabriel Doolittle|Tuesday':           'Ricardo Marquez',
    'Gaius LaSota|Tuesday':                'Ricardo Marquez',
    'Hal Takei|Tuesday':                   "Regina D'Soto",
    'Ilyaas Wower|Tuesday':                'Josue Hernandez',
    'Jemma Wong|Tuesday':                  'Rebecca Whittemore',
    'Luca Passarelli|Tuesday':             "Regina D'Soto",
    'Lucas Martin Jaramillo|Tuesday':      'Rebecca Whittemore',
    'Mari Tamura|Tuesday':                 "Regina D'Soto",
    'Nathaniel Dunham Welt|Tuesday':       'Ricardo Marquez',
    'Philip Soung|Tuesday':                'Josue Hernandez',
    'Remi Tobin|Tuesday':                  "Regina D'Soto",
    'Sadie Manas|Tuesday':                 "Regina D'Soto",
    'Sebastian Sverdlov|Tuesday':          'Rebecca Whittemore',
    'Seth Lee|Tuesday':                    'Rebecca Whittemore',
    'Shunto Matsubara|Tuesday':            "Regina D'Soto",
    'Sofia Salamanca|Tuesday':             'Janet Chow',
    'Spencer Haines|Tuesday':              'Rebecca Whittemore',
    'Sydney Matani|Tuesday':               'Ricardo Marquez',
    'Thomas Credali|Tuesday':              "Regina D'Soto",
    'Wesley Wang|Tuesday':                 'Rebecca Whittemore',
    'Asher Muller|Wednesday':              'Teresa',
    'Augustus Glibbery|Wednesday':         'Rebecca Whittemore',
    'Austen Jacobs|Wednesday':             'Teresa',
    'Axel Glibbery|Wednesday':             'Rebecca Whittemore',
    'Benjamin Bakhir|Wednesday':           'Rebecca Whittemore',
    'Elea Kitur|Wednesday':                'Rebecca Whittemore',
    'Ethan Owyang|Wednesday':              'Rebecca Whittemore',
    'Hal Takei|Wednesday':                 'Teresa',
    'Ilyaas Wower|Wednesday':              'Janet Chow',
    'Leah Dunham Welt|Wednesday':          'Ricardo Marquez',
    'Luca Passarelli|Wednesday':           'Teresa',
    'Lucas Martin Jaramillo|Wednesday':    'Rebecca Whittemore',
    'Nathaniel Dunham Welt|Wednesday':     'Ricardo Marquez',
    'Philip Soung|Wednesday':              'Kevin Sims',
    'Sebastian Doolittle|Wednesday':       'Ricardo Marquez',
    'Seth Lee|Wednesday':                  'Rebecca Whittemore',
    'Shunto Matsubara|Wednesday':          'Teresa',
    'Sofia Salamanca|Wednesday':           'Janet Chow',
    'Spencer Haines|Wednesday':            'Rebecca Whittemore',
    'Steven Ross Ranev|Wednesday':         'Rebecca Whittemore',
    'Sydney Matani|Wednesday':             'Ricardo Marquez',
    'Benjamin Bakhir|Thursday':            'Rebecca Whittemore',
    'Cobalt Sandal Miller|Thursday':       'Ricardo Marquez',
    'Elea Kitur|Thursday':                 'Rebecca Whittemore',
    'Ellis Scarlett|Thursday':             'Kevin Sims',
    'Eric Kielmanowicz|Thursday':          'Nicola Caminiti',
    'Ilyaas Wower|Thursday':               'Kevin Sims',
    'Indigo Buran|Thursday':               'Nicola Caminiti',
    'Leah Dunham Welt|Thursday':           'Ricardo Marquez',
    'Luca Passarelli|Thursday':            'Nicola Caminiti',
    'Lucas Martin Jaramillo|Thursday':     'Rebecca Whittemore',
    'Mikayla Kardon|Thursday':             "Regina D'Soto",
    'Nathaniel Dunham Welt|Thursday':      'Ricardo Marquez',
    'Nellie Dieterich|Thursday':           'Rachel Bernstein',
    'Parker Corpuel|Thursday':             'Nicola Caminiti',
    'Remi Tobin|Thursday':                 'Nicola Caminiti',
    'Seth Lee|Thursday':                   'Rebecca Whittemore',
    'Sofia Salamanca|Thursday':            "Regina D'Soto",
    'Sydney Matani|Thursday':              'Ricardo Marquez',
    'Tolu Zawadzki|Thursday':              'Rachel Bernstein',
    'Tiam Zawadzki|Thursday':              'Rachel Bernstein',
    'Adam Cheung|Friday':                  'Kevin Sims',
    'Adina LaSota|Friday':                 'Rebecca Whittemore',
    'Asher Muller|Friday':                 'Teresa',
    'Dylan Cheung|Friday':                 'Kevin Sims',
    'Ethan Owyang|Friday':                 'Rebecca Whittemore',
    'Gaius LaSota|Friday':                 'Rebecca Whittemore',
    'Ilyaas Wower|Friday':                 'Kevin Sims',
    'Nellie Dieterich|Friday':             'Ricardo Marquez',
    'Parker Corpuel|Friday':               'Teresa',
    'Sebastian Doolittle|Friday':          'Rebecca Whittemore',
    'Sydney Matani|Friday':                'Rebecca Whittemore',
  };

  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function getTodayDayName() { return DAYS[new Date().getDay()]; }
  function getMasterInstructor(studentName, dayName) {
    return MASTER_SCHEDULE[`${studentName}|${dayName}`] || null;
  }

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

    if (action === 'getTodayRoster') {
      const dayName = getTodayDayName();
      const studentRecords = await getAll(BASE, 'tblJSQjtxq7yc29cY');
      const formula = encodeURIComponent(`IS_SAME({Date}, TODAY(), 'day')`);
      const overrideRecords = await getAll(BASE, 'tblqX1tGUs6W5VGt4', `filterByFormula=${formula}`);

      const overrideMap = {};
      for (const r of overrideRecords) {
        const f = r.fields || {};
        const stuArr = f['Student'] || [];
        const instrArr = f['Assigned Instructor'] || [];
        const instrName = instrArr.length && instrArr[0].name
          ? instrArr[0].name
          : (allStaff && allStaff.find ? '' : '');
        const confirmed = !!f['1pm Confirmation'];
        stuArr.forEach(s => {
          const sid = s.id || s;
          overrideMap[sid] = { instructorName: instrName, confirmed, recordId: r.id };
        });
      }

      const roster = [];
      for (const r of studentRecords) {
        const f = r.fields || {};
        const name = f['Name'] || f['Student Name'] || '';
        const status = f['Status']?.name || f['Status'] || '';
        if (!status.toLowerCase().includes('active')) continue;
        const enrolledDays = (f['Enrolled Days'] || []).map(d => d.name || d);
        if (!enrolledDays.some(d => d.toLowerCase() === dayName.toLowerCase())) continue;
        const override = overrideMap[r.id];
        const masterInstructor = getMasterInstructor(name, dayName);
        const instructorName = override?.instructorName || masterInstructor || '';
        const confirmed = override?.confirmed || false;
        roster.push({
          studentId: r.id,
          studentName: name,
          instructorName,
          confirmed,
          overrideRecordId: override?.recordId || null,
          isOverride: !!override,
          pickupPhone: f['Pickup Contact Phone'] || '',
          pickupName: f['Pickup Contact Name'] || '',
          notes: f['Notes (Nice to Know)'] || '',
          allergies: f['Allergies'] || '',
          school: f['School']?.name || f['School'] || '',
          grade: f['Grade']?.name || f['Grade'] || '',
          teacher: f['Homeroom Teacher'] || '',
          photo: (f['Photo'] || [])[0]?.thumbnails?.small?.url || '',
          pickupLocationId: (f['Default Pickup Location'] || [])[0]?.id || '',
          pickupLocation: (f['Default Pickup Location'] || [])[0]?.name || '',
        });
      }
      return res.status(200).json({ roster, dayName });
    }

    if (action === 'confirmInstructor') {
      const { recordIds } = body;
      if (!recordIds || !recordIds.length) {
        return res.status(400).json({ error: 'recordIds required' });
      }
      const updates = recordIds.map(id => ({ id, fields: { '1pm Confirmation': true } }));
      const results = await patchBatch(BASE, 'tblqX1tGUs6W5VGt4', updates);
      return res.status(200).json({ records: results });
    }

    if (action === 'logOverride') {
      const { studentIds, date, instructorName, reason } = body;
      if (!studentIds?.length || !date || !instructorName) {
        return res.status(400).json({ error: 'studentIds, date, and instructorName required' });
      }
      const staffRecords = await get(BASE, 'tblWuCldxuiPhtUUC');
      const staffRecord = (staffRecords.records || []).find(r =>
        (r.fields?.['Name'] || '').toLowerCase() === instructorName.toLowerCase()
      );
      const staffId = staffRecord?.id;
      const records = studentIds.map(sid => ({
        fields: {
          'Date': date,
          'Student': [{ id: sid }],
          ...(staffId ? { 'Assigned Instructor': [{ id: staffId }] } : {}),
          'Notes': reason || 'Daily override',
        }
      }));
      const results = [];
      for (let i = 0; i < records.length; i += 10) {
        const d = await post(BASE, 'tblqX1tGUs6W5VGt4', records.slice(i, i + 10));
        results.push(...(d.records || []));
      }
      return res.status(200).json({ records: results });
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
        return res.status(200).json({ id: records[0].id, content: records[0].fields['Notes Content'] || '' });
      }
      return res.status(200).json({ id: null, content: '' });
    }
    if (action === 'saveNotes') {
      const { userEmail, content, recordId } = body;
      if (!userEmail) return res.status(400).json({ error: 'userEmail required' });
      if (recordId) {
        const d = await patchOne(TASKS_BASE, 'tblUserNotes', recordId, { 'Notes Content': content || '' });
        return res.status(200).json({ id: d.id });
      } else {
        const d = await post(TASKS_BASE, 'tblUserNotes', [{ fields: { 'User Email': userEmail, 'Notes Content': content || '' } }]);
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
