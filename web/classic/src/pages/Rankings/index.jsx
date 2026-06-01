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
  Avatar,
  Banner,
  Button,
  Card,
  Empty,
  Progress,
  Radio,
  RadioGroup,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { VChart } from '@visactor/react-vchart';
import { initVChartSemiTheme } from '@visactor/vchart-semi-theme';
import { ArrowDown, ArrowUp, BarChart3, RefreshCw, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API, getLobeHubIcon, renderNumber, showError } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { CHART_CONFIG } from '../../constants/dashboard.constants';

const { Text, Title } = Typography;

const PERIOD_OPTIONS = [
  { label: '今日', value: 'today' },
  { label: '近 7 天', value: 'week' },
  { label: '近 30 天', value: 'month' },
  { label: '近一年', value: 'year' },
  { label: '全部时间', value: 'all' },
];

const compactNumber = (value) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? renderNumber(numeric) : 0;
};

const percent = (value, digits = 1) => {
  const numeric = Number(value || 0) * 100;
  return `${numeric.toFixed(digits)}%`;
};

const signedPercent = (value) => {
  const numeric = Number(value || 0);
  const prefix = numeric > 0 ? '+' : '';
  return `${prefix}${numeric.toFixed(1)}%`;
};

const modelRankDelta = (record) => {
  if (!record || record.previous_rank == null) return null;
  return Number(record.previous_rank) - Number(record.rank);
};

const renderGrowthTag = (value) => {
  const numeric = Number(value || 0);
  const type = numeric > 0 ? 'success' : numeric < 0 ? 'danger' : 'tertiary';
  const icon =
    numeric > 0 ? (
      <ArrowUp size={12} />
    ) : numeric < 0 ? (
      <ArrowDown size={12} />
    ) : null;

  return (
    <Tag type={type} prefixIcon={icon}>
      {signedPercent(numeric)}
    </Tag>
  );
};

const renderVendorIcon = (icon, name, size = 20) => (
  <span className='inline-flex items-center justify-center flex-shrink-0'>
    {icon ? (
      getLobeHubIcon(icon, size)
    ) : (
      <Avatar size='extra-small'>{name?.[0] || '?'}</Avatar>
    )}
  </span>
);

const buildModelHistorySpec = (data, t) => ({
  type: 'area',
  data: [
    {
      id: 'modelHistory',
      values: data?.models_history?.points || [],
    },
  ],
  xField: 'label',
  yField: 'tokens',
  seriesField: 'model',
  stack: true,
  legends: {
    visible: true,
    orient: 'bottom',
    selectMode: 'single',
  },
  title: {
    visible: true,
    text: t('模型消耗趋势'),
    subtext: t('按统计周期聚合 token 消耗'),
  },
  area: {
    style: {
      fillOpacity: 0.28,
    },
  },
  line: {
    style: {
      lineWidth: 2,
    },
  },
  tooltip: {
    dimension: {
      content: [
        {
          key: (datum) => datum.model,
          value: (datum) => Number(datum.tokens || 0),
        },
      ],
      updateContent: (array) => {
        array.sort((a, b) => b.value - a.value);
        let total = 0;
        array.forEach((item) => {
          const value = Number(item.value || 0);
          total += value;
          item.value = compactNumber(value);
        });
        array.unshift({ key: t('总计'), value: compactNumber(total) });
        return array;
      },
    },
  },
});

const buildVendorShareSpec = (data, t) => ({
  type: 'line',
  data: [
    {
      id: 'vendorShare',
      values: data?.vendor_share_history?.points || [],
    },
  ],
  xField: 'label',
  yField: 'share',
  seriesField: 'vendor',
  legends: {
    visible: true,
    orient: 'bottom',
    selectMode: 'single',
  },
  title: {
    visible: true,
    text: t('供应商份额趋势'),
    subtext: t('各供应商 token 消耗占比变化'),
  },
  point: {
    visible: false,
  },
  axes: [
    {
      orient: 'left',
      label: {
        formatMethod: (value) => percent(value, 0),
      },
    },
  ],
  tooltip: {
    dimension: {
      content: [
        {
          key: (datum) => datum.vendor,
          value: (datum) => Number(datum.share || 0),
        },
      ],
      updateContent: (array) => {
        array.sort((a, b) => b.value - a.value);
        array.forEach((item) => {
          item.value = percent(item.value, 1);
        });
        return array;
      },
    },
  },
});

const buildVendorSharePieSpec = (data, t) => ({
  type: 'pie',
  data: [
    {
      id: 'vendorSharePie',
      values: data?.vendors || [],
    },
  ],
  valueField: 'total_tokens',
  categoryField: 'vendor',
  outerRadius: 0.78,
  innerRadius: 0.46,
  legends: {
    visible: true,
    orient: 'bottom',
  },
  label: {
    visible: true,
    formatMethod: (_, datum) => `${datum.vendor} ${percent(datum.share, 1)}`,
  },
  title: {
    visible: true,
    text: t('供应商占比'),
    subtext: t('当前周期 token 消耗分布'),
  },
  tooltip: {
    mark: {
      content: [
        {
          key: (datum) => datum.vendor,
          value: (datum) =>
            `${compactNumber(datum.total_tokens)} (${percent(datum.share, 1)})`,
        },
      ],
    },
  },
});

const Rankings = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rankingData, setRankingData] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const models = rankingData?.models || [];
  const vendors = rankingData?.vendors || [];
  const movers = rankingData?.top_movers || [];
  const droppers = rankingData?.top_droppers || [];
  const totalTokens = models.reduce(
    (sum, item) => sum + Number(item.total_tokens || 0),
    0,
  );
  const topModel = models[0];
  const topVendor = vendors[0];
  const hasData = models.length > 0 || vendors.length > 0;

  const loadRankings = useCallback(
    async (nextPeriod = period) => {
      setLoading(true);
      setError('');
      try {
        const res = await API.get('/api/rankings', {
          params: { period: nextPeriod },
          skipErrorHandler: true,
          disableDuplicate: true,
        });
        const { success, message, data } = res.data;
        if (success) {
          setRankingData(data || null);
          setUpdatedAt(new Date());
        } else {
          setError(message || t('加载失败'));
          setRankingData(null);
        }
      } catch (err) {
        const message =
          err?.response?.data?.message || err?.message || t('加载失败');
        setError(message);
        setRankingData(null);
        showError(message);
      } finally {
        setLoading(false);
      }
    },
    [period, t],
  );

  useEffect(() => {
    initVChartSemiTheme({
      isWatchingThemeSwitch: true,
    });
  }, []);

  useEffect(() => {
    loadRankings(period);
  }, [loadRankings, period]);

  const modelHistorySpec = useMemo(
    () => buildModelHistorySpec(rankingData, t),
    [rankingData, t],
  );
  const vendorShareSpec = useMemo(
    () => buildVendorShareSpec(rankingData, t),
    [rankingData, t],
  );
  const vendorSharePieSpec = useMemo(
    () => buildVendorSharePieSpec(rankingData, t),
    [rankingData, t],
  );

  const modelColumns = useMemo(
    () => [
      {
        title: t('排名'),
        dataIndex: 'rank',
        width: 86,
        render: (rank, record) => {
          const delta = modelRankDelta(record);
          return (
            <Space spacing={6} align='center'>
              <Text strong>#{rank}</Text>
              {delta !== null && delta !== 0 ? (
                <Tag type={delta > 0 ? 'success' : 'danger'} size='small'>
                  {delta > 0 ? `+${delta}` : delta}
                </Tag>
              ) : null}
            </Space>
          );
        },
      },
      {
        title: t('模型名称'),
        dataIndex: 'model_name',
        render: (name, record) => (
          <Space spacing={8} align='center'>
            {renderVendorIcon(record.vendor_icon, record.vendor)}
            <div className='min-w-0'>
              <Text strong ellipsis={{ showTooltip: true }}>
                {name || '-'}
              </Text>
              <div>
                <Text type='secondary' size='small'>
                  {record.vendor || t('未知供应商')}
                </Text>
              </div>
            </div>
          </Space>
        ),
      },
      {
        title: 'Tokens',
        dataIndex: 'total_tokens',
        width: 130,
        render: (value) => <Text>{compactNumber(value)}</Text>,
      },
      {
        title: t('份额'),
        dataIndex: 'share',
        width: 170,
        render: (value) => (
          <div style={{ minWidth: 130 }}>
            <Text>{percent(value)}</Text>
            <Progress
              percent={Math.min(Number(value || 0) * 100, 100)}
              showInfo={false}
              size='small'
              style={{ marginTop: 4 }}
            />
          </div>
        ),
      },
      {
        title: t('较上期'),
        dataIndex: 'growth_pct',
        width: 110,
        render: renderGrowthTag,
      },
    ],
    [t],
  );

  const vendorColumns = useMemo(
    () => [
      {
        title: t('排名'),
        dataIndex: 'rank',
        width: 86,
        render: (rank) => <Text strong>#{rank}</Text>,
      },
      {
        title: t('供应商'),
        dataIndex: 'vendor',
        render: (vendor, record) => (
          <Space spacing={8} align='center'>
            {renderVendorIcon(record.vendor_icon, vendor)}
            <Text strong>{vendor || t('未知供应商')}</Text>
          </Space>
        ),
      },
      {
        title: t('模型数量'),
        dataIndex: 'models_count',
        width: 110,
        render: (value) => <Text>{value || 0}</Text>,
      },
      {
        title: t('主力模型'),
        dataIndex: 'top_model',
        render: (value) => (
          <Text ellipsis={{ showTooltip: true }}>{value || '-'}</Text>
        ),
      },
      {
        title: 'Tokens',
        dataIndex: 'total_tokens',
        width: 130,
        render: (value) => <Text>{compactNumber(value)}</Text>,
      },
      {
        title: t('份额'),
        dataIndex: 'share',
        width: 120,
        render: (value) => <Text>{percent(value)}</Text>,
      },
      {
        title: t('较上期'),
        dataIndex: 'growth_pct',
        width: 110,
        render: renderGrowthTag,
      },
    ],
    [t],
  );

  const moverList = (items, type) => (
    <div className='flex flex-col gap-2'>
      {items.length === 0 ? (
        <Empty
          image={<IllustrationNoResult style={{ width: 92, height: 92 }} />}
          darkModeImage={
            <IllustrationNoResultDark style={{ width: 92, height: 92 }} />
          }
          description={t('暂无数据')}
          style={{ padding: 12 }}
        />
      ) : (
        items.map((item) => (
          <div
            key={`${type}-${item.model_name}`}
            className='flex items-center justify-between gap-3 rounded-lg border border-semi-color-border px-3 py-2'
          >
            <Space spacing={8} align='center' className='min-w-0'>
              {renderVendorIcon(item.vendor_icon, item.vendor)}
              <div className='min-w-0'>
                <Text strong ellipsis={{ showTooltip: true }}>
                  {item.model_name}
                </Text>
                <div>
                  <Text type='secondary' size='small'>
                    #{item.current_rank} · {item.vendor || t('未知供应商')}
                  </Text>
                </div>
              </div>
            </Space>
            <Space spacing={8} align='center'>
              <Tag type={type === 'up' ? 'success' : 'danger'}>
                {type === 'up' ? `+${item.rank_delta}` : item.rank_delta}
              </Tag>
              {renderGrowthTag(item.growth_pct)}
            </Space>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className='rankings-page'>
      <section className='rankings-hero'>
        <div>
          <Space spacing={10} align='center'>
            <Trophy size={28} />
            <Title heading={2} style={{ margin: 0 }}>
              {t('排行榜')}
            </Title>
          </Space>
          <Text type='secondary'>
            {t('展示模型与供应商消耗排行，帮助识别当前最活跃的模型。')}
          </Text>
        </div>
        <Space spacing={10} align='center' wrap className='rankings-toolbar'>
          <RadioGroup
            type='button'
            size={isMobile ? 'small' : 'middle'}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {PERIOD_OPTIONS.map((item) => (
              <Radio key={item.value} value={item.value}>
                {t(item.label)}
              </Radio>
            ))}
          </RadioGroup>
          <Tooltip content={t('刷新')}>
            <Button
              icon={<RefreshCw size={16} />}
              onClick={() => loadRankings(period)}
              loading={loading}
              aria-label={t('刷新')}
            />
          </Tooltip>
        </Space>
      </section>

      {error ? (
        <Banner
          type='danger'
          closeIcon={null}
          title={t('加载失败')}
          description={error}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Spin spinning={loading}>
        {!hasData && !loading ? (
          <Card className='!rounded-lg' bodyStyle={{ padding: 32 }}>
            <Empty
              image={
                <IllustrationNoResult style={{ width: 180, height: 180 }} />
              }
              darkModeImage={
                <IllustrationNoResultDark style={{ width: 180, height: 180 }} />
              }
              title={t('暂无排行数据')}
              description={t('当前周期还没有可用于排行的 token 消耗记录')}
            />
          </Card>
        ) : (
          <>
            <div className='rankings-stats'>
              <Card className='!rounded-lg' bodyStyle={{ padding: 16 }}>
                <Text type='secondary'>{t('总 Token 消耗')}</Text>
                <Title heading={3} style={{ margin: '6px 0 0' }}>
                  {compactNumber(totalTokens)}
                </Title>
              </Card>
              <Card className='!rounded-lg' bodyStyle={{ padding: 16 }}>
                <Text type='secondary'>{t('上榜模型')}</Text>
                <Title heading={3} style={{ margin: '6px 0 0' }}>
                  {models.length}
                </Title>
              </Card>
              <Card className='!rounded-lg' bodyStyle={{ padding: 16 }}>
                <Text type='secondary'>{t('热门模型')}</Text>
                <Title heading={3} style={{ margin: '6px 0 0' }}>
                  {topModel?.model_name || '-'}
                </Title>
              </Card>
              <Card className='!rounded-lg' bodyStyle={{ padding: 16 }}>
                <Text type='secondary'>{t('热门供应商')}</Text>
                <Title heading={3} style={{ margin: '6px 0 0' }}>
                  {topVendor?.vendor || '-'}
                </Title>
              </Card>
            </div>

            <div className='rankings-charts'>
              <Card
                className='!rounded-lg'
                title={
                  <Space spacing={8}>
                    <BarChart3 size={16} />
                    {t('模型消耗趋势')}
                  </Space>
                }
              >
                <div className='rankings-chart'>
                  <VChart spec={modelHistorySpec} option={CHART_CONFIG} />
                </div>
              </Card>
              <Card className='!rounded-lg' title={t('供应商占比')}>
                <div className='rankings-chart'>
                  <VChart spec={vendorSharePieSpec} option={CHART_CONFIG} />
                </div>
              </Card>
            </div>

            <Card
              className='!rounded-lg rankings-table-card'
              title={t('模型排行')}
            >
              <Table
                columns={modelColumns}
                dataSource={models}
                rowKey='model_name'
                pagination={false}
                size='middle'
                scroll={{ x: 'max-content' }}
                empty={<Empty description={t('暂无数据')} />}
              />
            </Card>

            <div className='rankings-charts rankings-lower-grid'>
              <Card className='!rounded-lg' title={t('供应商份额趋势')}>
                <div className='rankings-chart'>
                  <VChart spec={vendorShareSpec} option={CHART_CONFIG} />
                </div>
              </Card>
              <Card className='!rounded-lg' title={t('供应商排行')}>
                <Table
                  columns={vendorColumns}
                  dataSource={vendors}
                  rowKey='vendor'
                  pagination={false}
                  size='middle'
                  scroll={{ x: 'max-content' }}
                  empty={<Empty description={t('暂无数据')} />}
                />
              </Card>
            </div>

            <div className='rankings-movers'>
              <Card className='!rounded-lg' title={t('上升最快')}>
                {moverList(movers, 'up')}
              </Card>
              <Card className='!rounded-lg' title={t('下降最多')}>
                {moverList(droppers, 'down')}
              </Card>
            </div>

            <div className='rankings-footer-note'>
              <Text type='secondary' size='small'>
                {updatedAt
                  ? `${t('更新时间')}: ${updatedAt.toLocaleString()}`
                  : null}
              </Text>
            </div>
          </>
        )}
      </Spin>
    </div>
  );
};

export default Rankings;
