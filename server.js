// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

// 👇 1. 这里是【改】：把原来的 3000 换成这句
const port = process.env.PORT || 3000; 

app.use(cors());
app.use(express.json());

// 👇 2. 这里是【加】：必须加这行，告诉服务器把 index.html 发给浏览器
app.use(express.static(__dirname)); 

// 3. 连接云端数据库（记得把“真实密码”四个字替换掉）
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:你的真实密码@db.prkpulqchqfruehdpxrk.supabase.co:5432/postgres",
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