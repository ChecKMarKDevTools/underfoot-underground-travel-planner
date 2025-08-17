import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.raw.headers.authorization',
      'req.raw.headers.cookie',
      'req.query.password',
      'req.query.token',
      'req.query.api_key',
      'req.query.client_secret',
      'res.headers.set-cookie',
    ],
    censor: '[REDACTED]',
  },
});

const sanitizeShort = (s = '') => {
  const MAX = 200;
  const cleaned = String(s)
    .replace(/[\r\n\t\0\v\f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > MAX ? cleaned.slice(0, MAX) + '...' : cleaned;
};

export default pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || undefined,
  customLogLevel: (res, err) =>
    res.statusCode >= 500 || err ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
  serializers: {
    req: (req) => ({
      method: req.method,
      url: sanitizeShort(req.url),
      headers: { host: req.headers && req.headers.host },
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
