// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

// 1. 适配 Render 的动态端口
const port = process.env.PORT || 3000; 

app.use(cors());
app.use(express.json());

// 2. 让 Render 能够直接向浏览器发送前端文件（index.html）
app.use(express.static(__dirname)); 

// 3. 连接云端数据库
const pool = new Pool({
  // 这里的 || 后面是本地测试用的备用连接串。如果你在 Render 里配了 DATABASE_URL 环境变量，它就会优先用那个。
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:Wang20050150117*@db.prkpulqchqfruehdpxrk.supabase.co:5432/postgres",
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
  console.log(`🚀 后端已成功启动: 端口 ${port}`);
});