# Terra Meta Frontend

React + Vite + OpenLayers frontend for the Terra Meta mineral intelligence platform.

**Production URLs**
- Site: https://terrameta.5ggeology.com
- API: https://api.terrameta.5ggeology.com/api/v1

## Quick start (development)

```bash
chmod +x start.sh
./start.sh
```

Open http://localhost:3085

## Demo login (development)

After running `python manage.py seed_data` in `tm-backend`:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@5ggeology.com` | `admin123` |
| Free | `testfree@5ggeology.com` | `test123` |
| Paid | `testpaid@5ggeology.com` | `test123` |
| Manager | `testmanager@5ggeology.com` | `test123` |

## Production deploy (PM2)

```bash
chmod +x deploy.sh
./deploy.sh
```

Builds the app with `VITE_API_URL=https://api.terrameta.5ggeology.com/api/v1` and serves via PM2 (`terra-meta-frontend` on port 3085). Point nginx/caddy at that port for https://terrameta.5ggeology.com.

```bash
pm2 status
pm2 logs terra-meta-frontend
```

## Manual build

```bash
VITE_API_URL=https://api.terrameta.5ggeology.com/api/v1 npm run build
npm run preview -- --host 0.0.0.0 --port 3085
```
