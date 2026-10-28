// add-qs-rank.js
// 用途：给云端 PostgreSQL 的 programs 表新增 qs_rank 列，并按学校写入 QS 2027 世界排名
// 用法：DATABASE_URL="postgres://..." node add-qs-rank.js（可重复运行）

const { Pool } = require('pg');

// QS 世界大学排名 2027（2026-06-18 发布，来源：topuniversities.com / 中新社 / 澳门新闻局）
const QS_RANK = {
  '香港大学': '#11',
  '香港中文大学': '#18',
  '香港科技大学': '#33',
  '香港理工大学': '#50',
  '香港城市大学': '#52',
  '香港浸会大学': '#216',
  '香港教育大学': '#406',
  '岭南大学': '#581',
  '香港都会大学': '781–790',
  '香港树仁大学': '1001–1200',
  '香港恒生大学': '未上榜',
  '东华学院': '未上榜',
  '香港珠海学院': '未上榜',
  '澳门大学': '#267',
  '澳门科技大学': '#398',
  '澳门理工大学': '951–1000',
  '澳门城市大学': '1001–1200',
  '圣若瑟大学': '未上榜',
  '澳门旅游大学': '未上榜',
  '澳门镜湖护理学院': '未上榜'
};

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ 未设置 DATABASE_URL 环境变量。用法：DATABASE_URL="postgres://..." node add-qs-rank.js');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // 幂等加列（已存在则跳过）
  await pool.query('ALTER TABLE programs ADD COLUMN IF NOT EXISTS qs_rank TEXT');

  let updated = 0;
  for (const [school, rank] of Object.entries(QS_RANK)) {
    const res = await pool.query('UPDATE programs SET qs_rank = $1 WHERE school = $2', [rank, school]);
    updated += res.rowCount;
    console.log(`${res.rowCount > 0 ? '✏️ ' : '⚠️ '} ${school} -> QS 2027 ${rank}（${res.rowCount} 条记录）`);
  }

  const check = await pool.query('SELECT school, qs_rank, COUNT(*) AS n FROM programs GROUP BY school, qs_rank ORDER BY school');
  console.log('\n云端库当前 qs_rank 分布：');
  check.rows.forEach(r => console.log(`  ${r.school}: ${r.qs_rank} (${r.n} 条)`));
  console.log(`\n完成：共更新 ${updated} 条记录。`);
  await pool.end();
}

main().catch(err => { console.error('执行失败:', err.message); process.exit(1); });
