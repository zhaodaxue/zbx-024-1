import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Tooltip, Empty, Spin } from 'antd';
import {
  FormOutlined,
  HistoryOutlined,
  BarChartOutlined,
  SwapOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import InspectionPage from './pages/InspectionPage';
import HistoryPage from './pages/HistoryPage';
import ReportPage from './pages/ReportPage';
import ComparePage from './pages/ComparePage';
import { TodayProgressProvider, useTodayProgress } from './contexts/TodayProgressContext';
import { SlotStatus, CellarTodayProgress } from './types';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const menuItems = [
  {
    key: '/',
    icon: <FormOutlined />,
    label: <Link to="/">巡检录入</Link>,
  },
  {
    key: '/history',
    icon: <HistoryOutlined />,
    label: <Link to="/history">历史记录</Link>,
  },
  {
    key: '/report',
    icon: <BarChartOutlined />,
    label: <Link to="/report">周报统计</Link>,
  },
  {
    key: '/compare',
    icon: <SwapOutlined />,
    label: <Link to="/compare">巡检对比</Link>,
  },
];

const slotStatusConfig: Record<SlotStatus, { color: string; bgColor: string; label: string; icon: React.ReactNode }> = {
  completed: {
    color: '#52c41a',
    bgColor: '#f6ffed',
    label: '已完成',
    icon: <CheckCircleFilled style={{ color: '#52c41a', fontSize: 14 }} />,
  },
  pending: {
    color: '#faad14',
    bgColor: '#fffbe6',
    label: '未巡',
    icon: <ClockCircleFilled style={{ color: '#faad14', fontSize: 14 }} />,
  },
  overdue: {
    color: '#f5222d',
    bgColor: '#fff1f0',
    label: '超时',
    icon: <ExclamationCircleFilled style={{ color: '#f5222d', fontSize: 14 }} />,
  },
};

const SlotCell: React.FC<{
  status: SlotStatus;
  cellar: CellarTodayProgress;
  period: 'morning' | 'afternoon';
}> = ({ status, cellar, period }) => {
  const { navigateToInspection } = useTodayProgress();
  const config = slotStatusConfig[status];
  const isNeedTurn = cellar.status === 'need_turn';
  const isUnfinished = status !== 'completed';

  const handleClick = () => {
    if (isUnfinished) {
      navigateToInspection(cellar.cellar_id, period);
    }
  };

  return (
    <Tooltip
      title={`${cellar.cellar_no} ${period === 'morning' ? '上午' : '下午'}：${config.label}${isNeedTurn ? '（需翻窖）' : ''}`}
    >
      <div
        onClick={handleClick}
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          backgroundColor: isNeedTurn && isUnfinished ? '#fff1f0' : config.bgColor,
          border: isNeedTurn && isUnfinished ? '2px solid #f5222d' : `1px solid ${config.color}33`,
          cursor: isUnfinished ? 'pointer' : 'default',
          transition: 'all 0.2s',
        }}
      >
        {config.icon}
      </div>
    </Tooltip>
  );
};

const SidebarProgress: React.FC = () => {
  const { progress, loading } = useTodayProgress();

  if (loading && !progress) {
    return (
      <div style={{ padding: '12px 16px', textAlign: 'center' }}>
        <Spin size="small" />
      </div>
    );
  }

  if (!progress || progress.cellars.length === 0) {
    return (
      <div style={{ padding: '12px 16px' }}>
        <Empty description="暂无窖位数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 8, textAlign: 'center' }}>
        {progress.date} 双巡进度
        {progress.unfinished_count > 0 && (
          <span style={{ color: '#f5222d', marginLeft: 4 }}>
            {progress.unfinished_count}未完
          </span>
        )}
        {progress.unfinished_count === 0 && (
          <span style={{ color: '#52c41a', marginLeft: 4 }}>全部完成</span>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, gap: 12, fontSize: 11, color: '#999' }}>
        <span>上午</span>
        <span>下午</span>
      </div>
      {progress.cellars.map((cellar) => (
        <div
          key={cellar.cellar_id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '3px 0',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: cellar.status === 'need_turn' ? 'bold' : 'normal',
              color: cellar.status === 'need_turn' ? '#f5222d' : '#333',
              minWidth: 32,
            }}
          >
            {cellar.cellar_no}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <SlotCell status={cellar.morning} cellar={cellar} period="morning" />
            <SlotCell status={cellar.afternoon} cellar={cellar} period="afternoon" />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 8, fontSize: 11, color: '#999', lineHeight: 1.8 }}>
        <div><CheckCircleFilled style={{ color: '#52c41a', marginRight: 4 }} />已完成</div>
        <div><ClockCircleFilled style={{ color: '#faad14', marginRight: 4 }} />未巡</div>
        <div><ExclamationCircleFilled style={{ color: '#f5222d', marginRight: 4 }} />超时未巡</div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  const location = useLocation();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
          🥔 雨鞋姜窖透气阀开度日志
        </Title>
      </Header>
      <Layout>
        <Sider width={220} style={{ background: '#fff', overflow: 'auto', height: 'calc(100vh - 64px)', position: 'sticky', top: 64 }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ borderRight: 0 }}
            items={menuItems}
          />
          <div style={{ borderTop: '1px solid #f0f0f0' }}>
            <SidebarProgress />
          </div>
        </Sider>
        <Layout style={{ padding: '24px', background: '#f5f7fa' }}>
          <Content
            style={{
              background: '#fff',
              padding: 24,
              margin: 0,
              minHeight: 280,
              borderRadius: 8,
            }}
          >
            <Routes>
              <Route path="/" element={<InspectionPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/compare" element={<ComparePage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <TodayProgressProvider>
      <AppLayout />
    </TodayProgressProvider>
  );
};

export default App;
