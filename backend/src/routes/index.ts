import { Router, Request, Response } from 'express';
import * as service from '../services/inspectionService';

const router = Router();

router.get('/cellars', (req: Request, res: Response) => {
  try {
    const cellars = service.getAllCellars();
    res.json({ success: true, data: cellars });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/cellars', (req: Request, res: Response) => {
  try {
    const { cellar_no } = req.body;
    if (!cellar_no) {
      return res
        .status(400)
        .json({ success: false, error: '窖位号不能为空' });
    }
    const existing = service.getCellarByNo(cellar_no);
    if (existing) {
      return res
        .status(400)
        .json({ success: false, error: '窖位号已存在' });
    }
    const cellar = service.createCellar(cellar_no);
    res.json({ success: true, data: cellar });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/cellars/:id/turn', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const cellar = service.getCellarById(id);
    if (!cellar) {
      return res
        .status(404)
        .json({ success: false, error: '窖位不存在' });
    }
    service.markCellarTurned(id);
    const updated = service.getCellarById(id);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/inspections', (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const cellarId = req.query.cellar_id
      ? parseInt(req.query.cellar_id as string)
      : undefined;
    const result = service.getInspections(page, pageSize, cellarId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/inspections/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const inspection = service.getInspectionById(id);
    if (!inspection) {
      return res
        .status(404)
        .json({ success: false, error: '巡检记录不存在' });
    }
    res.json({ success: true, data: inspection });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/inspections', (req: Request, res: Response) => {
  try {
    const { cellar_id, opening, smell, operator, change_reason, inspection_time } =
      req.body;

    if (!cellar_id || opening === undefined || !smell || !operator) {
      return res
        .status(400)
        .json({ success: false, error: '缺少必要参数' });
    }

    const inspection = service.createInspection({
      cellar_id: parseInt(cellar_id),
      opening: parseInt(opening),
      smell,
      operator,
      change_reason: change_reason || undefined,
      inspection_time,
    });

    res.json({ success: true, data: inspection });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/inspections/validate/before', (req: Request, res: Response) => {
  try {
    const cellar_id = parseInt(req.query.cellar_id as string);
    const opening = parseInt(req.query.opening as string);

    if (!cellar_id || opening === undefined) {
      return res
        .status(400)
        .json({ success: false, error: '缺少必要参数' });
    }

    const result = service.validateInspection({
      cellar_id,
      opening,
      smell: 'normal',
      operator: 'temp',
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/inspections/compare/diff', (req: Request, res: Response) => {
  try {
    const id1 = parseInt(req.query.id1 as string);
    const id2 = parseInt(req.query.id2 as string);

    if (!id1 || !id2) {
      return res
        .status(400)
        .json({ success: false, error: '缺少必要参数' });
    }

    const result = service.compareInspections(id1, id2);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/report/weekly', (req: Request, res: Response) => {
  try {
    const weekOffset = parseInt(req.query.week_offset as string) || 0;
    const report = service.getWeeklyReport(weekOffset);
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/cellars/:id/last-inspection', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const inspection = service.getLastInspection(id);
    res.json({ success: true, data: inspection });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
