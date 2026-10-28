// add-macau-intl.js
// 用途：向云端 PostgreSQL 的 programs 表插入「澳门 · 国际生」5 条新记录（幂等：已存在则跳过）
// 用法：DATABASE_URL="postgres://用户名:密码@主机/库名" node add-macau-intl.js
// DATABASE_URL 在 Render 控制台 -> 你的 Web Service -> Environment -> Environment Variables 里可以找到

const { Pool } = require('pg');

const NEW_RECORDS = [
  {
    region: '中国澳门', level: '大学本科', type: '—',
    name: '澳门科技大学（MUST）· 国际生', school: '澳门科技大学', audience: '国际生',
    details: JSON.stringify(['招生：直接入学（Direct Admission）通道', '学历：A-Level / IB / SAT / ACT / HKDSE 等（内外全科医学另有更高要求）', '英语：雅思 6.0 或托福 79 可豁免入学英语科目', '申请费：直接入学 HK$1,000']),
    tuition: '非澳门居民 2026/27：HK$163,000–206,000/年；内外全科医学 HK$258,000/年',
    time: '直接入学网上报名：2026-01-22 至 2026-04-22（2026/27 学年；2027/28 学年日期以官网公布为准）',
    quota: '未获取', quota_note: '本次检索未找到澳科大国际生通道志愿数量的可靠信息',
    link_apply: 'https://www.must.edu.mo/admission', link_programmes: 'https://www.must.edu.mo/admission/programmes',
    note: '来源：澳科大 2026/2027 学士学位课程招生简章及非澳门居民学费表（官网 PDF）。', source: 'official'
  },
  {
    region: '中国澳门', level: '大学本科', type: '—',
    name: '澳门理工大学（MPU）· 国际生', school: '澳门理工大学', audience: '国际生',
    details: JSON.stringify(['招生：直接入学通道，接受 A-Level / IB / SAT / ACT / HKDSE / UEC 等国际课程或公开考试成绩', '对象：持非高考成绩的应届高中毕业生', '英语：雅思 6.0 / 托福 79+（平台参考），部分课程设面试']),
    tuition: '其他国家和地区学生：四年全额 MOP 480,000（2024/25 学年及以后入学标准，官网）',
    time: '往年直接入学报名约至 6 月中旬截止；2027 入学日期以官网公布为准',
    quota: '未获取', quota_note: '本次检索未找到澳理工国际生通道志愿数量的可靠信息',
    link_apply: 'https://www.mpu.edu.mo/admission_overseas/en/application.php', link_programmes: 'https://www.mpu.edu.mo/admission/programmes/',
    note: '学费来自澳理工官网学费页；报名时间参考往年安排及媒体报道，官方 2027 日期暂未公布。', source: 'official'
  },
  {
    region: '中国澳门', level: '大学本科', type: '—',
    name: '澳门城市大学（City U）· 国际生', school: '澳门城市大学', audience: '国际生',
    details: JSON.stringify(['招生：本地、港台及国际生统一报名通道', '学历：中六毕业或同等学历，需英语能力证明', '选拔：资料审核 + 面试，或面试 + 笔试', '奖学金：国际生最高可获 100% 学费及首年住宿减免']),
    tuition: '非本地生约 HK$110,000–120,000/年（视课程而定）',
    time: '2026/27 学年国际生报名：2026-01-01 至 2026-06-30（官网）',
    quota: '未获取', quota_note: '本次检索未找到城大国际生志愿数量的可靠信息',
    link_apply: 'https://admission.cityu.edu.mo/recruit/#!/McuIndex', link_programmes: 'https://www.cityu.edu.mo/zh/4may2026-01/',
    note: '来源：澳门城市大学官网 2026/2027 学年招生公告及国际生奖学金简章。', source: 'official'
  },
  {
    region: '中国澳门', level: '大学本科', type: '—',
    name: '圣若瑟大学（USJ）· 国际生', school: '圣若瑟大学', audience: '国际生',
    details: JSON.stringify(['招生：国际学生直接申请，课程以全英文授课为主', '学历：完成中六/12 年级或同等学历', '英语：雅思 5.5 / 托福 iBT 59 / 多邻国 95（开学前两年内有效）', '报名费：MOP 500']),
    tuition: '国际学生 USD 14,000/年（约 MOP 112,000，2026/27 学年）；另设最高 30% 学费资助/奖学金',
    time: '2027/28 学年学费优惠及申请安排：官网 11 月起公布',
    quota: '未获取', quota_note: '本次检索未找到圣大志愿数量的可靠信息',
    link_apply: 'https://www.usj.edu.mo/', link_programmes: 'https://www.usj.edu.mo/zh/%E6%8B%9B%E7%94%9F%E5%85%A5%E5%AD%B8/undergraduate-admissions/undergraduate-programmes-tuition-fees/',
    note: '来源：圣若瑟大学官网学费页及院校介绍。', source: 'official'
  },
  {
    region: '中国澳门', level: '大学本科', type: '—',
    name: '澳门旅游大学（UTM）· 国际生', school: '澳门旅游大学', audience: '国际生',
    details: JSON.stringify(['招生：直接入学（Direct Admission）通道，持公开考试成绩或相关学历', '学历：已完成或正就读中六（或同等学历）', '选拔：2025 年 11 月起分批面试，12 月起分批公布录取', '报名费：MOP 250']),
    tuition: '外国学生：四年全额 MOP 480,000（约 MOP 120,000/年，2026/27 学年）',
    time: '直接入学网上报名：2025-09-29 至 2026-05-31（2026/27 学年；2027/28 以官网公布为准）',
    quota: '未获取', quota_note: '本次检索未找到旅大志愿数量的可靠信息',
    link_apply: 'https://www.utm.edu.mo/admission/sc/undergraduate_programmes/', link_programmes: 'https://www.utm.edu.mo/admission/filemanager/Flyer/en/upload/18/2026-2027%20UG%20admission%20brochure%20(ENG).pdf',
    note: '来源：澳门旅游大学官网 2026/2027 学年招生简章及学费页。', source: 'official'
  }
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ 未设置 DATABASE_URL 环境变量。请从 Render 控制台获取连接串后运行：');
    console.error('   DATABASE_URL="postgres://..." node add-macau-intl.js');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

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
  console.log(`\n完成：新增 ${inserted} 条，跳过 ${skipped} 条，云端库现共 ${total.rows[0].n} 条。`);
  await pool.end();
}

main().catch(err => { console.error('执行失败:', err.message); process.exit(1); });
