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

import { API } from '../../helpers';

export const getStatusPageSummary = async (days = 90) => {
  const res = await API.get('/api/status-page/summary', {
    params: { days },
    disableDuplicate: true,
  });
  return res.data;
};

export const getStatusPageComponents = async () => {
  const res = await API.get('/api/status-page/admin/components', {
    disableDuplicate: true,
  });
  return res.data;
};

export const getStatusPageModelOptions = async (group, days = 90) => {
  const res = await API.get('/api/status-page/admin/model-options', {
    params: { group, days },
    disableDuplicate: true,
  });
  return res.data;
};

export const createStatusPageComponent = async (payload) => {
  const res = await API.post('/api/status-page/admin/components', payload);
  return res.data;
};

export const updateStatusPageComponent = async (id, payload) => {
  const res = await API.put(`/api/status-page/admin/components/${id}`, payload);
  return res.data;
};

export const deleteStatusPageComponent = async (id) => {
  const res = await API.delete(`/api/status-page/admin/components/${id}`);
  return res.data;
};

export const reorderStatusPageComponents = async (ids) => {
  const res = await API.post('/api/status-page/admin/components/reorder', {
    ids,
  });
  return res.data;
};

export const getStatusPageIncidents = async (status = 'all') => {
  const res = await API.get('/api/status-page/admin/incidents', {
    params: { status, page_size: 100 },
    disableDuplicate: true,
  });
  return res.data;
};

export const createStatusPageIncident = async (payload) => {
  const res = await API.post('/api/status-page/admin/incidents', payload);
  return res.data;
};

export const updateStatusPageIncident = async (id, payload) => {
  const res = await API.put(`/api/status-page/admin/incidents/${id}`, payload);
  return res.data;
};

export const deleteStatusPageIncident = async (id) => {
  const res = await API.delete(`/api/status-page/admin/incidents/${id}`);
  return res.data;
};

export const createStatusPageIncidentUpdate = async (id, payload) => {
  const res = await API.post(
    `/api/status-page/admin/incidents/${id}/updates`,
    payload,
  );
  return res.data;
};

export const resolveStatusPageIncident = async (id) => {
  const res = await API.post(`/api/status-page/admin/incidents/${id}/resolve`);
  return res.data;
};
