# Koseli Xpress

Premium e-commerce gift platform for Nepal — React frontend, Express backend, MongoDB database.

## Project Structure

```
Project/
├── frontend/          React + Vite + Tailwind CSS
├── backend/           Express API + MongoDB (Mongoose)
└── .env               Environment variables (MongoDB, admin, API keys)
```

## Prerequisites

- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```
   Set `MONGODB_URI` and change `VITE_ADMIN_EMAIL` / `VITE_ADMIN_PASSWORD`.

3. Start MongoDB (local):
   ```bash
   mongod
   ```

4. Run the app:
   ```bash
   npm run dev
   ```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Admin login: credentials from `VITE_ADMIN_EMAIL` / `VITE_ADMIN_PASSWORD` in `.env`

## Adding Products

All catalog data is managed from the **Admin Panel** — no demo products are pre-loaded. Log in as admin, then use **Products** and **Categories** tabs to build your store.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend |
| `npm run dev:backend` | Backend only (port 3001) |
| `npm run dev:frontend` | Frontend only (port 3000) |
| `npm run build` | Build both |
| `npm run start` | Production backend |

## Environment Variables

See `.env.example` for all options. Key variables:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `GEMINI_API_KEY` | Google Gemini AI key |
| `VITE_ADMIN_EMAIL` | Default admin email |
| `VITE_ADMIN_PASSWORD` | Default admin password |

## Tailwind CSS

Configured in `frontend/` via `@tailwindcss/vite` and `frontend/src/index.css`.
