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

export const COMPONENT_STATUSES = [
  'operational',
  'degraded',
  'partial_outage',
  'major_outage',
  'no_data',
];

export const INCIDENT_STATUSES = [
  'investigating',
  'identified',
  'monitoring',
  'resolved',
];

export const INCIDENT_IMPACTS = ['none', 'minor', 'major', 'critical'];

export const splitLines = (value) =>
  String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

export const toLineText = (value) => (Array.isArray(value) ? value : []).join('\n');

export const DEFAULT_STATUS_PAGE_THRESHOLDS = {
  operational: 99.5,
  degraded: 95,
  partial_outage: 80,
};

export const DEFAULT_STATUS_PAGE_PROBE = {
  enabled: false,
  models: [],
};

export const formatUptime = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '0%';
  return `${numeric.toFixed(2)}%`;
};

export const formatStatusPageTime = (timestamp, timezone) => {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone || undefined,
    timeZoneName: 'short',
  }).format(new Date(timestamp * 1000));
};

export const formatStatusPageDate = (timestamp, timezone) => {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone || undefined,
  }).format(new Date(timestamp * 1000));
};

export const toLocalDateTimeInput = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const fromLocalDateTimeInput = (value) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 0;
  return Math.floor(timestamp / 1000);
};

export const getStatusLabel = (status) => {
  switch (status) {
    case 'operational':
      return '运行正常';
    case 'degraded':
      return '性能下降';
    case 'partial_outage':
      return '部分中断';
    case 'major_outage':
      return '严重中断';
    default:
      return '暂无数据';
  }
};

export const getIncidentStatusLabel = (status) => {
  switch (status) {
    case 'investigating':
      return '调查中';
    case 'identified':
      return '已定位';
    case 'monitoring':
      return '监控中';
    case 'resolved':
      return '已解决';
    default:
      return '调查中';
  }
};

export const getIncidentImpactLabel = (impact) => {
  switch (impact) {
    case 'none':
      return '无影响';
    case 'minor':
      return '轻微';
    case 'major':
      return '重大';
    case 'critical':
      return '严重';
    default:
      return '轻微';
  }
};

export const getStatusTone = (status) => {
  switch (status) {
    case 'operational':
      return {
        text: '#14883e',
        background: '#e9f8ee',
        border: '#b8e9c7',
        bar: '#19a657',
        tag: 'green',
      };
    case 'degraded':
    case 'partial_outage':
      return {
        text: '#b56519',
        background: '#fff1dc',
        border: '#f3c37a',
        bar: '#d98628',
        tag: 'amber',
      };
    case 'major_outage':
      return {
        text: '#b3261e',
        background: '#fde7e4',
        border: '#f1aaa2',
        bar: '#d33f32',
        tag: 'red',
      };
    default:
      return {
        text: '#87867f',
        background: '#f0eee6',
        border: '#dedcd1',
        bar: '#d1cec3',
        tag: 'grey',
      };
  }
};

export const parseBindings = (component) => {
  try {
    const parsed =
      typeof component?.bindings === 'string'
        ? JSON.parse(component.bindings || '{}')
        : component?.bindings || {};
    return {
      models: Array.isArray(parsed.models) ? parsed.models : [],
      channel_ids: Array.isArray(parsed.channel_ids)
        ? parsed.channel_ids.map(Number).filter(Boolean)
        : [],
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
      thresholds: normalizeThresholds(parsed.thresholds),
      probe: {
        enabled: parsed.probe?.enabled === true,
        models: Array.isArray(parsed.probe?.models) ? parsed.probe.models : [],
      },
    };
  } catch (error) {
    return {
      models: [],
      channel_ids: [],
      groups: [],
      thresholds: { ...DEFAULT_STATUS_PAGE_THRESHOLDS },
      probe: { ...DEFAULT_STATUS_PAGE_PROBE },
    };
  }
};

export const normalizeThresholds = (thresholds) => {
  const next = {
    operational: Number(thresholds?.operational),
    degraded: Number(thresholds?.degraded),
    partial_outage: Number(thresholds?.partial_outage),
  };
  if (
    !Number.isFinite(next.operational) ||
    !Number.isFinite(next.degraded) ||
    !Number.isFinite(next.partial_outage) ||
    next.operational <= 0 ||
    next.operational > 100 ||
    next.degraded <= 0 ||
    next.partial_outage < 0 ||
    next.operational <= next.degraded ||
    next.degraded <= next.partial_outage
  ) {
    return { ...DEFAULT_STATUS_PAGE_THRESHOLDS };
  }
  return next;
};

export const normalizeProbe = (probe) => ({
  enabled: probe?.enabled === true,
  models: Array.isArray(probe?.models) ? probe.models.filter(Boolean) : [],
});

export const componentToForm = (component) => {
  const bindings = parseBindings(component);
  return {
    name: component.name || '',
    description: component.description || '',
    status: component.status || 'no_data',
    enabled: component.enabled !== false,
    sort_order: Number(component.sort_order || 0),
    models: bindings.models,
    channelIds: bindings.channel_ids,
    groups: bindings.groups,
    thresholds: normalizeThresholds(bindings.thresholds),
    probe: normalizeProbe(bindings.probe),
  };
};

export const componentFormToPayload = (form) => ({
  name: String(form.name || '').trim(),
  description: String(form.description || '').trim(),
  status: form.status || 'no_data',
  enabled: form.enabled !== false,
  sort_order: Number(form.sort_order || 0),
  bindings: {
    models: Array.isArray(form.models) ? form.models : splitLines(form.modelsText),
    channel_ids: Array.isArray(form.channelIds) ? form.channelIds : [],
    groups: Array.isArray(form.groups) ? form.groups : [],
    thresholds: normalizeThresholds(form.thresholds),
    probe: normalizeProbe(form.probe),
  },
});

export const incidentToForm = (incident) => ({
  title: incident.title || '',
  impact: incident.impact || 'minor',
  status: incident.status || 'investigating',
  componentIds: Array.isArray(incident.component_ids)
    ? incident.component_ids
    : [],
  startedAt: toLocalDateTimeInput(incident.started_at),
});

export const incidentFormToPayload = (form) => ({
  title: String(form.title || '').trim(),
  impact: form.impact || 'minor',
  status: form.status || 'investigating',
  component_ids: Array.isArray(form.componentIds) ? form.componentIds : [],
  started_at: fromLocalDateTimeInput(form.startedAt),
});
