export type SmellType = 'normal' | 'sour' | 'dry';
export type CellarStatus = 'normal' | 'need_turn';
export type ChangeReason = 'rainy' | 'cooling' | 'tasting' | null;

export interface Cellar {
  id: number;
  cellar_no: string;
  status: CellarStatus;
  last_turn_date: string | null;
  created_at: string;
}

export interface Inspection {
  id: number;
  cellar_id: number;
  cellar_no: string;
  opening: number;
  smell: SmellType;
  operator: string;
  change_reason: ChangeReason;
  inspection_time: string;
  created_at: string;
}

export interface InspectionCreateInput {
  cellar_id: number;
  opening: number;
  smell: SmellType;
  operator: string;
  change_reason?: ChangeReason;
  inspection_time?: string;
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WeeklyReport {
  week_start: string;
  week_end: string;
  cellar_stats: {
    cellar_no: string;
    avg_opening: number;
    opening_data: { date: string; value: number }[];
    abnormal_smell_count: number;
    status: CellarStatus;
  }[];
  need_turn_list: string[];
}

export interface CompareResult {
  inspection1: Inspection;
  inspection2: Inspection;
  differences: {
    field: string;
    value1: any;
    value2: any;
  }[];
}

export const smellLabels: Record<SmellType, string> = {
  normal: '正常',
  sour: '酸腐',
  dry: '过干',
};

export const smellColors: Record<SmellType, string> = {
  normal: 'green',
  sour: 'red',
  dry: 'orange',
};

export const reasonLabels: Record<string, string> = {
  rainy: '雨季',
  cooling: '降温',
  tasting: '试味',
};

export const statusLabels: Record<CellarStatus, string> = {
  normal: '正常',
  need_turn: '需翻窖',
};

export const statusColors: Record<CellarStatus, string> = {
  normal: 'green',
  need_turn: 'red',
};
