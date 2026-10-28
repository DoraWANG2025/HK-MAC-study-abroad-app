// update-macau-gaokao.js
// 用途：① 更新云端已有 3 条记录（澳科大高考生/澳理工高考生/澳科大国际生）的志愿数量等字段
//       ② 插入澳门 4 条高考生新记录（城大/旅大/圣若瑟/镜湖），幂等：已存在则跳过
// 用法：DATABASE_URL="postgres://..." node update-macau-gaokao.js

const { Pool } = require('pg');

// ---- 需要更新的已有记录（按 name + audience + school 定位）----
const UPDATES = [
  {
    where: { name: '澳门科技大学（MUST）', audience: '高考生', school: '澳门科技大学' },
    set: {
      details: JSON.stringify(['招生：自主独立招生', '录取：普通专业一本线左右或以上；内外全科医学等热门专业须达一本线/特控线以上', '英语：接受高考英语，无硬性单科线']),
      tuition: '非澳门居民 2026/27：HK$163,000–206,000/年；内外全科医学 HK$258,000/年（官网学费表）',
      time: '参考 2026 年：2026-05-06 至 2026-06-30（2027 入学日期以官网公布为准）',
      quota: '必须填报 4 个志愿（可选服从志愿调配）',
      quota_note: '来源：澳科大官网《内地生报读本科课程常见问题》明确“每位考生在网上报名系统必须填报 4 个志愿”；官网 PDF 为直接来源',
      note: '来源：澳科大官网内地生常见问题 PDF 及 2026/2027 学费表。',
      source: 'official'
    }
  },
  {
    where: { name: '澳门理工大学（MPU）', audience: '高考生', school: '澳门理工大学' },
    set: {
      quota: '最多 2 个专业志愿（艺术类课程仅可填报 1 个）',
      quota_note: '来源：澳理大招生负责人受访介绍“可报两个专业”及媒体报道；2026/2027 艺术类招生简章明确每位考生仅可填报 1 个志愿',
      note: '来源：澳理工官方招生简章 PDF 及媒体采访。'
    }
  },
  {
    where: { name: '澳门科技大学（MUST）· 国际生', audience: '国际生', school: '澳门科技大学' },
    set: {
      quota: '必须填报 4 个志愿（可选服从志愿调配）',
      quota_note: '来源：澳科大官网《招生报读之常见问题》明确“每位申请人在网上报名系统必须填报 4 个志愿”；官网 PDF 为直接来源'
    }
  }
];

// ---- 新增高考生记录 ----
const NEW_RECORDS = [
  {
    region: '中国澳门', level: '大学本科', type: '—',
    name: '澳门城市大学（City U）· 高考生', school: '澳门城市大学', audience: '高考生',
    details: JSON.stringify(['招生：独立招生，与内地志愿不冲突，文理兼收', '批次：重点本科班（英文授课）一本线/特控线以上优先；普通本科班二本线以上择优', '无校内考试和面试；报名费人民币 500 元', '奖学金：最高减免全额学费及住宿费']),
    tuition: '非本地生约 HK$110,000–125,000/年（视课程而定）；大学先修班 HK$180,000/年',
    time: '2026 入学报名：2026-05-01 至 2026-06-30（官网）',
    quota: '最多 2 个专业志愿',
    quota_note: '来源：城大官方招生简章明确“每人可填报两个志愿”，未达第一志愿要求时考虑第二志愿；官网为直接来源',
    link_apply: 'https://admission.cityu.edu.mo/recruit/#!/McuIndex', link_programmes: 'https://www.cityu.edu.mo/zh/',
    note: '来源：澳门城市大学官方内地本科生招生简章。', source: 'official'
  },
  {
    region: '中国澳门', level: '大学本科', type: '—',
    name: '澳门旅游大学（UTM）· 高考生', school: '澳门旅游大学', audience: '高考生',
    details: JSON.stringify(['招生：独立招生，不占内地高考志愿名额', '成绩：高考达所在省市普通类本科第一批线（一本线/特控线）', '英语：综合评估高考英语成绩；高考外语非英语者需参加英语面试', '报名费：MOP 250']),
    tuition: '内地生 MOP 112,000/年，四年全额 MOP 448,000（2026/27 学年；2027/28 待公布）',
    time: '2027/28 学年报名：2027-05-04 至 2027-06-30（官网报名系统）',
    quota: '最多 3 个课程志愿（顺序志愿）',
    quota_note: '来源：澳门留学平台汇总及媒体报道，录取按志愿优先次序进行；官网未以数字直接列出',
    link_apply: 'https://www.utm.edu.mo/admission/sc/undergraduate_programmes/', link_programmes: 'https://www.utm.edu.mo/admission/filemanager/Flyer/en/upload/18/2026-2027%20UG%20admission%20brochure%20(ENG).pdf',
    note: '来源：澳门旅游大学官网 2027/28 学年内地本科生招生简章及学费页。', source: 'official'
  },
  {
    region: '中国澳门', level: '大学本科', type: '—',
    name: '圣若瑟大学（USJ）· 高考生', school: '圣若瑟大学', audience: '高考生',
    details: JSON.stringify(['招生：面向内地独立招生，应届/复读高考生均可', '成绩：高考成绩择优录取，本科批次线以上（平台参考）', '授课：分中文及英文授课课程；英文授课专业参考高考英语或雅思/托福', '网申：约每年 5 月开放、6 月底截止（平台参考）']),
    tuition: '国际学生标准 USD 14,000/年（约 MOP 112,000，2026/27 学年）；另设入学奖学金及最高 30% 学费资助',
    time: '往年约 5 月开放至 6 月底截止；2027 入学日期以官网公布为准',
    quota: '未获取',
    quota_note: '平台称“可填报多个专业志愿”但无确切数字，官网未列出',
    link_apply: 'https://www.usj.edu.mo/?p=312', link_programmes: 'https://www.usj.edu.mo/zh/%E6%8B%9B%E7%94%9F%E5%85%A5%E5%AD%B8/undergraduate-admissions/',
    note: '学费来自圣大官网学费页；报名安排及录取门槛参考平台信息。', source: 'aggregator'
  },
  {
    region: '中国澳门', level: '大学本科', type: '—',
    name: '澳门镜湖护理学院（KWNC）· 高考生', school: '澳门镜湖护理学院', audience: '高考生',
    details: JSON.stringify(['招生：独立招生，面向应届高中毕业生', '成绩：高考达本科线等级或以上', '英语：高考英语 110 分以上', '课程：护理学学士（四年制）']),
    tuition: '每学期 MOP 31,000，四年总额 MOP 248,000',
    time: '2026 报名：2026-05-18 至 2026-06-30',
    quota: '未获取',
    quota_note: '本次检索未找到镜湖志愿数量的可靠信息',
    link_apply: 'http://urp.kwnc.edu.mo/recruit/#!/DefaultIndex', link_programmes: 'https://www.kwnc.edu.mo/',
    note: '来源：人民日报党媒平台转载 2026 年各校招生安排。', source: 'aggregator'
  }
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ 未设置 DATABASE_URL 环境变量。用法：DATABASE_URL="postgres://..." node update-macau-gaokao.js');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // 1. 更新已有记录
  for (const u of UPDATES) {
    const keys = Object.keys(u.set);
    const sql = `UPDATE programs SET ${keys.map((k, i) => `${k} = $${i + 4}`).join(', ')} WHERE name = $1 AND audience = $2 AND school = $3`;
    const res = await pool.query(sql, [u.where.name, u.where.audience, u.where.school, ...Object.values(u.set)]);
    console.log(`${res.rowCount > 0 ? '✏️  已更新' : '⚠️  未找到'}：${u.where.name}（${u.where.audience}）`);
  }

  // 2. 插入新记录（幂等）
  let inserted = 0, skipped = 0;
  for (const r of NEW_RECORDS) {
    const exists = await pool.query(
      'SELECT id FROM programs WHERE name = $1 AND audience = $2 AND school = $3 LIMIT 1',
      [r.name, r.audience, r.school]
    );
    if (exists.rows.length > 0) {
      console.log(`⏭  已存在，跳过：${r.name}`);
      skipped++;
      continue;
    }
    await pool.query(
      `INSERT INTO programs (region, level, type, name, school, audience, details, tuition, time, quota, quota_note, link_apply, link_programmes, note, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [r.region, r.level, r.type, r.name, r.school, r.audience, r.details, r.tuition, r.time, r.quota, r.quota_note, r.link_apply, r.link_programmes, r.note, r.source]
    );
    console.log(`✅ 已插入：${r.name}`);
    inserted++;
  }

  const total = await pool.query('SELECT COUNT(*) AS n FROM programs');
  console.log(`\n完成：更新 ${UPDATES.length} 条，新增 ${inserted} 条，跳过 ${skipped} 条，云端库现共 ${total.rows[0].n} 条。`);
  await pool.end();
}

main().catch(err => { console.error('执行失败:', err.message); process.exit(1); });
