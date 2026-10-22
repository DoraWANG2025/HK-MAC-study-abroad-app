const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
// 本地端口固定是 3000
const port = 3000; 

app.use(cors());
app.use(express.json());

// 用最早的直连地址（本地电脑网络支持直连）
const pool = new Pool({
  connectionString: "postgresql://postgres.prkpulqchqfruehdpxrk:Wang20050150117@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

app.get('/api/programs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM programs');
    const formattedRows = result.rows.map(row => {
      let parsedDetails = [];
      try {
        parsedDetails = JSON.parse(row.details);
      } catch (e) {
        parsedDetails = [row.details];
      }
      return {
        ...row,
        quotaNote: row.quota_note,
        linkApply: row.link_apply,
        linkProgrammes: row.link_programmes,
        details: parsedDetails
      };
    });
    res.json({ data: formattedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 本地后端已启动: http://localhost:${port}`);
});