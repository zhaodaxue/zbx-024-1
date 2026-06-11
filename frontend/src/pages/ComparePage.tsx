import React, { useState, useEffect } from 'react';
import {
  Select,
  Button,
  Card,
  Table,
  Tag,
  Space,
  message,
  Empty,
  Row,
  Col,
  Statistic,
  Divider,
  Alert,
} from 'antd';
import { cellarApi, inspectionApi } from '../api';
import {
  Cellar,
  Inspection,
  SmellType,
  smellLabels,
  smellColors,
  reasonLabels,
} from '../types';

const { Option } = Select;

const ComparePage: React.FC = () => {
  const [cellars, setCellars] = useState<Cellar[]>([]);
  const [selectedCellarId, setSelectedCellarId] = useState<number | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [selectedId1, setSelectedId1] = useState<number | null>(null);
  const [selectedId2, setSelectedId2] = useState<number | null>(null);
  const [compareResult, setCompareResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCellars();
  }, []);

  const loadCellars = async () => {
    try {
      const res = await cellarApi.getAll();
      if (res.success) {
        setCellars(res.data || []);
      }
    } catch (error: any) {
      message.error(error.message);
    }
  };

  const handleCellarChange = async (cellarId: number) => {
    setSelectedCellarId(cellarId);
    setSelectedId1(null);
    setSelectedId2(null);
    setCompareResult(null);

    try {
      const res = await inspectionApi.getList(1, 100, cellarId);
      if (res.success) {
        setInspections(res.data?.list || []);
      }
    } catch (error: any) {
      message.error(error.message);
    }
  };

  const handleCompare = async () => {
    if (!selectedId1 || !selectedId2) {
      message.warning('请选择两条巡检记录进行对比');
      return;
    }

    if (selectedId1 === selectedId2) {
      message.warning('请选择两条不同的巡检记录');
      return;
    }

    setLoading(true);
    try {
      const res = await inspectionApi.compare(selectedId1, selectedId2);
      if (res.success) {
        setCompareResult(res.data);
      }
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isDifferent = (field: string) => {
    if (!compareResult) return false;
    return compareResult.differences.some((d: any) => d.field === field);
  };

  const renderValue = (value: any, field: string) => {
    const diff = isDifferent(field);

    switch (field) {
      case 'smell':
        return (
          <Tag color={diff ? 'gold' : smellColors[value as SmellType]}>
            {smellLabels[value as SmellType]}
          </Tag>
        );
      case 'opening':
        return (
          <span
            style={{
              fontWeight: 'bold',
              backgroundColor: diff ? '#fffbe6' : 'transparent',
              padding: diff ? '2px 8px' : 0,
              borderRadius: 4,
            }}
          >
            {value}%
          </span>
        );
      case 'change_reason':
        return value ? (
          <Tag color={diff ? 'gold' : 'blue'}>{reasonLabels[value]}</Tag>
        ) : (
          '-'
        );
      default:
        return (
          <span
            style={{
              backgroundColor: diff ? '#fffbe6' : 'transparent',
              padding: diff ? '2px 8px' : 0,
              borderRadius: 4,
            }}
          >
            {value}
          </span>
        );
    }
  };

  const fieldLabels: Record<string, string> = {
    opening: '阀开度',
    smell: '气味',
    operator: '操作人',
    change_reason: '变动原因',
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>巡检对比</h2>

      <Card title="选择对比记录" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <span style={{ marginRight: 8 }}>窖位：</span>
            <Select
              placeholder="请选择窖位"
              style={{ width: 200 }}
              onChange={handleCellarChange}
              showSearch
              optionFilterProp="children"
              value={selectedCellarId || undefined}
            >
              {cellars.map((cellar) => (
                <Option key={cellar.id} value={cellar.id}>
                  {cellar.cellar_no}
                </Option>
              ))}
            </Select>
          </div>

          {selectedCellarId && (
            <Row gutter={16}>
              <Col span={11}>
                <div style={{ marginBottom: 8 }}>记录 1：</div>
                <Select
                  placeholder="选择第一条记录"
                  style={{ width: '100%' }}
                  onChange={(val) => setSelectedId1(val)}
                  value={selectedId1 || undefined}
                  showSearch
                  optionFilterProp="children"
                >
                  {inspections.map((ins) => (
                    <Option key={ins.id} value={ins.id}>
                      {ins.inspection_time} - {ins.opening}% -{' '}
                      {smellLabels[ins.smell]}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col span={2} style={{ textAlign: 'center', paddingTop: 30 }}>
                <span style={{ fontSize: 24 }}>↔</span>
              </Col>
              <Col span={11}>
                <div style={{ marginBottom: 8 }}>记录 2：</div>
                <Select
                  placeholder="选择第二条记录"
                  style={{ width: '100%' }}
                  onChange={(val) => setSelectedId2(val)}
                  value={selectedId2 || undefined}
                  showSearch
                  optionFilterProp="children"
                >
                  {inspections.map((ins) => (
                    <Option key={ins.id} value={ins.id}>
                      {ins.inspection_time} - {ins.opening}% -{' '}
                      {smellLabels[ins.smell]}
                    </Option>
                  ))}
                </Select>
              </Col>
            </Row>
          )}

          {selectedCellarId && (
            <Button
              type="primary"
              onClick={handleCompare}
              loading={loading}
              disabled={!selectedId1 || !selectedId2 || selectedId1 === selectedId2}
            >
              开始对比
            </Button>
          )}
        </Space>
      </Card>

      {compareResult && (
        <Card title="对比结果">
          {compareResult.differences.length > 0 ? (
            <Alert
              message={`发现 ${compareResult.differences.length} 处差异（黄色高亮）`}
              type="warning"
              showIcon
              style={{ marginBottom: 24 }}
            />
          ) : (
            <Alert
              message="两条记录完全一致，没有差异"
              type="success"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Card
                size="small"
                title={`记录 1 - ${compareResult.inspection1.inspection_time}`}
                style={{
                  borderColor: '#1890ff',
                }}
                bodyStyle={{ backgroundColor: '#f0f7ff' }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {Object.keys(fieldLabels).map((field) => (
                    <div key={field}>
                      <span style={{ color: '#666' }}>{fieldLabels[field]}：</span>
                      {renderValue(
                        compareResult.inspection1[field],
                        field
                      )}
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
            <Col span={12}>
              <Card
                size="small"
                title={`记录 2 - ${compareResult.inspection2.inspection_time}`}
                style={{
                  borderColor: '#52c41a',
                }}
                bodyStyle={{ backgroundColor: '#f6ffed' }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {Object.keys(fieldLabels).map((field) => (
                    <div key={field}>
                      <span style={{ color: '#666' }}>{fieldLabels[field]}：</span>
                      {renderValue(
                        compareResult.inspection2[field],
                        field
                      )}
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>

          <Divider />

          <div>
            <h4>差异明细</h4>
            {compareResult.differences.length > 0 ? (
              <Table
                dataSource={compareResult.differences}
                rowKey="field"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: '字段',
                    dataIndex: 'field',
                    key: 'field',
                    width: 120,
                    render: (field: string) => (
                      <strong>{fieldLabels[field] || field}</strong>
                    ),
                  },
                  {
                    title: '记录 1',
                    dataIndex: 'value1',
                    key: 'value1',
                    render: (value: any, record: any) =>
                      renderValue(value, record.field),
                  },
                  {
                    title: '记录 2',
                    dataIndex: 'value2',
                    key: 'value2',
                    render: (value: any, record: any) =>
                      renderValue(value, record.field),
                  },
                ]}
              />
            ) : (
              <Empty description="无差异" />
            )}
          </div>
        </Card>
      )}

      {!selectedCellarId && (
        <Empty
          description="请先选择窖位，再选择两条巡检记录进行对比"
          style={{ marginTop: 60 }}
        />
      )}
    </div>
  );
};

export default ComparePage;
