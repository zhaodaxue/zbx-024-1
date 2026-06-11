import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { initDB } from './db';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '姜窖管理系统后端服务运行正常' });
});

app.use('/api', routes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API 接口不存在' });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('未处理的错误:', err);
  const statusCode = err.statusCode || err.status || 500;
  const errorMessage = err.message || '服务器内部错误';
  res.status(statusCode).json({ success: false, error: errorMessage });
});

async function startServer() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`🚀 姜窖管理系统后端服务已启动，端口: ${PORT}`);
      console.log(`📋 API 地址: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

startServer();

export default app;
