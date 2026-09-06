module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const TOKEN = process.env.AIRTABLE_API_KEY;
  const BASE = 'appnWviGYgpWT2VPH';

  // ---------------------------------------------------------------------
  // TEST MODE
  // Activated ONLY by a ?testdate=YYYY-MM-DD parameter on the app URL,
  // which index.html forwards here. There is no button and no UI for it.
  // When active:
  //   - the semester window and closure list are ignored, so any date works
  //   - every parent phone is replaced with TEST_PHONE below
  //   - nothing is written to the Incidents table
  // Remove nothing here to "go live" — with no parameter, this code is inert.
  // ---------------------------------------------------------------------
  const TEST_PHONE = '8036032328'; // Heather's mobile

  async function get(table, params='') {
    const r = await fetch(`https://api.airtable.com/v0/${BASE}/${table}?${params}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    return r.json();
  }

  async function getAllRecords(table, params='') {
    let records = [], offset = null;
    do {
      const p = offset ? `${params}${params?'&':''}offset=${offset}` : params;
      const d = await get(table, p);
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

  // Weekday for an ISO date string, computed in UTC so it can never drift
  // by a day depending on where the server happens to be running.
  function isoWeekday(iso) {
    const p = String(iso).split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
  }

  // Semester windows. Outside every window the roster comes back EMPTY —
  // no program is running, so no cards, no stops. Add the spring term here
  // when its dates are set, and the winter gap closes itself.
  const SEMESTERS = [
    { label: 'Fall 2026', start: '2026-09-06', end: '2026-12-26' },
    // { label: 'Spring 2027', start: '2027-MM-DD', end: '2027-MM-DD' },
  ];

  function inSemester(iso) {
    return SEMESTERS.some(s => iso >= s.start && iso <= s.end);
  }

  // Fall 2026 semester: week of Sep 6 through week of Dec 20, 2026.
  // Source: TAC semester schedule (the closures parents see when purchasing).
  // Weekends are already excluded below, so only weekdays are listed here.
  // WARNING: a date wrongly listed here returns an EMPTY roster that day.
  const CLOSED_DATES = [
    // September — school year starts Thu Sep 10
    '2026-09-07', // Labor Day
    '2026-09-08',
    '2026-09-09',
    '2026-09-21', // Yom Kippur
    '2026-09-30',
    // October
    '2026-10-12', // Italian Heritage / Indigenous Peoples' Day
    // November
    '2026-11-03', // Election Day
    '2026-11-05',
    '2026-11-11', // Veterans Day
    '2026-11-26', // Thanksgiving
    '2026-11-27',
    // December — fall semester ends Wed Dec 23
    '2026-12-24',
    '2026-12-25',
  ];

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action } = body || {};

    // Only an exact YYYY-MM-DD string turns test mode on. Anything else is ignored.
    const testDate =
      body && typeof body.testdate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.testdate)
        ? body.testdate
        : null;

    // The day the app is currently showing. Unlike testDate this changes
    // NOTHING about safety: real phones, real writes, and the semester and
    // closure rules still apply, so browsing to a closed day correctly shows
    // an empty roster with a reason rather than a phantom one.
    const viewDate =
      body && typeof body.viewdate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.viewdate)
        ? body.viewdate
        : null;

    if (action === 'getTodayRoster') {
      const days = ['sun','mon','tue','wed','thu','fri','sat'];
      const today = new Date();
      const askedFor = testDate || viewDate;
      const todayISO = askedFor || today.toISOString().slice(0, 10);
      const todayDay = askedFor ? days[isoWeekday(askedFor)] : days[today.getDay()];

      // Live behaviour only. In test mode every date is allowed through so the
      // screen can be walked before the semester opens.
      if (!testDate) {
        if (!inSemester(todayISO)) {
          return res.status(200).json({ roster: [], closedReason: 'Between semesters' });
        }
        if (todayDay === 'sat' || todayDay === 'sun') {
          return res.status(200).json({ roster: [], closedReason: 'Weekend — no program' });
        }
        if (CLOSED_DATES.includes(todayISO)) {
          return res.status(200).json({ roster: [], closedReason: 'Closed — no program this day' });
        }
      }

      const [students, staff, assignments] = await Promise.all([
        getAllRecords('tblJSQjtxq7yc29cY'),
        getAllRecords('tblWuCldxuiPhtUUC'),
        getAllRecords('tblqX1tGUs6W5VGt4',
          `filterByFormula=DATESTR({Date})="${todayISO}"`),
      ]);

      // Build staff lookup by record ID
      const staffById = {};
      staff.forEach(r => {
        const f = r.fields || {};
        const name = f['Name'] || '';
        const photos = f['Photo'] || [];
        const photoUrl = photos[0]?.thumbnails?.large?.url || photos[0]?.url || null;
        staffById[r.id] = { name, photoUrl };
      });

      // Build assignment map keyed by student record ID
      // The REST API returns linked record fields as arrays of plain record ID strings
      const assignmentMap = {};
      assignments.forEach(a => {
        const f = a.fields || {};

        // Student field: array of record ID strings e.g. ["recABC123"]
        const stuIds = (f['Student'] || []).map(x => (typeof x === 'string' ? x : x.id));

        // Assigned Instructor: array of record ID strings. There can be MORE THAN
        // ONE (a lead plus an assistant, e.g. Janet + Shorn at PS384 on 9/11), so
        // read every entry. Taking only the first silently hides the second
        // instructor from the app.
        const instrArr = f['Assigned Instructor'] || [];
        const instructors = instrArr
          .map(x => (typeof x === 'string' ? x : (x && x.id) || null))
          .map(id => (id ? staffById[id] : null))
          .filter(Boolean);

        // Pickup Location: array of record ID strings
        const locArr = f['Pickup Location'] || [];
        const locationId = typeof locArr[0] === 'string' ? locArr[0] : locArr[0]?.id || null;

        // Bus Arrival Time
        const busTime = f['Bus Arrival Time'] || '';

        // Notes
        const notes = f['Notes'] || '';

        // EOD Location
        const eodLoc = f['EOD Location']?.name || f['EOD Location'] || '';

        // Parent drop-off: any assignment field whose value starts with "Parent drop"
        const parentDropoff = Object.values(f).some(
          v => typeof v === 'string' && v.trim().toLowerCase().startsWith('parent drop')
        );

        const rowStatus = f['Status']?.name || f['Status'] || '';

        stuIds.forEach(sid => {
          assignmentMap[sid] = {
            assignmentId: a.id,
            rowStatus,
            instructors,
            instructorName: instructors[0]?.name || '',
            instructorPhotoUrl: instructors[0]?.photoUrl || null,
            locationId,
            busTime,
            notes,
            eodLoc,
            parentDropoff,
          };
        });
      });

      // Build roster
      const roster = [];
      for (const r of students) {
        const f = r.fields || {};
        const status = (f['Status']?.name || f['Status'] || '').toLowerCase();
        if (!status.includes('active')) continue;

        const enrolledDays = (f['Enrolled Days'] || []).map(d => normDay(d.name || d));
        if (!enrolledDays.includes(todayDay)) continue;

        const studentName = f['Name'] || 'Unknown';
        const photos = f['Photo'] || [];
        const defaultLocIds = f['Default Pickup Location'] || [];
        const defaultLocId = typeof defaultLocIds[0] === 'string'
          ? defaultLocIds[0]
          : defaultLocIds[0]?.id || null;

        const assignment = assignmentMap[r.id];
        const hasAssignment = !!assignment;

        const instructors = assignment?.instructors || [];
        const assignmentId = assignment?.assignmentId || null;
        const rowStatus = assignment?.rowStatus || '';
        const instructorName = assignment?.instructorName || '';
        const instructorPhotoUrl = assignment?.instructorPhotoUrl || null;
        const pickupLocationId = assignment?.locationId || defaultLocId || '';

        // In test mode every text goes to Heather, never to a family.
        const realPhone = f['Pickup Contact Phone'] || '';
        const pickupPhone = testDate ? (realPhone ? TEST_PHONE : '') : realPhone;

        roster.push({
          studentId: r.id,
          studentName,
          photo: photos[0]?.thumbnails?.small?.url || photos[0]?.url || null,
          school: f['School']?.name || f['School'] || '',
          grade: f['Grade']?.name || f['Grade'] || '',
          teacher: f['Homeroom Teacher'] || '',
          classroom: f['Classroom'] || '',
          pickupPhone,
          pickupName: f['Pickup Contact Name'] || '',
          notes: f['Notes (Nice to Know)'] || '',
          pickupLocationId,
          pickupLocation: '',
          assignmentId,
          rowStatus,
          instructors,
          instructorName,
          instructorPhotoUrl,
          parentDropoff: assignment?.parentDropoff || false,
          labArrivalTime: f['Lab Arrival Time'] || '',
          isOverride: false, // removed — "Sub" badge was misleading
        });
      }

      // Every active staff name, so the "who is using this phone" picker
      // still works on days that have no assignment rows yet.
      const staffList = Object.keys(staffById)
        .map(id => ({ name: staffById[id].name, photoUrl: staffById[id].photoUrl }))
        .filter(s => s.name)
        .sort((a, b) => a.name.localeCompare(b.name));

      return res.status(200).json({ roster, staff: staffList, testMode: !!testDate, testDate: testDate || null });
    }

    if (action === 'getLocations') {
      const records = await getAllRecords('tblI5cwN5EIXqrdK2');
      return res.status(200).json({ records });
    }

    if (action === 'getChanges') {
      const todayISO = testDate || viewDate || new Date().toISOString().slice(0, 10);
      const d = await get('tblEdgjx4phKSj4wS',
        `filterByFormula=DATESTR({Affected Pickup Date})="${todayISO}"`);
      const records = d.records || [];

      // Build a simple list of students who need NO PICKUP today.
      // Linked student fields come back as arrays of record ID strings.
      const noPickupStudentIds = [];
      records.forEach(rec => {
        const f = rec.fields || {};
        const type = f['Change Type']?.name || f['Change Type'] || '';
        if (type === 'No Pickup Needed') {
          const linked = f['Linked Student'] || [];
          linked.forEach(x => {
            const sid = (typeof x === 'string') ? x : (x && x.id) ? x.id : null;
            if (sid) noPickupStudentIds.push(sid);
          });
        }
      });

      return res.status(200).json({ records, noPickupStudentIds });
    }

    // ------------------------------------------------------------------
    // SHARED PICKUP STATE
    // Writes the pickup outcome onto the student's Pickup Assignment row so
    // every instructor — and Rebecca's dashboard — sees the same picture.
    // Uses the Status options that already exist on the table:
    //   Custody Confirmed = instructor has the child
    //   Completed         = child has been collected AND the parent notified
    //   Incident          = child was not at the stop
    // ------------------------------------------------------------------
    if (action === 'setPickupStatus') {
      const { assignmentId, status } = body;
      const ALLOWED = ['Custody Confirmed', 'Completed', 'Incident', 'Scheduled'];

      if (!assignmentId || !ALLOWED.includes(status)) {
        return res.status(400).json({ error: 'Bad assignmentId or status' });
      }
      // Test mode never touches live rows.
      if (testDate) {
        return res.status(200).json({ skipped: true, testMode: true });
      }

      const r = await fetch(`https://api.airtable.com/v0/${BASE}/tblqX1tGUs6W5VGt4/${assignmentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { fldH57ACWfMEwHEEA: status } })
      });
      const out = await r.json();
      if (!r.ok) return res.status(502).json({ error: out?.error?.message || 'Airtable write failed' });
      return res.status(200).json({ ok: true, id: out.id, status });
    }

    if (action === 'logIncident') {
      // Test mode never writes to the audit log.
      if (testDate) {
        return res.status(200).json({ skipped: true, testMode: true });
      }
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
