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

import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, Empty, Spin, Table, Tag, Typography } from '@douyinfe/semi-ui';
import { IconPulse } from '@douyinfe/semi-icons';
import { VChart } from '@visactor/react-vchart';
import {
  API,
  formatLatencyMs,
  formatSuccessRate,
  formatTps,
  getLatencyColor,
  getSuccessRateColor,
} from '../../../../../helpers';
import { CHART_CONFIG } from '../../../../../constants/dashboard.constants';

const { Text } = Typography;

const buildSeriesValues = (groups) => {
  if (!Array.isArray(groups)) return [];
  return groups.flatMap((group) =>
    (group.series || []).map((point) => ({
      group: group.group,
      ts: point.ts,
      time: new Date(Number(point.ts || 0) * 1000).toLocaleString(),
      avg_latency_ms: Number(point.avg_latency_ms || 0),
      avg_ttft_ms: Number(point.avg_ttft_ms || 0),
      success_rate: Number(point.success_rate || 0),
      avg_tps: Number(point.avg_tps || 0),
    })),
  );
};

const buildLatencySpec = (values, t) => ({
  type: 'line',
  data: [{ id: 'modelPerfLatency', values }],
  xField: 'time',
  yField: 'avg_latency_ms',
  seriesField: 'group',
  legends: { visible: true, orient: 'bottom', selectMode: 'single' },
  point: { visible: false },
  axes: [
    {
      orient: 'left',
      label: {
        formatMethod: (value) => formatLatencyMs(value),
      },
    },
  ],
  title: {
    visible: true,
    text: t('延迟趋势'),
  },
  tooltip: {
    dimension: {
      content: [
        {
          key: (datum) => datum.group,
          value: (datum) => formatLatencyMs(datum.avg_latency_ms),
        },
      ],
    },
  },
});

const ModelPerformanceMetrics = ({ modelName, t }) => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadMetrics() {
      if (!modelName) return;
      setLoading(true);
      try {
        const res = await API.get('/api/perf-metrics', {
          params: { model: modelName, hours: 24 },
          skipErrorHandler: true,
          disableDuplicate: true,
        });
        const { success, data } = res.data;
        if (!cancelled) {
          setMetrics(success ? data : null);
        }
      } catch (err) {
        if (!cancelled) {
          setMetrics(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [modelName]);

  const groups = metrics?.groups || [];
  const seriesValues = useMemo(() => buildSeriesValues(groups), [groups]);
  const latencySpec = useMemo(
    () => buildLatencySpec(seriesValues, t),
    [seriesValues, t],
  );

  const columns = useMemo(
    () => [
      {
        title: t('分组'),
        dataIndex: 'group',
        render: (value) => (
          <Tag color='white' shape='circle'>
            {value || '-'}
          </Tag>
        ),
      },
      {
        title: t('平均TTFT'),
        dataIndex: 'avg_ttft_ms',
        render: (value) => formatLatencyMs(value),
      },
      {
        title: t('平均延迟'),
        dataIndex: 'avg_latency_ms',
        render: (value) => (
          <Tag color={getLatencyColor(value)} shape='circle'>
            {formatLatencyMs(value)}
          </Tag>
        ),
      },
      {
        title: t('成功率'),
        dataIndex: 'success_rate',
        render: (value) => (
          <Tag color={getSuccessRateColor(value)} shape='circle'>
            {formatSuccessRate(value)}
          </Tag>
        ),
      },
      {
        title: t('平均吞吐'),
        dataIndex: 'avg_tps',
        render: (value) => formatTps(value),
      },
    ],
    [t],
  );

  return (
    <div>
      <div className='flex items-center mb-4'>
        <Avatar size='small' color='green' className='mr-2 shadow-md'>
          <IconPulse size={16} />
        </Avatar>
        <div>
          <Text className='text-lg font-medium'>{t('性能指标')}</Text>
          <div className='text-xs text-gray-600'>
            {t('近 24 小时模型分组性能')}
          </div>
        </div>
      </div>
      <Spin spinning={loading}>
        {groups.length === 0 ? (
          <Empty description={t('暂无性能数据')} style={{ padding: 20 }} />
        ) : (
          <>
            {seriesValues.length > 0 && (
              <div className='model-performance-chart'>
                <VChart spec={latencySpec} option={CHART_CONFIG} />
              </div>
            )}
            <Table
              dataSource={groups}
              columns={columns}
              pagination={false}
              size='small'
              rowKey='group'
              scroll={{ x: 'max-content' }}
            />
          </>
        )}
      </Spin>
    </div>
  );
};

export default ModelPerformanceMetrics;
