export const HEADER_NAV_DEFAULT = {
  home: true,
  console: true,
  pricing: {
    enabled: true,
    requireAuth: false,
  },
  rankings: {
    enabled: true,
    requireAuth: false,
  },
  status: true,
  docs: true,
  about: true,
};

const cloneDefaultHeaderNav = () => ({
  ...HEADER_NAV_DEFAULT,
  pricing: { ...HEADER_NAV_DEFAULT.pricing },
  rankings: { ...HEADER_NAV_DEFAULT.rankings },
});

const parseBool = (value, fallback) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return fallback;
};

const normalizeAuthModule = (raw, fallback) => {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return {
      enabled: parseBool(raw.enabled, fallback.enabled),
      requireAuth: parseBool(raw.requireAuth, fallback.requireAuth),
    };
  }
  return {
    enabled: parseBool(raw, fallback.enabled),
    requireAuth: fallback.requireAuth,
  };
};

export function normalizeHeaderNavModules(value) {
  const base = cloneDefaultHeaderNav();
  if (!value) return base;

  let parsed = value;
  if (typeof value === 'string') {
    if (!value.trim()) return base;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      return base;
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return base;
  }

  const result = {
    ...base,
    pricing: { ...base.pricing },
    rankings: { ...base.rankings },
  };

  Object.entries(parsed).forEach(([key, raw]) => {
    if (key === 'pricing' || key === 'rankings') {
      result[key] = normalizeAuthModule(raw, base[key]);
      return;
    }
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      result[key] = raw;
      return;
    }
    result[key] = parseBool(raw, base[key] ?? true);
  });

  return result;
}

export function isHeaderNavModuleEnabled(modules, moduleKey) {
  const normalized = normalizeHeaderNavModules(modules);
  const moduleConfig = normalized[moduleKey];
  if (moduleConfig && typeof moduleConfig === 'object') {
    return moduleConfig.enabled !== false;
  }
  return moduleConfig !== false;
}

export function getHeaderNavModuleRequireAuth(modules, moduleKey) {
  const normalized = normalizeHeaderNavModules(modules);
  const moduleConfig = normalized[moduleKey];
  return Boolean(
    moduleConfig &&
    typeof moduleConfig === 'object' &&
    moduleConfig.requireAuth === true,
  );
}
