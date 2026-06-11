import axios from 'axios';
import {
  Cellar,
  Inspection,
  PaginatedResult,
  WeeklyReport,
  CompareResult,
  InspectionCreateInput,
  TodayProgress,
  ApiResponse,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message;
    return Promise.reject(new Error(message));
  }
);

export const cellarApi = {
  getAll: (): Promise<ApiResponse<Cellar[]>> => api.get('/cellars'),
  create: (cellarNo: string): Promise<ApiResponse<Cellar>> =>
    api.post('/cellars', { cellar_no: cellarNo }),
  markTurned: (id: number): Promise<ApiResponse<Cellar>> =>
    api.post(`/cellars/${id}/turn`),
  getLastInspection: (id: number): Promise<ApiResponse<Inspection | null>> =>
    api.get(`/cellars/${id}/last-inspection`),
};

export const inspectionApi = {
  getList: (
    page: number = 1,
    pageSize: number = 20,
    cellarId?: number
  ): Promise<ApiResponse<PaginatedResult<Inspection>>> =>
    api.get('/inspections', { params: { page, pageSize, cellar_id: cellarId } }),
  getById: (id: number): Promise<ApiResponse<Inspection>> =>
    api.get(`/inspections/${id}`),
  create: (
    data: InspectionCreateInput
  ): Promise<ApiResponse<Inspection>> => api.post('/inspections', data),
  validateBefore: (
    cellarId: number,
    opening: number
  ): Promise<ApiResponse<{ valid: boolean; error?: string }>> =>
    api.get('/inspections/validate/before', {
      params: { cellar_id: cellarId, opening },
    }),
  compare: (
    id1: number,
    id2: number
  ): Promise<ApiResponse<CompareResult>> =>
    api.get('/inspections/compare/diff', { params: { id1, id2 } }),
  getTodayProgress: (): Promise<ApiResponse<TodayProgress>> =>
    api.get('/inspections/today-progress'),
};

export const reportApi = {
  getWeekly: (weekOffset: number = 0): Promise<ApiResponse<WeeklyReport>> =>
    api.get('/report/weekly', { params: { week_offset: weekOffset } }),
};

export default api;
