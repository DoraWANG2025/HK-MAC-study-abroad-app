// server.js
const express = require('express');
const { Pool } = require('pg'); // 引入 PostgreSQL 驱动
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 填入你的云端数据库连接串（请把 [YOUR-PASSWORD] 替换成你真实的密码！）
// 注意：密码里如果包含 @ 或者 # 等特殊字符，需要转义（比如 @ 写成 %40）
const pool = new Pool({
  connectionString: "postgresql://postgres:Wang20050150117*@db.prkpulqchqfruehdpxrk.supabase.co:5432/postgres",
  ssl: { rejectUnauthorized: false } // 云端数据库通常需要开启 SSL
});

app.get('/api/programs', async (req, res) => {
  try {
    // 查询云端数据库
    const result = await pool.query('SELECT * FROM programs');
    
    // 注意：云数据库返回的列名是小写的下划线格式（如 quota_note），我们需要转回前端认识的小驼峰格式
    const formattedRows = result.rows.map(row => {
      let parsedDetails = [];
      try {
        parsedDetails = JSON.parse(row.details);
      } catch (e) {
        parsedDetails = [row.details];
      }
      
      return {
        ...row,
        quotaNote: row.quota_note,     // 转换列名
        linkApply: row.link_apply,     // 转换列名
        linkProgrammes: row.link_programmes, // 转换列名
        details: parsedDetails
      };
    });

    // 直接返回数组，保持和原来一样
    res.json({
      data: formattedRows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 后端已成功连接云端数据库: http://localhost:${port}`);
});