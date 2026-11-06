export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  env: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

