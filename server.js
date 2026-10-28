// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 从环境变量中读取云端数据库连接串
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
});

app.get('/api/programs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM programs');
    
    const formattedRows = result.rows.map(row => {
      let parsedDetails = [];
      let parsedCases = [];

      // 解析 details 字段
      try {
        parsedDetails = JSON.parse(row.details);
      } catch (e) {
        parsedDetails = [row.details];
      }

      // 解析 cases 字段
      try {
        parsedCases = row.cases ? JSON.parse(row.cases) : [];
      } catch (e) {
        parsedCases = [row.cases];
      }
      
      return {
        ...row,
        quotaNote: row.quota_note,
        linkApply: row.link_apply,
        linkProgrammes: row.link_programmes,
        details: parsedDetails,
        cases: parsedCases
      };
    });

    res.json({ data: formattedRows });
  } catch (err) {
    console.error("数据库查询失败:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 后端已成功连接云端数据库，监听端口: ${port}`);
});