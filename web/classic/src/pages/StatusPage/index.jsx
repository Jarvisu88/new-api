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
import { Empty, Spin, Typography } from '@douyinfe/semi-ui';
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getStatusPageSummary } from './statusPageApi';
import {
  formatStatusPageDate,
  formatStatusPageTime,
  formatUptime,
  getIncidentImpactLabel,
  getIncidentStatusLabel,
  getStatusLabel,
  getStatusTone,
} from './statusPageUtils';

const { Text, Title } = Typography;

const StatusHeader = ({ site, generatedAt }) => {
  const { t } = useTranslation();
  return (
    <header className='status-page-header'>
      <div>
        <div className='status-page-brand'>
          <span className='status-page-brand-icon'>
            <Activity size={20} />
          </span>
          <span>{site?.title || t('系统状态')}</span>
        </div>
        <Title heading={1} className='status-page-title'>
          {site?.title || t('系统状态')}
        </Title>
        {site?.description ? (
          <Text className='status-page-description'>{site.description}</Text>
        ) : null}
      </div>
      <Text type='secondary' size='small' className='status-page-updated'>
        {t('更新时间')}: {formatStatusPageTime(generatedAt, site?.timezone)}
      </Text>
    </header>
  );
};

const OverallBanner = ({ status }) => {
  const { t } = useTranslation();
  const tone = getStatusTone(status);
  const operational = status === 'operational';
  const Icon = operational ? CheckCircle2 : AlertCircle;

  return (
    <section
      className='status-page-overall'
      style={{
        borderColor: tone.border,
        background: tone.background,
        color: tone.text,
      }}
    >
      <Icon size={22} />
      <div>
        <Text strong style={{ color: tone.text }}>
          {t(getStatusLabel(status))}
        </Text>
        <div className='status-page-overall-desc'>
          {operational
            ? t('所有系统运行正常。')
            : t('部分系统正在经历服务问题。')}
        </div>
      </div>
    </section>
  );
};

const UptimeRow = ({ days }) => {
  const { t } = useTranslation();
  const visibleDays = (Array.isArray(days) ? days : []).slice(-90);

  return (
    <div>
      <div className='status-page-uptime-grid'>
        {visibleDays.map((day) => (
          <span
            key={day.date}
            className='status-page-uptime-bar'
            title={`${day.date}: ${formatUptime(day.uptime)}`}
            style={{ background: getStatusTone(day.status).bar }}
          />
        ))}
      </div>
      <div className='status-page-uptime-labels'>
        <span>{t('90 天前')}</span>
        <span>{t('今天')}</span>
      </div>
    </div>
  );
};

const ComponentList = ({ components }) => {
  const { t } = useTranslation();

  return (
    <section className='status-page-section'>
      <div className='status-page-section-title'>
        <Title heading={4}>{t('状态组件')}</Title>
        <Text type='secondary' size='small'>
          {t('90 天可用率')}
        </Text>
      </div>
      {components.length === 0 ? (
        <div className='status-page-empty'>
          <Empty description={t('暂无已发布的状态组件')} />
        </div>
      ) : (
        <div className='status-page-component-list'>
          {components.map((component) => {
            const tone = getStatusTone(component.status);
            return (
              <article key={component.id} className='status-page-component'>
                <div className='status-page-component-main'>
                  <div className='status-page-component-copy'>
                    <Text strong>{component.name}</Text>
                    {component.description ? (
                      <Text type='secondary' size='small'>
                        {component.description}
                      </Text>
                    ) : null}
                  </div>
                  <div className='status-page-component-meta'>
                    <Text strong style={{ color: tone.text }}>
                      {t(getStatusLabel(component.status))}
                    </Text>
                    <Text type='secondary'>
                      {formatUptime(component.uptime_90d)}
                    </Text>
                  </div>
                </div>
                <UptimeRow days={component.daily_uptime} />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

const IncidentUpdate = ({ update, timezone }) => {
  const { t } = useTranslation();
  const status =
    update.status === 'resolved'
      ? 'operational'
      : update.status === 'monitoring'
        ? 'degraded'
        : 'partial_outage';
  const tone = getStatusTone(status);

  return (
    <div className='status-page-incident-update'>
      <p>
        <strong style={{ color: tone.text }}>
          {t(getIncidentStatusLabel(update.status))}
        </strong>
        {' - '}
        <span>{update.message}</span>
      </p>
      <Text type='secondary' size='small'>
        {formatStatusPageTime(update.created_at, timezone)}
      </Text>
    </div>
  );
};

const IncidentsTimeline = ({ incidents, timezone }) => {
  const { t } = useTranslation();
  const grouped = useMemo(() => {
    const map = new Map();
    incidents.forEach((incident) => {
      const key = formatStatusPageDate(incident.started_at, timezone);
      map.set(key, [...(map.get(key) || []), incident]);
    });
    return Array.from(map.entries());
  }, [incidents, timezone]);

  return (
    <section className='status-page-section'>
      <div className='status-page-section-title'>
        <Title heading={4}>{t('历史事件')}</Title>
      </div>
      {incidents.length === 0 ? (
        <div className='status-page-empty'>
          <Empty description={t('暂无事件记录')} />
        </div>
      ) : (
        <div className='status-page-incidents'>
          {grouped.map(([date, group]) => (
            <div key={date} className='status-page-incident-day'>
              <Text strong type='secondary'>
                {date}
              </Text>
              {group.map((incident) => (
                <article key={incident.id} className='status-page-incident'>
                  <div className='status-page-incident-heading'>
                    <Text strong>{incident.title}</Text>
                    <Text type='secondary' size='small'>
                      {t(getIncidentImpactLabel(incident.impact))} ·{' '}
                      {formatStatusPageTime(incident.started_at, timezone)}
                    </Text>
                  </div>
                  <div className='status-page-incident-updates'>
                    {(incident.updates || []).length === 0 ? (
                      <Text type='secondary' size='small'>
                        {t('暂无更新')}
                      </Text>
                    ) : (
                      (incident.updates || []).map((update) => (
                        <IncidentUpdate
                          key={update.id}
                          update={update}
                          timezone={timezone}
                        />
                      ))
                    )}
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const StatusPage = () => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getStatusPageSummary(90);
      if (res.success) {
        setSummary(res.data);
      } else {
        setError(res.message || t('状态页加载失败，请稍后重试'));
      }
    } catch (err) {
      setError(err.message || t('状态页加载失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSummary();
    const timer = window.setInterval(loadSummary, 60000);
    return () => window.clearInterval(timer);
  }, [loadSummary]);

  return (
    <main className='status-page-public'>
      <div className='status-page-shell'>
        <Spin spinning={loading} size='large'>
          {!summary ? (
            <div className='status-page-loading'>
              {error || t('状态页加载中...')}
            </div>
          ) : (
            <>
              <StatusHeader
                site={summary.site}
                generatedAt={summary.generated_at}
              />
              <OverallBanner status={summary.overall_status} />
              <ComponentList components={summary.components || []} />
              <IncidentsTimeline
                incidents={summary.incidents || []}
                timezone={summary.site?.timezone}
              />
            </>
          )}
        </Spin>
      </div>
    </main>
  );
};

export default StatusPage;
