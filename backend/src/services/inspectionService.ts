import { query, run, getOne } from '../db';
import {
  Cellar,
  Inspection,
  InspectionCreateInput,
  SmellType,
  CellarStatus,
  WeeklyReport,
} from '../types';
import dayjs from 'dayjs';

export function getAllCellars(): Cellar[] {
  return query<Cellar>('SELECT * FROM cellars ORDER BY cellar_no');
}

export function getCellarById(id: number): Cellar | undefined {
  return getOne<Cellar>('SELECT * FROM cellars WHERE id = ?', [id]);
}

export function getCellarByNo(cellarNo: string): Cellar | undefined {
  return getOne<Cellar>('SELECT * FROM cellars WHERE cellar_no = ?', [cellarNo]);
}

export function createCellar(cellarNo: string): Cellar {
  const result = run('INSERT INTO cellars (cellar_no) VALUES (?)', [cellarNo]);
  return getCellarById(result.lastInsertRowid)!;
}

export function updateCellarStatus(
  id: number,
  status: CellarStatus,
  lastTurnDate?: string
): void {
  if (lastTurnDate) {
    run('UPDATE cellars SET status = ?, last_turn_date = ? WHERE id = ?', [
      status,
      lastTurnDate,
      id,
    ]);
  } else {
    run('UPDATE cellars SET status = ? WHERE id = ?', [status, id]);
  }
}

export function getLastInspection(cellarId: number): Inspection | undefined {
  return getOne<Inspection>(
    'SELECT * FROM inspections WHERE cellar_id = ? ORDER BY inspection_time DESC LIMIT 1',
    [cellarId]
  );
}

export function getRecentInspections(
  cellarId: number,
  limit: number = 3
): Inspection[] {
  return query<Inspection>(
    'SELECT * FROM inspections WHERE cellar_id = ? ORDER BY inspection_time DESC LIMIT ?',
    [cellarId, limit]
  );
}

export function checkConsecutiveSour(cellarId: number): boolean {
  const recent = getRecentInspections(cellarId, 3);
  if (recent.length < 3) return false;
  return recent.every((ins) => ins.smell === 'sour');
}

export function validateInspection(input: InspectionCreateInput): {
  valid: boolean;
  error?: string;
} {
  const cellar = getCellarById(input.cellar_id);
  if (!cellar) {
    return { valid: false, error: '窖位不存在' };
  }

  if (input.opening < 0 || input.opening > 100) {
    return { valid: false, error: '阀开度必须在 0-100% 之间' };
  }

  const lastInspection = getLastInspection(input.cellar_id);

  if (lastInspection && cellar.status === 'need_turn' && input.opening > 60) {
    return {
      valid: false,
      error: '该窖位处于「需翻窖」状态，翻窖完成前开度不能超过 60%',
    };
  }

  if (lastInspection) {
    const openingDiff = Math.abs(input.opening - lastInspection.opening);
    if (openingDiff >= 40 && !input.change_reason) {
      return {
        valid: false,
        error: '开度变动超过 40 个百分点，必须填写变动原因（雨季/降温/试味）',
      };
    }
  }

  return { valid: true };
}

export function createInspection(input: InspectionCreateInput): Inspection {
  const validation = validateInspection(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cellar = getCellarById(input.cellar_id)!;
  const inspectionTime =
    input.inspection_time || dayjs().format('YYYY-MM-DD HH:mm:ss');

  const result = run(
    `INSERT INTO inspections 
     (cellar_id, cellar_no, opening, smell, operator, change_reason, inspection_time)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.cellar_id,
      cellar.cellar_no,
      input.opening,
      input.smell,
      input.operator,
      input.change_reason || null,
      inspectionTime,
    ]
  );

  updateCellarStatusAfterInspection(input.cellar_id, input.smell);

  return getInspectionById(result.lastInsertRowid)!;
}

function updateCellarStatusAfterInspection(
  cellarId: number,
  smell: SmellType
): void {
  const cellar = getCellarById(cellarId)!;

  if (cellar.status === 'need_turn') {
    return;
  }

  const recent = getRecentInspections(cellarId, 3);
  if (recent.length >= 3 && recent.every((ins) => ins.smell === 'sour')) {
    updateCellarStatus(cellarId, 'need_turn');
  }
}

export function getInspectionById(id: number): Inspection | undefined {
  return getOne<Inspection>('SELECT * FROM inspections WHERE id = ?', [id]);
}

export function getInspections(
  page: number = 1,
  pageSize: number = 20,
  cellarId?: number
): {
  list: Inspection[];
  total: number;
  page: number;
  pageSize: number;
} {
  let whereClause = '';
  let params: any[] = [];

  if (cellarId) {
    whereClause = 'WHERE cellar_id = ?';
    params.push(cellarId);
  }

  const countResult = getOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM inspections ${whereClause}`,
    params
  );
  const total = countResult?.count || 0;

  const offset = (page - 1) * pageSize;
  const list = query<Inspection>(
    `SELECT * FROM inspections ${whereClause} 
     ORDER BY inspection_time DESC 
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return { list, total, page, pageSize };
}

export function getInspectionsByDateRange(
  cellarId: number,
  startDate: string,
  endDate: string
): Inspection[] {
  return query<Inspection>(
    `SELECT * FROM inspections 
     WHERE cellar_id = ? AND inspection_time >= ? AND inspection_time <= ?
     ORDER BY inspection_time ASC`,
    [cellarId, startDate, endDate]
  );
}

export function getWeeklyReport(weekOffset: number = 0): WeeklyReport {
  const cellars = getAllCellars();
  const today = dayjs();
  const weekStart = today
    .startOf('week')
    .add(weekOffset * 7, 'day')
    .format('YYYY-MM-DD');
  const weekEnd = today
    .endOf('week')
    .add(weekOffset * 7, 'day')
    .format('YYYY-MM-DD 23:59:59');

  const cellarStats = cellars.map((cellar) => {
    const inspections = getInspectionsByDateRange(
      cellar.id,
      weekStart,
      weekEnd
    );
    const avgOpening =
      inspections.length > 0
        ? Math.round(
            inspections.reduce((sum, ins) => sum + ins.opening, 0) /
              inspections.length
          )
        : 0;

    const openingData = inspections.map((ins) => ({
      date: dayjs(ins.inspection_time).format('MM-DD HH:mm'),
      value: ins.opening,
    }));

    const abnormalSmellCount = inspections.filter(
      (ins) => ins.smell === 'sour' || ins.smell === 'dry'
    ).length;

    return {
      cellar_no: cellar.cellar_no,
      avg_opening: avgOpening,
      opening_data: openingData,
      abnormal_smell_count: abnormalSmellCount,
      status: cellar.status,
    };
  });

  const needTurnList = cellars
    .filter((c) => c.status === 'need_turn')
    .map((c) => c.cellar_no);

  return {
    week_start: weekStart,
    week_end: weekEnd.split(' ')[0],
    cellar_stats: cellarStats,
    need_turn_list: needTurnList,
  };
}

export function compareInspections(
  inspectionId1: number,
  inspectionId2: number
): {
  inspection1: Inspection;
  inspection2: Inspection;
  differences: {
    field: string;
    value1: any;
    value2: any;
  }[];
} {
  const ins1 = getInspectionById(inspectionId1);
  const ins2 = getInspectionById(inspectionId2);

  if (!ins1 || !ins2) {
    throw new Error('巡检记录不存在');
  }

  const differences: { field: string; value1: any; value2: any }[] = [];

  const fieldsToCompare: (keyof Inspection)[] = [
    'opening',
    'smell',
    'operator',
    'change_reason',
  ];

  for (const field of fieldsToCompare) {
    if (ins1[field] !== ins2[field]) {
      differences.push({
        field: field as string,
        value1: ins1[field],
        value2: ins2[field],
      });
    }
  }

  return {
    inspection1: ins1,
    inspection2: ins2,
    differences,
  };
}

export function markCellarTurned(cellarId: number): void {
  const turnDate = dayjs().format('YYYY-MM-DD HH:mm:ss');
  run(
    "UPDATE cellars SET status = 'normal', last_turn_date = ? WHERE id = ?",
    [turnDate, cellarId]
  );
}
