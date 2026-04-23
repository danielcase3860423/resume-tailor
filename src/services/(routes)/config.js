const normalizeBaseDomain = (value) => (typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '');

const baseDomain = normalizeBaseDomain(process.env.NEXT_PUBLIC_BASE_DOMAIN);

const config = {
  baseUrl: baseDomain ? `${baseDomain}/` : '/',
  baseApiUrl: baseDomain ? `${baseDomain}/api/` : '/api/'
};

export default config;
