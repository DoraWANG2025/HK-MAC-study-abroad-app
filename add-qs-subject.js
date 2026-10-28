// add-qs-subject.js
// 给云端 PostgreSQL 写入 QS 2026 世界大学学科排名（按 school 匹配，幂等可重复运行）
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// QS 2026 学科排名亮点（2026-03-25 发布，多来源交叉验证）
const QS_SUBJECT = {
  "香港大学": "牙医学 #2（亚洲第一）· 教育与培训 #5 · 地理学 #11 · 建筑与建造环境 #14 · 图书馆及信息管理 #15 · 数据科学与人工智能 #18（全港第一）· 法学 #20 · 土木与结构工程 #20（共 51 科上榜，29 科进全球前 50）",
  "香港中文大学": "护理学 #6 · 传播与媒体研究 #16 · 语言学 #25 · 数据科学与人工智能 #28（21 个学科跻身全球前 50）",
  "香港科技大学": "数据科学与人工智能 #25 · 土木与结构工程 #27 · 商业与管理学 #30 · 计算机科学与信息系统 #33（11 个学科进全球前 50）",
  "香港理工大学": "酒店与休闲管理 #15 · 土木与结构工程 #18 · 护理学 #18 · 建筑与建造环境 #21 · 艺术与设计 #24（四个学科全港第一，24 科进全球百强）",
  "香港城市大学": "语言学 #36 · 材料科学 #39 与兽医学均列全港第一 · 法律与法律研究 #41 · 传播与媒体研究 #49（5 个学科进全球前 50）",
  "香港浸会大学": "古典文学与古代史 #38 · 传播与媒体研究 #48",
  "香港教育大学": "教育学 #7（首次跻身全球前十）",
  "岭南大学": "8 个学科上榜，哲学、传播与媒体研究等表现最佳（QS 指其为本年度进步最显著的院校之一）",
  "香港都会大学": "首次上榜，共 6 个学科（酒店与休闲管理等，最佳名次 101–150）",
  "澳门大学": "共 17 个学科上榜：语言学 #98 · 酒店与休闲管理 51–100 · 社会学 151–200 · 计算机科学与信息系统 251–300（大幅跃升 250 位）",
  "澳门科技大学": "共 6 个学科上榜：酒店与休闲管理 101–150 · 计算机科学 401–450 · 电子电气工程 401–450（首次上榜）",
  "澳门理工大学": "首次进入学科排名，共 2 个学科：语言学 301–350 · 计算机科学与信息系统 451–500",
  "澳门旅游大学": "酒店与休闲管理全球 #10（亚洲第一、澳门第一）"
};

async function main() {
  // 兼容旧表结构：字段不存在则新增
  await pool.query(`ALTER TABLE programs ADD COLUMN IF NOT EXISTS qs_subject TEXT`);

  const entries = Object.entries(QS_SUBJECT);
  let updated = 0;
  for (const [school, subject] of entries) {
    const res = await pool.query(
      'UPDATE programs SET qs_subject = $1 WHERE school = $2',
      [subject, school]
    );
    updated += res.rowCount;
    console.log(`  ${school}: 更新 ${res.rowCount} 条`);
  }

  // 没有学科数据的学校清空该字段（保持“无亮点行”的前端展示逻辑）
  const clearRes = await pool.query(
    `UPDATE programs SET qs_subject = NULL WHERE school <> ALL($1) AND qs_subject IS NOT NULL`,
    [Object.keys(QS_SUBJECT)]
  );

  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total, COUNT(qs_subject)::int AS with_subject FROM programs'
  );
  console.log(`✅ 完成：更新 ${updated} 条，清空 ${clearRes.rowCount} 条；云端共 ${rows[0].total} 条，其中 ${rows[0].with_subject} 条含学科亮点`);
}

main()
  .catch(err => { console.error('❌ 失败:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
