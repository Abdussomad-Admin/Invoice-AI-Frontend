# Invoice AI frontend

React + Vite frontend for the Invoice AI API.

## Run locally

```powershell
npm install
npm run dev
```

The frontend uses the hosted API in both development and production:

`https://invoiceaibackend-yk9n.onrender.com`

During local development, Vite proxies `/api` calls to the hosted backend. Production builds call the hosted API directly. Set `VITE_SERVER_API_BASE_URL` only if you need to change that API address. The hosted API's `Cors__AllowedOrigins__0` setting must include the deployed frontend origin for production browser requests; this CORS setting is managed on the backend host.
