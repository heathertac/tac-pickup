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
      const sep = params ? '&' : '';
      const d = await get(table, offset ? `${params}${sep}offset=${offset}` : params);
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

  // Master schedule — source of truth for instructor assignments
  // Key: "FirstName_day" → instructor full name
  const MASTER_SCHEDULE = {
    // MONDAY
    'Ethan Owyang_mon': 'Rebecca Whittemore',
    'Adam Cheung_mon': 'Kevin Sims',
    'Dylan Cheung_mon': 'Kevin Sims',
    'Ada McGuire_mon': 'Kevin Sims',
    'Alice Huggins_mon': 'Kevin Sims',
    'Nellie Dieterich_mon': 'Kevin Sims',
    // TUESDAY
    'Ethan Owyang_tue': 'Rebecca Whittemore',
    'Adam Cheung_tue': 'Ricardo Marquez',
    'Dylan Cheung_tue': 'Ricardo Marquez',
    'Ilyaas Wower_tue': 'Ricardo Marquez',
    'Finn Rosenblatt_tue': 'Nicola Caminiti',
    // WEDNESDAY
    'Ethan Owyang_wed': 'Rebecca Whittemore',
    'Adam Cheung_wed': 'Kevin Sims',
    'Dylan Cheung_wed': 'Kevin Sims',
    'Ilyaas Wower_wed': 'Kevin Sims',
    'Ada McGuire_wed': 'Teresa',
    'Alice Huggins_wed': 'Teresa',
    // THURSDAY
    'Ethan Owyang_thu': 'Rebecca Whittemore',
    'Finn Rosenblatt_thu': 'Nicola Caminiti',
    'Marisela Aguilar_thu': 'Janet Chow',
    // FRIDAY
    'Ethan Owyang_fri': 'Rebecca Whittemore',
    'Adam Cheung_fri': 'Ricardo Marquez',
    'Dylan Cheung_fri': 'Ricardo Marquez',
    'Ilyaas Wower_fri': 'Ricardo Marquez',
    'Asher Muller_fri': 'Teresa',
    'Parker Corpuel_fri': 'Teresa',
    'Adina LaSota_fri': 'Regina D\'Soto',
    'Gaius LaSota_fri': 'Regina D\'Soto',
    'Nathaniel Dunham Welt_fri': 'Regina D\'Soto',
    'Sebastian Doolittle_fri': 'Regina D\'Soto',
    'Sydney Matani_fri': 'Regina D\'Soto',
  };

  // Closed days — no pickup
  const CLOSED_DATES = [
    '2026-05-25', // Memorial Day
    '2026-05-27',
    '2026-06-04',
    '2026-06-05',
    '2026-06-19', // Juneteenth
  ];

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action } = body || {};

    // ── NEW: getTodayRoster ──────────────────────────────────────────────────
    if (action === 'getTodayRoster') {
      const today = new Date();
      const todayISO = today.toISOString().slice(0, 10);
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const todayDay = days[today.getDay()];

      // Closed day check
      if (CLOSED_DATES.includes(todayISO) || todayDay === 'sat' || todayDay === 'sun') {
        return res.status(200).json({ roster: [] });
      }

      // Fetch students, staff, overrides in parallel
      const [students, staff, overrides, locations] = await Promise.all([
        getAllRecords('tblJSQjtxq7yc29cY'),
        getAllRecords('tblWuCldxuiPhtUUC'),
        getAllRecords('tblqX1tGUs6W5VGt4', `filterByFormula=DATESTR({Date})="${todayISO}"`),
        getAllRecords('tblI5cwN5EIXqrdK2'),
      ]);

      // Build staff map: recordId → { name, photoUrl }
      const staffMap = {};
      staff.forEach(r => {
        const f = r.fields || {};
        const photos = f['fld5wi8dP8Av7Y02g'] || [];
        const photoUrl = photos[0]?.thumbnails?.large?.url || photos[0]?.url || null;
        staffMap[r.id] = { name: f['fldpTZVDA2K7wAfKq'] || '', photoUrl };
      });

      // Build override map: studentRecordId → { instructorName, instructorPhotoUrl, isOverride }
      const overrideMap = {};
      overrides.forEach(a => {
        const f = a.fields || {};
        const stuIds = (f['fldLUu6am3Wuz1dl2'] || []).map(x => x.id || x);
        const instrArr = f['fldnbcjJYnszepnxK'] || [];
        const instrId = instrArr.length ? (instrArr[0].id || instrArr[0]) : null;
        const instrData = instrId ? staffMap[instrId] : null;
        stuIds.forEach(sid => {
          overrideMap[sid] = {
            instructorName: instrData?.name || '',
            instructorPhotoUrl: instrData?.photoUrl || null,
            isOverride: true,
          };
        });
      });

      // Build location map: recordId → { name, time, type }
      const locMap = {};
      locations.forEach(l => {
        const f = l.fields || {};
        locMap[l.id] = {
          name: f['fldJ4mods8J8uOJ8U'] || '',
          time: f['fldbuAax0OY76Bk3X'] || '',
          type: f['fldEOrHZFgF2Gu6Ym']?.name || f['fldEOrHZFgF2Gu6Ym'] || '',
        };
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
        const pickupLocIds = f['fldQVHtMRmpemPtZE'] || [];
        const pickupLocId = (pickupLocIds[0]?.id || pickupLocIds[0]) || null;
        const pickupLocData = pickupLocId ? locMap[pickupLocId] : null;

        // Instructor: check override first, then master schedule
        let instructorName = '';
        let instructorPhotoUrl = null;
        let isOverride = false;

        if (overrideMap[r.id]) {
          instructorName = overrideMap[r.id].instructorName;
          instructorPhotoUrl = overrideMap[r.id].instructorPhotoUrl;
          isOverride = true;
        } else {
          const scheduleKey = `${studentName}_${todayDay}`;
          instructorName = MASTER_SCHEDULE[scheduleKey] || '';
          // Find instructor photo from staff
          if (instructorName) {
            const staffRecord = staff.find(s => (s.fields?.['fldpTZVDA2K7wAfKq'] || '') === instructorName);
            if (staffRecord) {
              const sp = staffRecord.fields?.['fld5wi8dP8Av7Y02g'] || [];
              instructorPhotoUrl = sp[0]?.thumbnails?.large?.url || sp[0]?.url || null;
            }
          }
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
          pickupLocationId: pickupLocId || '',
          pickupLocation: pickupLocData?.name || '',
          instructorName,
          instructorPhotoUrl,  // ← fresh URL from Airtable every load
          isOverride,
        });
      }

      return res.status(200).json({ roster });
    }

    // ── getLocations ─────────────────────────────────────────────────────────
    if (action === 'getLocations') {
      const records = await getAllRecords('tblI5cwN5EIXqrdK2');
      return res.status(200).json({ records });
    }

    // ── getChanges ───────────────────────────────────────────────────────────
    if (action === 'getChanges') {
      const todayISO = new Date().toISOString().slice(0, 10);
      const d = await get('tblEdgjx4phKSj4wS',
        `filterByFormula=DATESTR({Affected Pickup Date})="${todayISO}"`);
      return res.status(200).json({ records: d.records || [] });
    }

    // ── logIncident ──────────────────────────────────────────────────────────
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

    // ── legacy actions (keep for backwards compat) ────────────────────────────
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
