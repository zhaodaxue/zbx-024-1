import express from 'express';
import cors from 'cors';
import { initDB } from './db';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '姜窖管理系统后端服务运行正常' });
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
