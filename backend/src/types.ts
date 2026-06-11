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
