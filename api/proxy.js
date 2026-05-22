module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const TOKEN = process.env.AIRTABLE_API_KEY;
  const BASE = 'appnWviGYgpWT2VPH';

  async function get(table, params = '') {
    const r = await fetch(`https://api.airtable.com/v0/${BASE}/${table}?${params}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    return r.json();
  }

  async function getAllRecords(table, params = '') {
    let records = [], offset = null;
    do {
      const d = await get(table, offset ? `${params}${params?'&':''}offset=${offset}` : params);
      records = records.concat(d.records || []);
      offset = d.offset;
    } while (offset);
    return records;
  }

  function normDay(d) {
    const s = (d || '').toLowerCase();
    if (s.startsWith('mo')) return 'mon';
    if (s.startsWith('tu')) return 'tue';
    if (s.startsWith('we')) return 'wed';
    if (s.startsWith('th')) return 'thu';
    if (s.startsWith('fr')) return 'fri';
    return s.slice(0, 3);
  }

  // Closed days — no pickup
  const CLOSED_DATES = [
    '2026-05-25',
    '2026-05-27',
    '2026-06-04',
    '2026-06-05',
    '2026-06-19',
  ];

  // Fallback master schedule used ONLY when no Pickup Assignment exists for a student today
  // Key: studentName → { mon, tue, wed, thu, fri } → instructor full name
  const MASTER_SCHEDULE = {
    'Ethan Owyang':        { wed:'Rebecca Whittemore', fri:'Rebecca Whittemore' },
    'Adam Cheung':         { tue:'Ricardo Marquez', fri:'Ricardo Marquez' },
    'Dylan Cheung':        { tue:'Ricardo Marquez', fri:'Ricardo Marquez' },
    'Ilyaas Wower':        { mon:'Kevin Sims', tue:'Ricardo Marquez', wed:'Kevin Sims', thu:'Kevin Sims', fri:'Ricardo Marquez' },
    'Alice Huggins':       { mon:'Kevin Sims' },
    'Ada McGuire':         { mon:'Kevin Sims' },
    'Nellie Dieterich':    { mon:'Kevin Sims', thu:'Kevin Sims', fri:'Kevin Sims' },
    'Asher Muller':        { mon:'Kevin Sims', tue:'Kevin Sims', wed:'Kevin Sims', fri:'Teresa' },
    'Parker Corpuel':      { mon:'Kevin Sims', thu:'Kevin Sims', fri:'Teresa' },
    'Adina LaSota':        { mon:'Nicola Caminiti', tue:'Nicola Caminiti', fri:"Regina D'Soto" },
    'Gaius LaSota':        { mon:'Nicola Caminiti', tue:'Nicola Caminiti', fri:"Regina D'Soto" },
    'Nathaniel Dunham Welt':{ thu:'Janet Chow', fri:"Regina D'Soto" },
    'Sebastian Doolittle': { mon:'Kevin Sims', wed:'Kevin Sims', fri:"Regina D'Soto" },
    'Sydney Matani':       { mon:'Nicola Caminiti', tue:'Nicola Caminiti', wed:'Nicola Caminiti', thu:'Nicola Caminiti', fri:"Regina D'Soto" },
    'Jackson Cruz':        { fri:"Regina D'Soto" },
  };

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action } = body || {};

    if (action === 'getTodayRoster') {
      const today = new Date();
      const todayISO = today.toISOString().slice(0, 10);
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const todayDay = days[today.getDay()];

      if (CLOSED_DATES.includes(todayISO) || todayDay === 'sat' || todayDay === 'sun') {
        return res.status(200).json({ roster: [] });
      }

      // Fetch everything in parallel
      const [students, staff, assignments] = await Promise.all([
        getAllRecords('tblJSQjtxq7yc29cY'),
        getAllRecords('tblWuCldxuiPhtUUC'),
        getAllRecords('tblqX1tGUs6W5VGt4',
          `filterByFormula=DATESTR({Date})="${todayISO}"`),
      ]);

      // Build staff map: id → { name, photoUrl }
      const staffById = {};
      staff.forEach(r => {
        const f = r.fields || {};
        const photos = f['fld5wi8dP8Av7Y02g'] || [];
        const photoUrl = photos[0]?.thumbnails?.large?.url || photos[0]?.url || null;
        staffById[r.id] = { name: f['fldpTZVDA2K7wAfKq'] || '', photoUrl };
      });

      // Build staff map: name → photoUrl (for master schedule fallback)
      const staffByName = {};
      staff.forEach(r => {
        const f = r.fields || {};
        const name = f['fldpTZVDA2K7wAfKq'] || '';
        const photos = f['fld5wi8dP8Av7Y02g'] || [];
        const photoUrl = photos[0]?.thumbnails?.large?.url || photos[0]?.url || null;
        if (name) staffByName[name] = photoUrl;
      });

      // Build assignment map: studentId → { instructorName, instructorPhotoUrl, locationId }
      const assignmentMap = {};
      assignments.forEach(a => {
        const f = a.fields || {};
        const stuIds = (f['fldLUu6am3Wuz1dl2'] || []).map(x => x.id || x);
        const instrArr = f['fldnbcjJYnszepnxK'] || [];
        const instrId = instrArr[0]?.id || instrArr[0] || null;
        const instrData = instrId ? staffById[instrId] : null;
        const locArr = f['fldypb0ELrWtH4Mlw'] || [];
        const locationId = locArr[0]?.id || locArr[0] || null;
        stuIds.forEach(sid => {
          assignmentMap[sid] = {
            instructorName: instrData?.name || '',
            instructorPhotoUrl: instrData?.photoUrl || null,
            locationId,
            isOverride: true,
          };
        });
      });

      // Filter to today's active students
      const roster = [];
      for (const r of students) {
        const f = r.fields || {};
        const status = (f['fldCg5jyD4lNtmXS6']?.name || f['fldCg5jyD4lNtmXS6'] || '').toLowerCase();
        if (!status.includes('active')) continue;

        const enrolledDays = (f['fldqiZE6x6xmkfTp6'] || []).map(d => normDay(d.name || d));
        if (!enrolledDays.includes(todayDay)) continue;

        const studentName = f['fldSxrnb5OVFoTXea'] || 'Unknown';
        const photos = f['fldS1uncWbXSUnMjQ'] || [];
        const defaultLocIds = f['fldQVHtMRmpemPtZE'] || [];
        const defaultLocId = defaultLocIds[0]?.id || defaultLocIds[0] || null;

        // Instructor: use assignment if exists, else master schedule
        let instructorName = '';
        let instructorPhotoUrl = null;
        let pickupLocationId = defaultLocId || '';
        let isOverride = false;

        if (assignmentMap[r.id]) {
          instructorName = assignmentMap[r.id].instructorName;
          instructorPhotoUrl = assignmentMap[r.id].instructorPhotoUrl;
          pickupLocationId = assignmentMap[r.id].locationId || pickupLocationId;
          isOverride = assignmentMap[r.id].isOverride;
        } else {
          // Fallback to master schedule
          const sched = MASTER_SCHEDULE[studentName];
          instructorName = sched?.[todayDay] || '';
          instructorPhotoUrl = instructorName ? (staffByName[instructorName] || null) : null;
        }

        roster.push({
          studentId: r.id,
          studentName,
          photo: photos[0]?.thumbnails?.small?.url || photos[0]?.url || null,
          school: f['fldYKQp60pwoB7YFr']?.name || f['fldYKQp60pwoB7YFr'] || '',
          grade: f['fldFbfzsmGPPBUAP3']?.name || f['fldFbfzsmGPPBUAP3'] || '',
          teacher: f['fldTYrtOCYNOuGB1M'] || '',
          pickupPhone: f['fldNrNE405tkGrmh8'] || '',
          pickupName: f['fldXOFfMJuj4xK4YA'] || '',
          notes: f['fldYTfbphzjOJLDZE'] || '',
          pickupLocationId,
          pickupLocation: '',
          instructorName,
          instructorPhotoUrl,
          isOverride,
        });
      }

      return res.status(200).json({ roster });
    }

    if (action === 'getLocations') {
      const records = await getAllRecords('tblI5cwN5EIXqrdK2');
      return res.status(200).json({ records });
    }

    if (action === 'getChanges') {
      const todayISO = new Date().toISOString().slice(0, 10);
      const d = await get('tblEdgjx4phKSj4wS',
        `filterByFormula=DATESTR({Affected Pickup Date})="${todayISO}"`);
      return res.status(200).json({ records: d.records || [] });
    }

    if (action === 'logIncident') {
      const { description, type, severity } = body;
      const r = await fetch(`https://api.airtable.com/v0/${BASE}/tblBrZKAPGrg893o1`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [{ fields: {
          fldeXepi4JsJKPsWk: description,
          fldmgu6wxyuCiOZ48: type || 'Field Note',
          fldVIfEohqez31Wmw: severity || 'Low',
          fldw6vBAo2K3rI9ip: new Date().toISOString().slice(0, 10),
        }}]})
      });
      return res.status(200).json(await r.json());
    }

    // Legacy
    if (action === 'getStudents') {
      const records = await getAllRecords('tblJSQjtxq7yc29cY');
      return res.status(200).json({ records });
    }

    if (action === 'getStaff') {
      const d = await get('tblWuCldxuiPhtUUC');
      return res.status(200).json({ records: d.records || [] });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
