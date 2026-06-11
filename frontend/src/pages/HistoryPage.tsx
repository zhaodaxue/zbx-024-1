import React, { useState, useEffect } from 'react';
import {
  Table,
  Select,
  Tag,
  Space,
  Button,
  Modal,
  message,
  Alert,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { cellarApi, inspectionApi } from '../api';
import {
  Cellar,
  Inspection,
  SmellType,
  smellLabels,
  smellColors,
  reasonLabels,
  statusLabels,
  statusColors,
} from '../types';
import { useTodayProgress } from '../contexts/TodayProgressContext';
import dayjs from 'dayjs';

const { Option } = Select;

const HistoryPage: React.FC = () => {
  const { getUnfinishedCellars, refreshProgress, navigateToInspection } = useTodayProgress();

  const [cellars, setCellars] = useState<Cellar[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedCellarId, setSelectedCellarId] = useState<number | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(false);
  const [turnModalVisible, setTurnModalVisible] = useState(false);
  const [selectedCellar, setSelectedCellar] = useState<Cellar | null>(null);

  useEffect(() => {
    loadCellars();
  }, []);

  useEffect(() => {
    loadInspections();
  }, [page, selectedCellarId]);

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

  const loadInspections = async () => {
    setLoading(true);
    try {
      const res = await inspectionApi.getList(page, pageSize, selectedCellarId);
      if (res.success) {
        setInspections(res.data?.list || []);
        setTotal(res.data?.total || 0);
      }
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCellarChange = (value: number | undefined) => {
    setSelectedCellarId(value);
    setPage(1);
  };

  const handleMarkTurned = async (cellar: Cellar) => {
    try {
      const res = await cellarApi.markTurned(cellar.id);
      if (res.success) {
        message.success(`窖位 ${cellar.cellar_no} 已标记为翻窖完成`);
        loadCellars();
        loadInspections();
        refreshProgress();
        setTurnModalVisible(false);
      }
    } catch (error: any) {
      message.error(error.message);
    }
  };

  const showTurnModal = (cellar: Cellar) => {
    setSelectedCellar(cellar);
    setTurnModalVisible(true);
  };

  const handleUnfinishedClick = (cellarId: number) => {
    navigateToInspection(cellarId);
  };

  const unfinishedCellars = getUnfinishedCellars();

  const getSlotLabel = (slot: 'morning' | 'afternoon', status: string) => {
    if (status === 'completed') return null;
    const periodLabel = slot === 'morning' ? '上午' : '下午';
    if (status === 'overdue') return `${periodLabel}超时`;
    return `${periodLabel}未巡`;
  };

  const columns = [
    {
      title: '窖位号',
      dataIndex: 'cellar_no',
      key: 'cellar_no',
      width: 100,
      render: (text: string, record: Inspection) => {
        const cellar = cellars.find((c) => c.id === record.cellar_id);
        return (
          <Space direction="vertical" size={4}>
            <span style={{ fontWeight: 'bold' }}>{text}</span>
            {cellar && (
              <Tag color={statusColors[cellar.status]} style={{ margin: 0 }}>
                {statusLabels[cellar.status]}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '阀开度',
      dataIndex: 'opening',
      key: 'opening',
      width: 100,
      render: (value: number) => (
        <span style={{ fontWeight: 'bold', fontSize: 16 }}>{value}%</span>
      ),
    },
    {
      title: '气味',
      dataIndex: 'smell',
      key: 'smell',
      width: 100,
      render: (value: SmellType) => (
        <Tag color={smellColors[value]}>{smellLabels[value]}</Tag>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '变动原因',
      dataIndex: 'change_reason',
      key: 'change_reason',
      width: 100,
      render: (value: string | null) =>
        value ? <Tag color="blue">{reasonLabels[value]}</Tag> : '-',
    },
    {
      title: '巡检时间',
      dataIndex: 'inspection_time',
      key: 'inspection_time',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Inspection) => {
        const cellar = cellars.find((c) => c.id === record.cellar_id);
        if (cellar && cellar.status === 'need_turn') {
          return (
            <Button
              type="primary"
              size="small"
              onClick={() => showTurnModal(cellar)}
            >
              标记翻窖
            </Button>
          );
        }
        return '-';
      },
    },
  ];

  const needTurnCellars = cellars.filter((c) => c.status === 'need_turn');

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>历史记录</h2>

      {unfinishedCellars.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #fffbe6 0%, #fff7e6 100%)',
            border: '1px solid #ffd591',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ color: '#faad14', fontSize: 16, marginRight: 4 }}>
              ⚠️
            </span>
            <span style={{ fontWeight: 500, color: '#d46b08' }}>
              今日仍有 <strong style={{ fontSize: 18 }}>{unfinishedCellars.length}</strong> 个窖位未完成双巡：
            </span>
            {unfinishedCellars.map((c) => {
              const missingSlots: string[] = [];
              const mLabel = getSlotLabel('morning', c.morning);
              if (mLabel) missingSlots.push(mLabel);
              const aLabel = getSlotLabel('afternoon', c.afternoon);
              if (aLabel) missingSlots.push(aLabel);
              return (
                <Tag
                  key={c.cellar_id}
                  color={c.status === 'need_turn' ? 'red' : 'warning'}
                  style={{
                    margin: 0,
                    cursor: 'pointer',
                    padding: '4px 10px',
                    fontSize: 13,
                    borderRadius: 4,
                  }}
                  onClick={() => handleUnfinishedClick(c.cellar_id)}
                >
                  <strong>{c.cellar_no}</strong>
                  <span style={{ opacity: 0.85, marginLeft: 4 }}>
                    ({missingSlots.join('、')})
                  </span>
                </Tag>
              );
            })}
          </div>
        </div>
      )}

      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          <span>窖位筛选：</span>
          <Select
            placeholder="全部窖位"
            style={{ width: 150 }}
            allowClear
            onChange={handleCellarChange}
            showSearch
            optionFilterProp="children"
          >
            {cellars.map((cellar) => (
              <Option key={cellar.id} value={cellar.id}>
                {cellar.cellar_no}
              </Option>
            ))}
          </Select>
        </Space>

        {needTurnCellars.length > 0 && (
          <Tag color="red" style={{ padding: '4px 12px', fontSize: 14 }}>
            ⚠️ 待翻窖窖位：{needTurnCellars.map((c) => c.cellar_no).join('、')}
          </Tag>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={inspections}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p) => setPage(p),
          showSizeChanger: false,
          showTotal: (t) => `共 ${t} 条记录`,
        }}
      />

      <Modal
        title="确认翻窖"
        open={turnModalVisible}
        onOk={() => selectedCellar && handleMarkTurned(selectedCellar)}
        onCancel={() => setTurnModalVisible(false)}
        okText="确认翻窖完成"
        cancelText="取消"
      >
        {selectedCellar && (
          <p>
            确定窖位 <strong>{selectedCellar.cellar_no}</strong>{' '}
            已经完成翻窖了吗？翻窖后状态将恢复为正常。
          </p>
        )}
      </Modal>
    </div>
  );
};

export default HistoryPage;
