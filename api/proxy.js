module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const AIRTABLE_TOKEN = process.env.AIRTABLE_API_KEY;
  const BASE = 'appnWviGYgpWT2VPH';

  async function airtableFetch(path) {
    const r = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` }
    });
    const data = await r.json();
    // Normalize: map cellValuesByFieldId to fields
    if (data.records) {
      data.records = data.records.map(rec => ({
        ...rec,
        fields: rec.fields || rec.cellValuesByFieldId || {}
      }));
    }
    return data;
  }

  try {
    const { action } = req.body || {};

    if (action === 'getStudents') {
      const fields = [
        'fldSxrnb5OVFoTXea','fldCg5jyD4lNtmXS6','fldqiZE6x6xmkfTp6',
        'fldS1uncWbXSUnMjQ','fldNrNE405tkGrmh8','fldXOFfMJuj4xK4YA',
        'fldYTfbphzjOJLDZE','fldTYrtOCYNOuGB1M','fldFbfzsmGPPBUAP3',
        'fldYKQp60pwoB7YFr','fldQVHtMRmpemPtZE',
      ];
      const fieldParams = fields.map(f => `fields[]=${f}`).join('&');
      let allRecords = [];
      let offset = null;
      do {
        const url = `tblJSQjtxq7yc29cY?${fieldParams}${offset ? `&offset=${offset}` : ''}`;
        const data = await airtableFetch(url);
        allRecords = allRecords.concat(data.records || []);
        offset = data.offset;
      } while (offset);
      return res.status(200).json({ records: allRecords });
    }

    if (action === 'getStaff') {
      const fields = ['fldpTZVDA2K7wAfKq','fldR41zcrl85iKLBq','fldQZZW5GuC6EMl6A'];
      const fieldParams = fields.map(f => `fields[]=${f}`).join('&');
      const data = await airtableFetch(`tblWuCldxuiPhtUUC?${fieldParams}`);
      return res.status(200).json({ records: data.records || [] });
    }

    if (action === 'getChanges') {
      const data = await airtableFetch('tblEdgjx4phKSj4wS');
      return res.status(200).json({ records: data.records || [] });
    }

    if (action === 'logIncident') {
      const { description, type, severity } = req.body;
      const r = await fetch(`https://api.airtable.com/v0/${BASE}/tblBrZKAPGrg893o1`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            fields: {
              fldeXepi4JsJKPsWk: description,
              fldmgu6wxyuCiOZ48: { name: type || 'Field Note' },
              fldVIfEohqez31Wmw: { name: severity || 'Low' }
            }
          }]
        })
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
