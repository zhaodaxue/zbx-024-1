import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Form,
  Select,
  InputNumber,
  Input,
  Button,
  Card,
  message,
  Tag,
  Space,
  Alert,
  Divider,
  Modal,
} from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
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

const { Option } = Select;

const InspectionPage: React.FC = () => {
  const [form] = Form.useForm();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProgress, setFormDirty: setGlobalFormDirty } = useTodayProgress();

  const [cellars, setCellars] = useState<Cellar[]>([]);
  const [lastInspection, setLastInspection] = useState<Inspection | null>(null);
  const [selectedCellarId, setSelectedCellarId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needReason, setNeedReason] = useState(false);
  const [formDirty, setFormDirtyLocal] = useState(false);
  const pendingCellarIdRef = useRef<number | null>(null);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    setGlobalFormDirty(formDirty);
  }, [formDirty, setGlobalFormDirty]);

  useEffect(() => {
    loadCellars();
  }, []);

  useEffect(() => {
    const cellarIdParam = searchParams.get('cellar_id');
    const switchConfirmed = searchParams.get('switch_confirmed') === '1';

    if (cellarIdParam && cellars.length > 0) {
      const id = parseInt(cellarIdParam);
      const exists = cellars.find((c) => c.id === id);
      if (exists && id !== selectedCellarId) {
        if (initialLoadRef.current || switchConfirmed) {
          initialLoadRef.current = false;
          doSwitchCellar(id);

          if (switchConfirmed) {
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('switch_confirmed');
            setSearchParams(newParams, { replace: true });
          }
        } else if (formDirty) {
          pendingCellarIdRef.current = id;
          Modal.confirm({
            title: '表单尚未提交',
            content: '当前表单有未提交的内容，确定要切换窖位吗？',
            okText: '确定切换',
            cancelText: '继续编辑',
            onOk: () => {
              doSwitchCellar(pendingCellarIdRef.current!);
              pendingCellarIdRef.current = null;
            },
            onCancel: () => {
              pendingCellarIdRef.current = null;
            },
          });
        } else {
          doSwitchCellar(id);
        }
      }
    }
  }, [searchParams, cellars]);

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

  const doSwitchCellar = useCallback((cellarId: number) => {
    setSelectedCellarId(cellarId);
    form.setFieldsValue({ cellar_id: cellarId, change_reason: undefined });
    setNeedReason(false);
    setFormDirtyLocal(false);

    cellarApi.getLastInspection(cellarId).then((res) => {
      if (res.success) {
        setLastInspection(res.data || null);
      }
    }).catch((error: any) => {
      message.error(error.message);
    });
  }, [form]);

  const handleCellarChange = async (cellarId: number) => {
    if (formDirty && cellarId !== selectedCellarId) {
      Modal.confirm({
        title: '表单尚未提交',
        content: '当前表单有未提交的内容，确定要切换窖位吗？',
        okText: '确定切换',
        cancelText: '继续编辑',
        onOk: () => {
          doSwitchCellar(cellarId);
          setSearchParams({}, { replace: true });
        },
      });
      return;
    }
    doSwitchCellar(cellarId);
    setSearchParams({}, { replace: true });
  };

  const handleOpeningChange = (value: number | null) => {
    setFormDirtyLocal(true);
    if (value !== null && lastInspection) {
      const diff = Math.abs(value - lastInspection.opening);
      setNeedReason(diff >= 40);
      if (diff < 40) {
        form.setFieldsValue({ change_reason: undefined });
      }
    } else {
      setNeedReason(false);
    }
  };

  const handleValuesChange = () => {
    setFormDirtyLocal(true);
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await inspectionApi.create(values);
      if (res.success) {
        message.success('巡检记录保存成功');
        form.resetFields();
        setLastInspection(null);
        setNeedReason(false);
        setSelectedCellarId(null);
        setFormDirtyLocal(false);
        setSearchParams({}, { replace: true });

        const updatedCellars = await cellarApi.getAll();
        if (updatedCellars.success) {
          setCellars(updatedCellars.data || []);
        }

        refreshProgress();
      }
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedCellar = () => {
    return cellars.find((c) => c.id === selectedCellarId);
  };

  const selectedCellar = getSelectedCellar();
  const maxOpening = selectedCellar?.status === 'need_turn' ? 60 : 100;

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>巡检录入</h2>

      {selectedCellar && selectedCellar.status === 'need_turn' && (
        <Alert
          message="⚠️ 该窖位处于「需翻窖」状态"
          description="翻窖完成前，阀开度不能超过 60%。翻窖完成后请在历史记录中标记已翻窖。"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <div style={{ display: 'flex', gap: 24 }}>
        <Card title="录入巡检数据" style={{ flex: 1 }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ opening: 50 }}
            onValuesChange={handleValuesChange}
          >
            <Form.Item
              label="窖位号"
              name="cellar_id"
              rules={[{ required: true, message: '请选择窖位' }]}
            >
              <Select
                placeholder="请选择窖位"
                onChange={handleCellarChange}
                value={selectedCellarId || undefined}
                showSearch
                optionFilterProp="children"
              >
                {cellars.map((cellar) => (
                  <Option key={cellar.id} value={cellar.id}>
                    {cellar.cellar_no}
                    <Tag
                      color={statusColors[cellar.status]}
                      style={{ marginLeft: 8 }}
                    >
                      {statusLabels[cellar.status]}
                    </Tag>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="阀开度 (%)"
              name="opening"
              rules={[
                { required: true, message: '请输入阀开度' },
                {
                  validator: (_, value) => {
                    if (value < 0 || value > maxOpening) {
                      return Promise.reject(
                        selectedCellar?.status === 'need_turn'
                          ? '该窖位处于「需翻窖」状态，开度不能超过 60%'
                          : '开度必须在 0-100% 之间'
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                min={0}
                max={maxOpening}
                style={{ width: '100%' }}
                onChange={handleOpeningChange}
                addonAfter="%"
              />
            </Form.Item>

            <Form.Item
              label="窖内气味"
              name="smell"
              rules={[{ required: true, message: '请选择气味' }]}
            >
              <Select placeholder="请选择气味">
                <Option value="normal">
                  <Tag color={smellColors.normal}>{smellLabels.normal}</Tag>
                </Option>
                <Option value="sour">
                  <Tag color={smellColors.sour}>{smellLabels.sour}</Tag>
                </Option>
                <Option value="dry">
                  <Tag color={smellColors.dry}>{smellLabels.dry}</Tag>
                </Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="操作人"
              name="operator"
              rules={[{ required: true, message: '请输入操作人' }]}
            >
              <Input placeholder="请输入操作人姓名" />
            </Form.Item>

            {needReason && (
              <Form.Item
                label="变动原因"
                name="change_reason"
                rules={[
                  {
                    required: true,
                    message: '开度变动超过 40 个百分点，必须填写原因',
                  },
                ]}
              >
                <Select placeholder="请选择变动原因">
                  <Option value="rainy">{reasonLabels.rainy}</Option>
                  <Option value="cooling">{reasonLabels.cooling}</Option>
                  <Option value="tasting">{reasonLabels.tasting}</Option>
                </Select>
              </Form.Item>
            )}

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={submitting} block>
                保存巡检记录
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="上次巡检记录" style={{ flex: 1 }}>
          {lastInspection ? (
            <div>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <span style={{ color: '#666' }}>窖位：</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {lastInspection.cellar_no}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>开度：</span>
                  <span style={{ fontWeight: 'bold', fontSize: 18 }}>
                    {lastInspection.opening}%
                  </span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>气味：</span>
                  <Tag color={smellColors[lastInspection.smell as SmellType]}>
                    {smellLabels[lastInspection.smell as SmellType]}
                  </Tag>
                </div>
                <div>
                  <span style={{ color: '#666' }}>操作人：</span>
                  <span>{lastInspection.operator}</span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>时间：</span>
                  <span>{lastInspection.inspection_time}</span>
                </div>
                {lastInspection.change_reason && (
                  <div>
                    <span style={{ color: '#666' }}>变动原因：</span>
                    <Tag color="blue">
                      {reasonLabels[lastInspection.change_reason]}
                    </Tag>
                  </div>
                )}
              </Space>

              <Divider />

              <Alert
                message="提示"
                description="当开度变动超过 40 个百分点时，必须填写变动原因。"
                type="info"
                showIcon
              />
            </div>
          ) : (
            <div style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>
              {selectedCellarId
                ? '该窖位暂无巡检记录'
                : '请先选择窖位查看上次记录'}
            </div>
          )}
        </Card>
      </div>

      <Card title="业务规则说明" style={{ marginTop: 24 }}>
        <ul style={{ lineHeight: 2, color: '#666' }}>
          <li>• 同一窖位连续 3 次气味为「酸腐」，状态自动升为「需翻窖」</li>
          <li>• 「需翻窖」状态的窖位，翻窖完成前阀开度不能超过 60%</li>
          <li>• 开度较上次变动 ≥40 个百分点时，必须填写变动原因（雨季/降温/试味）</li>
          <li>• 每日两次巡检：上午、下午各一次</li>
        </ul>
      </Card>
    </div>
  );
};

export default InspectionPage;
