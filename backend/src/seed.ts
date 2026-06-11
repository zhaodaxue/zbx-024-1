import { initDB, getDB, saveDB } from './db';
import dayjs from 'dayjs';
import { SmellType } from './types';

interface SeedInspection {
  cellar_no: string;
  opening: number;
  smell: SmellType;
  operator: string;
  change_reason: string | null;
  inspection_time: string;
}

function clearData() {
  const db = getDB();
  db.run('DELETE FROM inspections');
  db.run('DELETE FROM cellars');
  db.run("DELETE FROM sqlite_sequence WHERE name IN ('cellars', 'inspections')");
  saveDB();
}

function createCellars() {
  const db = getDB();
  const cellarNos = ['A01', 'A02', 'A03', 'A04', 'B01', 'B02', 'B03', 'B04'];
  const stmt = db.prepare('INSERT INTO cellars (cellar_no, status) VALUES (?, ?)');

  for (const no of cellarNos) {
    if (no === 'A03') {
      stmt.run([no, 'need_turn']);
    } else {
      stmt.run([no, 'normal']);
    }
  }
  stmt.free();
  saveDB();
  console.log('✅ 已创建 8 个窖位');
}

function generateInspections(): SeedInspection[] {
  const inspections: SeedInspection[] = [];
  const operators = ['张大爷', '李婶', '王叔', '赵嫂'];
  const smellOptions: SmellType[] = [
    'normal',
    'normal',
    'normal',
    'normal',
    'sour',
    'dry',
  ];
  const reasons = ['rainy', 'cooling', 'tasting'];

  const cellars = [
    { no: 'A01', baseOpening: 50, volatile: false },
    { no: 'A02', baseOpening: 45, volatile: false },
    { no: 'A03', baseOpening: 35, volatile: true, needTurn: true },
    { no: 'A04', baseOpening: 55, volatile: false },
    { no: 'B01', baseOpening: 40, volatile: true },
    { no: 'B02', baseOpening: 60, volatile: false },
    { no: 'B03', baseOpening: 50, volatile: false },
    { no: 'B04', baseOpening: 48, volatile: true },
  ];

  const today = dayjs();
  const startDate = today.subtract(14, 'day');

  for (let day = 0; day < 14; day++) {
    const currentDate = startDate.add(day, 'day');
    const isWeekend = day % 7 === 5 || day % 7 === 6;

    for (const cellar of cellars) {
      for (const shift of [0, 1]) {
        const hour = shift === 0 ? 8 : 16;
        const minute = Math.floor(Math.random() * 30);
        const inspectionTime = currentDate
          .hour(hour)
          .minute(minute)
          .format('YYYY-MM-DD HH:mm:ss');

        let opening = cellar.baseOpening + Math.floor(Math.random() * 11) - 5;
        if (cellar.volatile) {
          opening += Math.floor(Math.random() * 15) - 7;
        }
        opening = Math.max(10, Math.min(90, opening));

        let smell: SmellType;
        if (cellar.needTurn && day >= 10) {
          smell = 'sour';
        } else if (cellar.needTurn && day >= 7) {
          smell = day % 2 === 0 ? 'sour' : 'normal';
        } else {
          smell = smellOptions[Math.floor(Math.random() * smellOptions.length)];
        }

        if (cellar.needTurn && day >= 11) {
          opening = Math.min(opening, 55);
        }

        let changeReason: string | null = null;

        const prevInspections = inspections.filter(
          (i) => i.cellar_no === cellar.no
        );
        if (prevInspections.length > 0) {
          const lastOpening =
            prevInspections[prevInspections.length - 1].opening;
          if (Math.abs(opening - lastOpening) >= 40) {
            changeReason = reasons[Math.floor(Math.random() * reasons.length)];
          }
        }

        if (isWeekend && Math.random() > 0.5) {
          changeReason = reasons[Math.floor(Math.random() * reasons.length)];
        }

        inspections.push({
          cellar_no: cellar.no,
          opening,
          smell,
          operator: operators[Math.floor(Math.random() * operators.length)],
          change_reason: changeReason,
          inspection_time: inspectionTime,
        });
      }
    }
  }

  return inspections;
}

function insertInspections(inspections: SeedInspection[]) {
  const db = getDB();

  const cellarMap: Record<string, number> = {};
  const stmt = db.prepare('SELECT id, cellar_no FROM cellars');
  while (stmt.step()) {
    const row = stmt.getAsObject() as { id: number; cellar_no: string };
    cellarMap[row.cellar_no] = row.id;
  }
  stmt.free();

  const insertStmt = db.prepare(`
    INSERT INTO inspections 
    (cellar_id, cellar_no, opening, smell, operator, change_reason, inspection_time)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of inspections) {
    insertStmt.run([
      cellarMap[item.cellar_no],
      item.cellar_no,
      item.opening,
      item.smell,
      item.operator,
      item.change_reason,
      item.inspection_time,
    ]);
  }
  insertStmt.free();
  saveDB();

  console.log(`✅ 已插入 ${inspections.length} 条巡检记录`);
}

function verifyNeedTurn() {
  const db = getDB();
  const stmt1 = db.prepare("SELECT * FROM cellars WHERE cellar_no = 'A03'");
  stmt1.step();
  const a03 = stmt1.getAsObject() as any;
  stmt1.free();

  console.log(`\n📊 待翻窖窖位 A03 状态: ${a03.status}`);

  const stmt2 = db.prepare(
    "SELECT smell, inspection_time FROM inspections WHERE cellar_no = 'A03' ORDER BY inspection_time DESC LIMIT 5"
  );
  const recentA03: any[] = [];
  while (stmt2.step()) {
    recentA03.push(stmt2.getAsObject());
  }
  stmt2.free();

  console.log('最近 5 次巡检气味:');
  recentA03.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.inspection_time} - ${r.smell}`);
  });
}

async function run() {
  console.log('🌱 开始生成种子数据...\n');

  await initDB();

  clearData();
  console.log('🗑️ 已清空旧数据\n');

  createCellars();
  console.log('');

  const inspections = generateInspections();
  insertInspections(inspections);
  console.log('');

  verifyNeedTurn();

  console.log('\n🎉 种子数据生成完成！');
  console.log('   - 8 个窖位');
  console.log('   - 14 天巡检记录（每日两次）');
  console.log('   - 1 个待翻窖案例（A03）');
}

run();
