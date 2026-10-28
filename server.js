<<<<<<< HEAD
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
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.prkpulqchqfruehdpxrk:Wang20050150117*@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

app.get('/api/programs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM programs');
    
    const formattedRows = result.rows.map(row => {
      let parsedDetails = [];
      let parsedCases = []; // 新增：准备装案例的盒子
      
      // 拆开原有的 details
      try {
        parsedDetails = JSON.parse(row.details);
      } catch (e) {
        parsedDetails = [row.details];
      }
      
      // 拆开新的 cases
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
        cases: parsedCases // 把拆好的案例递给前端
      };
    });

    res.json({ data: formattedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 后端已成功启动: 端口 ${port}`);
=======
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
>>>>>>> 8802985 (fix port and static files)
});