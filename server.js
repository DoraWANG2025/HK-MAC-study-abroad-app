// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 从环境变量中读取云端数据库连接串
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ---------- 数据更新时间与去重逻辑 ----------

// 缓存：内容哈希 + 数据最后一次真实变更的时间
let dataCache = { hash: null, lastUpdated: null };

// 生成数据内容哈希（只取业务字段，忽略 id 等无关字段，保证内容不变则哈希不变）
function computeHash(rows) {
  const keyFields = ['region', 'level', 'type', 'name', 'school', 'audience', 'details', 'tuition',
    'time', 'quota', 'quota_note', 'link_apply', 'link_programmes', 'note', 'source', 'cases', 'qs_rank'];
  const normalized = rows.map(row => {
    const obj = {};
    keyFields.forEach(f => { obj[f] = row[f] ?? null; });
    return obj;
  });
  return crypto.createHash('sha1').update(JSON.stringify(normalized)).digest('hex');
}

// 估算一条记录的信息完整度（用于在重复记录中保留信息最全的那条）
function completenessScore(row) {
  const fields = ['tuition', 'time', 'quota', 'quota_note', 'link_apply', 'link_programmes'];
  let score = 0;
  fields.forEach(f => {
    const v = row[f] == null ? '' : String(row[f]).trim();
    if (v && v !== '未获取') score++;
  });
  try {
    const cases = row.cases ? JSON.parse(row.cases) : [];
    if (Array.isArray(cases) && cases.length > 0) score += 2;
  } catch (e) { /* cases 解析失败不加分 */ }
  return score;
}

// 按 自然键 去重：同一学校 + 同一人群 + 同名条目只保留一条。
// 多条重复时保留信息最全的；信息完整度相同则保留 id 较大（较新插入）的那条。
function dedupRows(rows) {
  const keyOf = r => [r.region, r.level, r.type, r.name, r.school, r.audience]
    .map(x => (x == null ? '' : String(x).trim())).join('|');

  const best = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    const cur = best.get(key);
    if (!cur) { best.set(key, row); continue; }
    const rNew = completenessScore(row), rOld = completenessScore(cur);
    if (rNew > rOld || (rNew === rOld && Number(row.id) > Number(cur.id))) {
      best.set(key, row);
    }
  }
  // 保持原有输出顺序（按首次出现位置），内容替换为最优记录
  return rows.filter(r => best.get(keyOf(r)) === r);
}

app.get('/api/programs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM programs ORDER BY id');

    const rawCount = result.rows.length;
    const rows = dedupRows(result.rows);

    // 检测数据内容是否真实变化：变了才刷新“数据更新时间”
    const hash = computeHash(rows);
    if (hash !== dataCache.hash) {
      if (dataCache.hash !== null) {
        console.log(`📝 检测到数据内容变更，更新时间刷新为当前时刻`);
      }
      dataCache.hash = hash;
      dataCache.lastUpdated = new Date();
    }
    const lastUpdated = dataCache.lastUpdated.toISOString();

    if (rawCount !== rows.length) {
      console.log(`🧹 去重：云端库 ${rawCount} 条 -> 去重后 ${rows.length} 条`);
    }

    const formattedRows = rows.map(row => {
      let parsedDetails = [];
      let parsedCases = [];

      try {
        parsedDetails = JSON.parse(row.details);
      } catch (e) {
        parsedDetails = [row.details];
      }

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

    res.json({
      data: formattedRows,
      lastUpdated: lastUpdated,
      total: formattedRows.length,
      rawTotal: rawCount
    });
  } catch (err) {
    console.error("数据库查询失败:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 后端已成功连接云端数据库，监听端口: ${port}`);
});
