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

export const DEFAULT_PERF_METRICS_SETTING = {
  'perf_metrics_setting.enabled': true,
  'perf_metrics_setting.flush_interval': 5,
  'perf_metrics_setting.bucket_time': 'hour',
  'perf_metrics_setting.retention_days': 0,
};

const asNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const formatLatencyMs = (value) => {
  const numeric = asNumber(value);
  if (numeric <= 0) return '-';
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(2)}s`;
  return `${Math.round(numeric)}ms`;
};

export const formatTps = (value) => {
  const numeric = asNumber(value);
  if (numeric <= 0) return '-';
  return `${numeric.toFixed(numeric >= 10 ? 1 : 2)}/s`;
};

export const formatSuccessRate = (value) => {
  const numeric = asNumber(value);
  if (numeric <= 0) return '-';
  return `${numeric.toFixed(2)}%`;
};

export const getSuccessRateColor = (value) => {
  const numeric = asNumber(value);
  if (numeric >= 99) return 'green';
  if (numeric >= 95) return 'lime';
  if (numeric >= 90) return 'orange';
  return 'red';
};

export const getLatencyColor = (value) => {
  const numeric = asNumber(value);
  if (numeric <= 0) return 'grey';
  if (numeric <= 1000) return 'green';
  if (numeric <= 3000) return 'orange';
  return 'red';
};

export const normalizePerfMetricSummary = (model) => ({
  model_name: model?.model_name || '',
  avg_latency_ms: asNumber(model?.avg_latency_ms),
  success_rate: asNumber(model?.success_rate),
  avg_tps: asNumber(model?.avg_tps),
});

export const buildPerfMetricsMap = (models) => {
  const result = {};
  if (!Array.isArray(models)) return result;
  models.forEach((model) => {
    const normalized = normalizePerfMetricSummary(model);
    if (normalized.model_name) {
      result[normalized.model_name] = normalized;
    }
  });
  return result;
};

export const summarizePerfMetricModels = (models) => {
  const list = Array.isArray(models) ? models.map(normalizePerfMetricSummary) : [];
  const active = list.filter((model) => model.avg_latency_ms > 0 || model.success_rate > 0);
  if (active.length === 0) {
    return {
      modelCount: 0,
      avgLatencyMs: 0,
      avgSuccessRate: 0,
      avgTps: 0,
      fastestModel: null,
      topThroughputModel: null,
      models: [],
    };
  }

  const avgLatencyMs =
    active.reduce((sum, model) => sum + model.avg_latency_ms, 0) / active.length;
  const avgSuccessRate =
    active.reduce((sum, model) => sum + model.success_rate, 0) / active.length;
  const avgTps = active.reduce((sum, model) => sum + model.avg_tps, 0) / active.length;
  const fastestModel = [...active]
    .filter((model) => model.avg_latency_ms > 0)
    .sort((a, b) => a.avg_latency_ms - b.avg_latency_ms)[0];
  const topThroughputModel = [...active]
    .filter((model) => model.avg_tps > 0)
    .sort((a, b) => b.avg_tps - a.avg_tps)[0];

  return {
    modelCount: active.length,
    avgLatencyMs,
    avgSuccessRate,
    avgTps,
    fastestModel: fastestModel || null,
    topThroughputModel: topThroughputModel || null,
    models: active,
  };
};
