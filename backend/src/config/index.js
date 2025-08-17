// Simple config with sensible defaults. Does not exit on missing envs.
const DEFAULTS = {
  PORT: 3000,
  DEFAULT_RADIUS_MILES: 10,
  MAX_RADIUS_MILES: 40,
  CACHE_TTL_SECONDS: 60,
};

const config = {
  PORT: Number(process.env.PORT ?? DEFAULTS.PORT),
  DEFAULT_RADIUS_MILES: Number(process.env.DEFAULT_RADIUS_MILES ?? DEFAULTS.DEFAULT_RADIUS_MILES),
  MAX_RADIUS_MILES: Number(process.env.MAX_RADIUS_MILES ?? DEFAULTS.MAX_RADIUS_MILES),
  CACHE_TTL_SECONDS: Number(process.env.CACHE_TTL_SECONDS ?? DEFAULTS.CACHE_TTL_SECONDS),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || null,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

const validateEnv = () => {
  const warnings = [];
  if (!config.OPENAI_API_KEY) warnings.push('OPENAI_API_KEY not set - using fallback replies');
  if (warnings.length) warnings.forEach((w) => console.warn('⚠️', w));
};

export { config, validateEnv };
