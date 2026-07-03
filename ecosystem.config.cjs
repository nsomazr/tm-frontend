/** @type {import('pm2').StartOptions} */
const path = require('path')

const ROOT = __dirname
const PORT = process.env.FRONTEND_PORT || 3085

module.exports = {
  apps: [
    {
      name: 'terra-meta-frontend',
      cwd: ROOT,
      script: 'npm',
      args: `run preview -- --host 0.0.0.0 --port ${PORT}`,
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
}
