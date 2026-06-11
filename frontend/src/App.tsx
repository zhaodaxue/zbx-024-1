import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography } from 'antd';
import {
  FormOutlined,
  HistoryOutlined,
  BarChartOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import InspectionPage from './pages/InspectionPage';
import HistoryPage from './pages/HistoryPage';
import ReportPage from './pages/ReportPage';
import ComparePage from './pages/ComparePage';

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

const App: React.FC = () => {
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
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
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

export default App;
