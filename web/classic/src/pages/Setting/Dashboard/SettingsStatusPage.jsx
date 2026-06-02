/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Edit,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess, toBoolean } from '../../../helpers';
import {
  createStatusPageComponent,
  createStatusPageIncident,
  createStatusPageIncidentUpdate,
  deleteStatusPageComponent,
  deleteStatusPageIncident,
  getStatusPageComponents,
  getStatusPageIncidents,
  getStatusPageModelOptions,
  reorderStatusPageComponents,
  resolveStatusPageIncident,
  updateStatusPageComponent,
  updateStatusPageIncident,
} from '../../StatusPage/statusPageApi';
import {
  DEFAULT_STATUS_PAGE_PROBE,
  DEFAULT_STATUS_PAGE_THRESHOLDS,
  INCIDENT_IMPACTS,
  INCIDENT_STATUSES,
  componentFormToPayload,
  componentToForm,
  getIncidentImpactLabel,
  getIncidentStatusLabel,
  getStatusLabel,
  getStatusTone,
  incidentFormToPayload,
  incidentToForm,
  toLocalDateTimeInput,
} from '../../StatusPage/statusPageUtils';

const { Text } = Typography;

const STATUS_PAGE_DOMAIN_PLACEHOLDER = 'status.example.com';
const STATUS_PAGE_TIMEZONE_PLACEHOLDER = 'Asia/Shanghai';

const emptyComponentForm = {
  name: '',
  description: '',
  status: 'no_data',
  enabled: true,
  sort_order: 0,
  models: [],
  channelIds: [],
  groups: [],
  thresholds: { ...DEFAULT_STATUS_PAGE_THRESHOLDS },
  probe: { ...DEFAULT_STATUS_PAGE_PROBE },
};

const emptyIncidentForm = {
  title: '',
  impact: 'minor',
  status: 'investigating',
  componentIds: [],
  startedAt: toLocalDateTimeInput(Math.floor(Date.now() / 1000)),
};

const emptyUpdateForm = {
  status: 'monitoring',
  message: '',
};

const StatusPageOptionEditor = ({ options, refresh }) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [basic, setBasic] = useState({
    enabled: false,
    domain: '',
    title: '系统状态',
    description: '服务可用性与事件更新',
    timezone: 'Asia/Shanghai',
  });

  useEffect(() => {
    setBasic({
      enabled: toBoolean(options['console_setting.status_page_enabled']),
      domain: options['console_setting.status_page_domain'] || '',
      title: options['console_setting.status_page_title'] || '系统状态',
      description:
        options['console_setting.status_page_description'] ||
        '服务可用性与事件更新',
      timezone:
        options['console_setting.status_page_timezone'] || 'Asia/Shanghai',
    });
  }, [options]);

  const saveBasic = async () => {
    const entries = [
      ['console_setting.status_page_enabled', basic.enabled ? 'true' : 'false'],
      ['console_setting.status_page_domain', basic.domain],
      ['console_setting.status_page_title', basic.title],
      ['console_setting.status_page_description', basic.description],
      ['console_setting.status_page_timezone', basic.timezone],
    ];

    setSaving(true);
    try {
      for (const [key, value] of entries) {
        const res = await API.put('/api/option/', { key, value });
        if (!res.data.success) {
          showError(res.data.message);
          return;
        }
      }
      showSuccess(t('状态页设置已保存'));
      refresh?.();
    } catch (error) {
      showError(error.message || t('保存失败，请重试'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form.Section
      text={
        <Space spacing={8}>
          <Activity size={16} />
          {t('公开状态页')}
        </Space>
      }
      extraText={t('配置独立公开状态页、绑定日志统计组件并发布事件更新')}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <div className='status-admin-field'>
            <Text strong>{t('启用状态页')}</Text>
            <Switch
              checked={basic.enabled}
              onChange={(checked) =>
                setBasic((prev) => ({ ...prev, enabled: checked }))
              }
            />
          </div>
        </Col>
        <Col xs={24} md={8}>
          <Input
            value={basic.domain}
            placeholder={STATUS_PAGE_DOMAIN_PLACEHOLDER}
            prefix={t('域名')}
            onChange={(value) =>
              setBasic((prev) => ({ ...prev, domain: value }))
            }
          />
        </Col>
        <Col xs={24} md={8}>
          <Input
            value={basic.timezone}
            placeholder={STATUS_PAGE_TIMEZONE_PLACEHOLDER}
            prefix={t('时区')}
            onChange={(value) =>
              setBasic((prev) => ({ ...prev, timezone: value }))
            }
          />
        </Col>
        <Col xs={24} md={8}>
          <Input
            value={basic.title}
            prefix={t('标题')}
            onChange={(value) =>
              setBasic((prev) => ({ ...prev, title: value }))
            }
          />
        </Col>
        <Col xs={24} md={16}>
          <Input
            value={basic.description}
            prefix={t('描述')}
            onChange={(value) =>
              setBasic((prev) => ({ ...prev, description: value }))
            }
          />
        </Col>
      </Row>
      <div className='status-admin-actions'>
        <Button
          type='primary'
          icon={<Save size={14} />}
          loading={saving}
          onClick={saveBasic}
        >
          {t('保存设置')}
        </Button>
      </div>
    </Form.Section>
  );
};

const SettingsStatusPage = ({ options, refresh }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [components, setComponents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [channels, setChannels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [componentDialogOpen, setComponentDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [componentForm, setComponentForm] = useState(emptyComponentForm);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [incidentForm, setIncidentForm] = useState(emptyIncidentForm);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState(null);
  const [updateForm, setUpdateForm] = useState(emptyUpdateForm);
  const [modelOptions, setModelOptions] = useState([]);
  const [modelOptionsSource, setModelOptionsSource] = useState('');
  const [modelOptionsLoading, setModelOptionsLoading] = useState(false);

  const channelOptions = useMemo(
    () =>
      channels.map((channel) => ({
        label: `${channel.name || t('未命名渠道')} #${channel.id}`,
        value: channel.id,
      })),
    [channels, t],
  );

  const groupOptions = useMemo(
    () => groups.map((group) => ({ label: group, value: group })),
    [groups],
  );

  const modelSelectOptions = useMemo(() => {
    const options = modelOptions.map((item) => ({
      label: item.fallback
        ? `${item.model} · ${t('未调用，来自启用模型')}`
        : `${item.model} · ${item.success_count} ${t('次成功调用')}`,
      value: item.model,
    }));
    const knownModels = new Set(options.map((item) => item.value));
    (componentForm.models || []).forEach((model) => {
      if (model && !knownModels.has(model)) {
        options.push({ label: model, value: model });
        knownModels.add(model);
      }
    });
    return options;
  }, [componentForm.models, modelOptions, t]);

  const componentOptions = useMemo(
    () =>
      components.map((component) => ({
        label: component.name,
        value: component.id,
      })),
    [components],
  );

  const loadStatusPageData = useCallback(async () => {
    setLoading(true);
    try {
      const [componentRes, incidentRes] = await Promise.all([
        getStatusPageComponents(),
        getStatusPageIncidents('all'),
      ]);
      if (componentRes.success) {
        setComponents(componentRes.data || []);
      } else {
        showError(componentRes.message);
      }
      if (incidentRes.success) {
        setIncidents(incidentRes.data?.items || []);
      } else {
        showError(incidentRes.message);
      }
    } catch (error) {
      showError(error.message || t('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadOptions = useCallback(async () => {
    try {
      const [channelsRes, groupsRes] = await Promise.all([
        API.get('/api/channel/', { params: { page_size: 100 } }),
        API.get('/api/group/'),
      ]);
      if (channelsRes.data?.success) {
        setChannels(channelsRes.data.data?.items || []);
      }
      if (groupsRes.data?.success) {
        setGroups(groupsRes.data.data || []);
      }
    } catch (error) {
      // Options are helpers; the form remains usable without them.
    }
  }, []);

  const loadModelOptions = useCallback(
    async (group, applyDefault) => {
      if (!group) {
        setModelOptions([]);
        setModelOptionsSource('');
        return;
      }
      setModelOptionsLoading(true);
      try {
        const res = await getStatusPageModelOptions(group, 90);
        if (!res.success) {
          showError(res.message);
          setModelOptions([]);
          setModelOptionsSource('');
          return;
        }
        const data = res.data || {};
        setModelOptions(data.items || []);
        setModelOptionsSource(data.source || '');
        if (applyDefault && data.default_model) {
          setComponentForm((prev) => {
            const nextModels =
              prev.models && prev.models.length > 0
                ? prev.models
                : [data.default_model];
            const nextProbeModels =
              prev.probe?.enabled && (!prev.probe.models || prev.probe.models.length === 0)
                ? [data.default_model]
                : prev.probe?.models || [];
            return {
              ...prev,
              models: nextModels,
              probe: {
                ...prev.probe,
                models: nextProbeModels,
              },
            };
          });
        }
      } catch (error) {
        showError(error.message || t('模型候选加载失败'));
        setModelOptions([]);
        setModelOptionsSource('');
      } finally {
        setModelOptionsLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    loadStatusPageData();
    loadOptions();
  }, [loadStatusPageData, loadOptions]);

  useEffect(() => {
    if (!componentDialogOpen) return;
    const selectedGroups = componentForm.groups || [];
    if (selectedGroups.length === 1) {
      loadModelOptions(selectedGroups[0], !editingComponent);
      return;
    }
    setModelOptions([]);
    setModelOptionsSource('');
  }, [
    componentDialogOpen,
    componentForm.groups,
    editingComponent,
    loadModelOptions,
  ]);

  const refreshAll = async () => {
    await loadStatusPageData();
    refresh?.();
  };

  const saveComponent = async () => {
    if (!componentForm.name.trim()) {
      showError(t('请填写组件名称'));
      return;
    }
    const thresholds = componentForm.thresholds || DEFAULT_STATUS_PAGE_THRESHOLDS;
    if (
      thresholds.operational <= thresholds.degraded ||
      thresholds.degraded <= thresholds.partial_outage ||
      thresholds.operational > 100 ||
      thresholds.partial_outage < 0
    ) {
      showError(t('阈值必须满足 100 >= 运行正常 > 性能下降 > 部分中断 >= 0'));
      return;
    }
    setLoading(true);
    try {
      const payload = componentFormToPayload(componentForm);
      const res = editingComponent
        ? await updateStatusPageComponent(editingComponent.id, payload)
        : await createStatusPageComponent(payload);
      if (!res.success) {
        showError(res.message);
        return;
      }
      showSuccess(t('状态组件已保存'));
      setComponentDialogOpen(false);
      await loadStatusPageData();
    } catch (error) {
      showError(error.message || t('保存失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const saveIncident = async () => {
    if (!incidentForm.title.trim()) {
      showError(t('请填写事件标题'));
      return;
    }
    setLoading(true);
    try {
      const payload = incidentFormToPayload(incidentForm);
      const res = editingIncident
        ? await updateStatusPageIncident(editingIncident.id, payload)
        : await createStatusPageIncident(payload);
      if (!res.success) {
        showError(res.message);
        return;
      }
      showSuccess(t('事件已保存'));
      setIncidentDialogOpen(false);
      await loadStatusPageData();
    } catch (error) {
      showError(error.message || t('保存失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const saveUpdate = async () => {
    if (!updateTarget) return;
    if (!updateForm.message.trim()) {
      showError(t('请填写事件更新内容'));
      return;
    }
    setLoading(true);
    try {
      const res = await createStatusPageIncidentUpdate(updateTarget.id, {
        status: updateForm.status,
        message: updateForm.message.trim(),
      });
      if (!res.success) {
        showError(res.message);
        return;
      }
      showSuccess(t('事件更新已添加'));
      setUpdateDialogOpen(false);
      await loadStatusPageData();
    } catch (error) {
      showError(error.message || t('保存失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const moveComponent = async (componentId, direction) => {
    const index = components.findIndex((component) => component.id === componentId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= components.length) {
      return;
    }
    const nextComponents = [...components];
    [nextComponents[index], nextComponents[targetIndex]] = [
      nextComponents[targetIndex],
      nextComponents[index],
    ];
    setLoading(true);
    try {
      const res = await reorderStatusPageComponents(
        nextComponents.map((component) => component.id),
      );
      if (!res.success) {
        showError(res.message);
        return;
      }
      showSuccess(t('状态组件排序已更新'));
      await loadStatusPageData();
    } catch (error) {
      showError(error.message || t('保存失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteComponent = (component) => {
    Modal.confirm({
      title: t('确认删除'),
      content: t('确定要删除此状态组件吗？'),
      onOk: async () => {
        const res = await deleteStatusPageComponent(component.id);
        if (res.success) {
          showSuccess(t('删除成功'));
          await loadStatusPageData();
        } else {
          showError(res.message);
        }
      },
    });
  };

  const confirmDeleteIncident = (incident) => {
    Modal.confirm({
      title: t('确认删除'),
      content: t('确定要删除此事件吗？'),
      onOk: async () => {
        const res = await deleteStatusPageIncident(incident.id);
        if (res.success) {
          showSuccess(t('删除成功'));
          await loadStatusPageData();
        } else {
          showError(res.message);
        }
      },
    });
  };

  const confirmResolveIncident = async (incident) => {
    setLoading(true);
    try {
      const res = await resolveStatusPageIncident(incident.id);
      if (res.success) {
        showSuccess(t('事件已标记解决'));
        await loadStatusPageData();
      } else {
        showError(res.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const openNewComponent = () => {
    setEditingComponent(null);
    setComponentForm({
      ...emptyComponentForm,
      thresholds: { ...DEFAULT_STATUS_PAGE_THRESHOLDS },
      probe: { ...DEFAULT_STATUS_PAGE_PROBE },
    });
    setModelOptions([]);
    setModelOptionsSource('');
    setComponentDialogOpen(true);
  };

  const openEditComponent = (component) => {
    setEditingComponent(component);
    setComponentForm(componentToForm(component));
    setModelOptions([]);
    setModelOptionsSource('');
    setComponentDialogOpen(true);
  };

  const openNewIncident = () => {
    setEditingIncident(null);
    setIncidentForm({
      ...emptyIncidentForm,
      startedAt: toLocalDateTimeInput(Math.floor(Date.now() / 1000)),
    });
    setIncidentDialogOpen(true);
  };

  const openEditIncident = (incident) => {
    setEditingIncident(incident);
    setIncidentForm(incidentToForm(incident));
    setIncidentDialogOpen(true);
  };

  const openUpdateDialog = (incident) => {
    setUpdateTarget(incident);
    setUpdateForm({ ...emptyUpdateForm, status: incident.status });
    setUpdateDialogOpen(true);
  };

  const componentColumns = [
    {
      title: t('名称'),
      dataIndex: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.description ? (
            <div>
              <Text type='secondary' size='small'>
                {record.description}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      width: 150,
      render: (status) => {
        const tone = getStatusTone(status);
        return <Tag color={tone.tag}>{t(getStatusLabel(status))}</Tag>;
      },
    },
    {
      title: t('发布'),
      dataIndex: 'enabled',
      width: 100,
      render: (enabled) =>
        enabled ? <Tag color='green'>{t('已启用')}</Tag> : <Tag>{t('已禁用')}</Tag>,
    },
    {
      title: t('操作'),
      width: 260,
      fixed: 'right',
      render: (_, record, index) => (
        <Space wrap>
          <Button
            icon={<ArrowUp size={14} />}
            theme='light'
            size='small'
            disabled={index === 0}
            onClick={() => moveComponent(record.id, -1)}
          />
          <Button
            icon={<ArrowDown size={14} />}
            theme='light'
            size='small'
            disabled={index === components.length - 1}
            onClick={() => moveComponent(record.id, 1)}
          />
          <Button
            icon={<Edit size={14} />}
            theme='light'
            size='small'
            onClick={() => openEditComponent(record)}
          >
            {t('编辑')}
          </Button>
          <Button
            icon={<Trash2 size={14} />}
            type='danger'
            theme='light'
            size='small'
            onClick={() => confirmDeleteComponent(record)}
          >
            {t('删除')}
          </Button>
        </Space>
      ),
    },
  ];

  const incidentColumns = [
    {
      title: t('标题'),
      dataIndex: 'title',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: t('影响'),
      dataIndex: 'impact',
      width: 120,
      render: (impact) => <Tag>{t(getIncidentImpactLabel(impact))}</Tag>,
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      width: 120,
      render: (status) => <Tag>{t(getIncidentStatusLabel(status))}</Tag>,
    },
    {
      title: t('更新数'),
      dataIndex: 'updates',
      width: 100,
      render: (updates) => (updates || []).length,
    },
    {
      title: t('操作'),
      width: 310,
      fixed: 'right',
      render: (_, record) => (
        <Space wrap>
          <Button
            icon={<Plus size={14} />}
            theme='light'
            size='small'
            onClick={() => openUpdateDialog(record)}
          >
            {t('更新')}
          </Button>
          {record.status !== 'resolved' ? (
            <Button
              icon={<CheckCircle2 size={14} />}
              theme='light'
              size='small'
              onClick={() => confirmResolveIncident(record)}
            >
              {t('解决')}
            </Button>
          ) : null}
          <Button
            icon={<Edit size={14} />}
            theme='light'
            size='small'
            onClick={() => openEditIncident(record)}
          >
            {t('编辑')}
          </Button>
          <Button
            icon={<Trash2 size={14} />}
            type='danger'
            theme='light'
            size='small'
            onClick={() => confirmDeleteIncident(record)}
          >
            {t('删除')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <StatusPageOptionEditor options={options} refresh={refreshAll} />
      <Divider margin='16px' />

      <div className='status-admin-table-header'>
        <div>
          <Text strong>{t('状态组件')}</Text>
          <div>
            <Text type='secondary' size='small'>
              {t('组件会展示在公开状态页，并可绑定模型、渠道或用户分组日志')}
            </Text>
          </div>
        </div>
        <Button icon={<Plus size={14} />} type='primary' onClick={openNewComponent}>
          {t('添加组件')}
        </Button>
      </div>
      <Table
        columns={componentColumns}
        dataSource={components}
        rowKey='id'
        loading={loading}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />

      <Divider margin='24px' />

      <div className='status-admin-table-header'>
        <div>
          <Text strong>{t('状态事件')}</Text>
          <div>
            <Text type='secondary' size='small'>
              {t('事件会公开展示，支持追加更新与标记解决')}
            </Text>
          </div>
        </div>
        <Button icon={<Plus size={14} />} type='primary' onClick={openNewIncident}>
          {t('添加事件')}
        </Button>
      </div>
      <Table
        columns={incidentColumns}
        dataSource={incidents}
        rowKey='id'
        loading={loading}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />

      <Modal
        title={editingComponent ? t('编辑状态组件') : t('添加状态组件')}
        visible={componentDialogOpen}
        onOk={saveComponent}
        onCancel={() => setComponentDialogOpen(false)}
        okText={t('保存')}
        cancelText={t('取消')}
        confirmLoading={loading}
        width={720}
      >
        <div className='status-admin-modal-form'>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Input
                value={componentForm.name}
                prefix={t('名称')}
                onChange={(value) =>
                  setComponentForm((prev) => ({ ...prev, name: value }))
                }
              />
            </Col>
            <Col xs={24} md={12}>
              <InputNumber
                value={componentForm.sort_order}
                prefix={t('排序')}
                min={0}
                onChange={(value) =>
                  setComponentForm((prev) => ({
                    ...prev,
                    sort_order: Number(value || 0),
                  }))
                }
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} md={12}>
              <div className='status-admin-field'>
                <Text strong>{t('发布')}</Text>
                <Switch
                  checked={componentForm.enabled}
                  onChange={(checked) =>
                    setComponentForm((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>
            </Col>
            <Col xs={24}>
              <TextArea
                value={componentForm.description}
                placeholder={t('描述')}
                rows={3}
                onChange={(value) =>
                  setComponentForm((prev) => ({
                    ...prev,
                    description: value,
                  }))
                }
              />
            </Col>
            <Col xs={24}>
              <Text strong>{t('分组')}</Text>
              <Select
                multiple
                filter
                value={componentForm.groups}
                optionList={groupOptions}
                placeholder={t('选择分组')}
                onChange={(value) =>
                  setComponentForm((prev) => ({ ...prev, groups: value || [] }))
                }
                style={{ width: '100%', marginTop: 8 }}
              />
              {(componentForm.groups || []).length > 1 ? (
                <Text
                  type='secondary'
                  size='small'
                  style={{ display: 'block', marginTop: 6 }}
                >
                  {t('多分组组件不会自动推荐默认模型')}
                </Text>
              ) : null}
            </Col>
            <Col xs={24}>
              <Space spacing={8}>
                <Text strong>{t('模型')}</Text>
                {modelOptionsSource ? (
                  <Tag color={modelOptionsSource === 'logs' ? 'green' : 'grey'}>
                    {modelOptionsSource === 'logs'
                      ? t('来自最近日志')
                      : t('来自启用模型')}
                  </Tag>
                ) : null}
              </Space>
              <Select
                multiple
                filter
                value={componentForm.models}
                optionList={modelSelectOptions}
                placeholder={t('选择模型')}
                loading={modelOptionsLoading}
                onChange={(value) => {
                  const nextModels = value || [];
                  setComponentForm((prev) => ({
                    ...prev,
                    models: nextModels,
                    probe: {
                      ...prev.probe,
                      models: (prev.probe?.models || []).filter((model) =>
                        nextModels.includes(model),
                      ),
                    },
                  }));
                }}
                style={{ width: '100%', marginTop: 8 }}
              />
            </Col>
            <Col xs={24}>
              <Text strong>{t('状态阈值')}</Text>
              <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
                <Col xs={24} md={8}>
                  <InputNumber
                    value={componentForm.thresholds?.operational}
                    prefix={t('运行正常最低成功率')}
                    min={0}
                    max={100}
                    precision={2}
                    onChange={(value) =>
                      setComponentForm((prev) => ({
                        ...prev,
                        thresholds: {
                          ...prev.thresholds,
                          operational: Number(value || 0),
                        },
                      }))
                    }
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <InputNumber
                    value={componentForm.thresholds?.degraded}
                    prefix={t('性能下降最低成功率')}
                    min={0}
                    max={100}
                    precision={2}
                    onChange={(value) =>
                      setComponentForm((prev) => ({
                        ...prev,
                        thresholds: {
                          ...prev.thresholds,
                          degraded: Number(value || 0),
                        },
                      }))
                    }
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <InputNumber
                    value={componentForm.thresholds?.partial_outage}
                    prefix={t('部分中断最低成功率')}
                    min={0}
                    max={100}
                    precision={2}
                    onChange={(value) =>
                      setComponentForm((prev) => ({
                        ...prev,
                        thresholds: {
                          ...prev.thresholds,
                          partial_outage: Number(value || 0),
                        },
                      }))
                    }
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
            </Col>
            <Col xs={24}>
              <div className='status-admin-field'>
                <div>
                  <Text strong>{t('无日志时后台探测')}</Text>
                  <div>
                    <Text type='secondary' size='small'>
                      {t('状态由日志成功率和后台探测结果自动判定')}
                    </Text>
                  </div>
                </div>
                <Switch
                  checked={componentForm.probe?.enabled}
                  onChange={(checked) =>
                    setComponentForm((prev) => ({
                      ...prev,
                      probe: {
                        ...prev.probe,
                        enabled: checked,
                        models:
                          checked &&
                          (!prev.probe?.models || prev.probe.models.length === 0)
                            ? prev.models || []
                            : prev.probe?.models || [],
                      },
                    }))
                  }
                />
              </div>
              {componentForm.probe?.enabled ? (
                <Select
                  multiple
                  filter
                  value={componentForm.probe.models}
                  optionList={modelSelectOptions}
                  placeholder={t('选择需要探测的模型')}
                  onChange={(value) =>
                    setComponentForm((prev) => ({
                      ...prev,
                      probe: {
                        ...prev.probe,
                        models: value || [],
                      },
                    }))
                  }
                  style={{ width: '100%', marginTop: 8 }}
                />
              ) : null}
            </Col>
            <Col xs={24}>
              <Divider margin='12px' />
              <Text strong style={{ display: 'block' }}>
                {t('高级渠道绑定')}
              </Text>
              <Select
                multiple
                filter
                value={componentForm.channelIds}
                optionList={channelOptions}
                placeholder={t('选择渠道')}
                onChange={(value) =>
                  setComponentForm((prev) => ({
                    ...prev,
                    channelIds: value || [],
                  }))
                }
                style={{ width: '100%', marginTop: 8 }}
              />
            </Col>
          </Row>
        </div>
      </Modal>

      <Modal
        title={editingIncident ? t('编辑状态事件') : t('添加状态事件')}
        visible={incidentDialogOpen}
        onOk={saveIncident}
        onCancel={() => setIncidentDialogOpen(false)}
        okText={t('保存')}
        cancelText={t('取消')}
        confirmLoading={loading}
        width={720}
      >
        <div className='status-admin-modal-form'>
          <Row gutter={[12, 12]}>
            <Col xs={24}>
              <Input
                value={incidentForm.title}
                prefix={t('标题')}
                onChange={(value) =>
                  setIncidentForm((prev) => ({ ...prev, title: value }))
                }
              />
            </Col>
            <Col xs={24} md={8}>
              <Select
                value={incidentForm.impact}
                optionList={INCIDENT_IMPACTS.map((impact) => ({
                  label: t(getIncidentImpactLabel(impact)),
                  value: impact,
                }))}
                onChange={(value) =>
                  setIncidentForm((prev) => ({ ...prev, impact: value }))
                }
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} md={8}>
              <Select
                value={incidentForm.status}
                optionList={INCIDENT_STATUSES.map((status) => ({
                  label: t(getIncidentStatusLabel(status)),
                  value: status,
                }))}
                onChange={(value) =>
                  setIncidentForm((prev) => ({ ...prev, status: value }))
                }
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} md={8}>
              <Input
                type='datetime-local'
                value={incidentForm.startedAt}
                onChange={(value) =>
                  setIncidentForm((prev) => ({ ...prev, startedAt: value }))
                }
              />
            </Col>
            <Col xs={24}>
              <Text strong>{t('影响组件')}</Text>
              <Checkbox.Group
                value={incidentForm.componentIds}
                onChange={(value) =>
                  setIncidentForm((prev) => ({
                    ...prev,
                    componentIds: value || [],
                  }))
                }
                style={{ display: 'block', marginTop: 10 }}
              >
                <Space wrap>
                  {componentOptions.map((component) => (
                    <Checkbox key={component.value} value={component.value}>
                      {component.label}
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            </Col>
          </Row>
        </div>
      </Modal>

      <Modal
        title={t('添加事件更新')}
        visible={updateDialogOpen}
        onOk={saveUpdate}
        onCancel={() => setUpdateDialogOpen(false)}
        okText={t('保存')}
        cancelText={t('取消')}
        confirmLoading={loading}
        width={620}
      >
        <div className='status-admin-modal-form'>
          <Text type='secondary'>{updateTarget?.title}</Text>
          <Select
            value={updateForm.status}
            optionList={INCIDENT_STATUSES.map((status) => ({
              label: t(getIncidentStatusLabel(status)),
              value: status,
            }))}
            onChange={(value) =>
              setUpdateForm((prev) => ({ ...prev, status: value }))
            }
            style={{ width: '100%', marginTop: 16 }}
          />
          <TextArea
            value={updateForm.message}
            placeholder={t('更新内容')}
            rows={5}
            onChange={(value) =>
              setUpdateForm((prev) => ({ ...prev, message: value }))
            }
            style={{ marginTop: 12 }}
          />
        </div>
      </Modal>
    </>
  );
};

export default SettingsStatusPage;
