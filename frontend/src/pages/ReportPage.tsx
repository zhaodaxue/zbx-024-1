import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Table, Tag, Row, Col, Statistic, Empty } from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { reportApi } from '../api';
import { WeeklyReport, statusLabels, statusColors, smellColors } from '../types';

const ReportPage: React.FC = () => {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [weekOffset]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await reportApi.getWeekly(weekOffset);
      if (res.success) {
        setReport(res.data || null);
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!report) return [];

    const allDates = new Set<string>();
    report.cellar_stats.forEach((cellar) => {
      cellar.opening_data.forEach((d) => allDates.add(d.date));
    });

    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map((date) => {
      const dataPoint: any = { date };
      report.cellar_stats.forEach((cellar) => {
        const point = cellar.opening_data.find((d) => d.date === date);
        dataPoint[cellar.cellar_no] = point?.value ?? null;
      });
      return dataPoint;
    });
  };

  const colors = [
    '#1890ff',
    '#52c41a',
    '#faad14',
    '#f5222d',
    '#722ed1',
    '#13c2c2',
    '#eb2f96',
    '#fa8c16',
  ];

  const columns = [
    {
      title: '窖位号',
      dataIndex: 'cellar_no',
      key: 'cellar_no',
      width: 100,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '平均开度',
      dataIndex: 'avg_opening',
      key: 'avg_opening',
      width: 100,
      render: (value: number) => `${value}%`,
      sorter: (a: any, b: any) => a.avg_opening - b.avg_opening,
    },
    {
      title: '气味异常次数',
      dataIndex: 'abnormal_smell_count',
      key: 'abnormal_smell_count',
      width: 120,
      render: (value: number) => (
        <Tag color={value > 0 ? 'red' : 'green'}>{value} 次</Tag>
      ),
      sorter: (a: any, b: any) => a.abnormal_smell_count - b.abnormal_smell_count,
    },
    {
      title: '当前状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (value: string) => (
        <Tag color={statusColors[value as keyof typeof statusColors]}>
          {statusLabels[value as keyof typeof statusLabels]}
        </Tag>
      ),
    },
  ];

  const chartData = getChartData();
  const totalAbnormal =
    report?.cellar_stats.reduce((sum, c) => sum + c.abnormal_smell_count, 0) || 0;
  const avgAllOpening = report
    ? Math.round(
        report.cellar_stats.reduce((sum, c) => sum + c.avg_opening, 0) /
          (report.cellar_stats.length || 1)
      )
    : 0;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: 0 }}>周报统计</h2>
        <Space>
          <Button onClick={() => setWeekOffset(weekOffset - 1)}>上一周</Button>
          <Button
            type="primary"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            本周
          </Button>
          <Button
            onClick={() => setWeekOffset(weekOffset + 1)}
            disabled={weekOffset >= 0}
          >
            下一周
          </Button>
        </Space>
      </div>

      {report && (
        <>
          <Card
            title={`${report.week_start} 至 ${report.week_end}`}
            style={{ marginBottom: 24 }}
          >
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="窖位总数"
                  value={report.cellar_stats.length}
                  suffix="个"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="整体平均开度"
                  value={avgAllOpening}
                  suffix="%"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="气味异常总次数"
                  value={totalAbnormal}
                  suffix="次"
                  valueStyle={{ color: totalAbnormal > 0 ? '#f5222d' : '#52c41a' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="待翻窖数量"
                  value={report.need_turn_list.length}
                  suffix="个"
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
            </Row>
          </Card>

          <Card title="各窖位开度均值折线图" style={{ marginBottom: 24 }}>
            {chartData.length > 0 ? (
              <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} unit="%" />
                    <Tooltip />
                    <Legend />
                    {report.cellar_stats.map((cellar, index) => (
                      <Line
                        key={cellar.cellar_no}
                        type="monotone"
                        dataKey={cellar.cellar_no}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="本周暂无数据" />
            )}
          </Card>

          <div style={{ display: 'flex', gap: 24 }}>
            <Card title="各窖位统计" style={{ flex: 2 }}>
              <Table
                columns={columns}
                dataSource={report.cellar_stats}
                rowKey="cellar_no"
                pagination={false}
                size="small"
              />
            </Card>

            <Card title="待翻窖清单" style={{ flex: 1 }}>
              {report.need_turn_list.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {report.need_turn_list.map((cellarNo) => (
                    <Tag
                      key={cellarNo}
                      color="red"
                      style={{ padding: '8px 16px', fontSize: 16 }}
                    >
                      ⚠️ {cellarNo} - 需翻窖
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Empty description="暂无待翻窖窖位" />
              )}

              <div style={{ marginTop: 16, color: '#999', fontSize: 12 }}>
                <p>规则说明：</p>
                <p>• 连续 3 次气味为「酸腐」自动标记为需翻窖</p>
                <p>• 翻窖完成前开度不能超过 60%</p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportPage;
