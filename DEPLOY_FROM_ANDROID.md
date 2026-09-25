# KachePai — Android-only deployment checklist

## 1) Create a GitHub repository
Upload this entire project to a new GitHub repository.

## 2) Create Render services
Render can deploy a Node/Express backend as a Web Service and static HTML/CSS/JS as a Static Site.

Use the included `render.yaml` as the blueprint.

Backend:
- Root Directory: `backend`
- Build: `npm install && npx prisma generate && npx prisma migrate deploy`
- Start: `npm start`
- Environment variables:
  - DATABASE_URL
  - JWT_SECRET
  - CORS_ORIGIN

Frontend:
- Static Site
- Publish directory: `.`
- After backend gets its public URL, edit `api-config.js`:
  `window.KACHEPAI_API = { API_BASE: "https://YOUR-API-URL" };`

## 3) Database
Create a PostgreSQL database and copy its connection string into `DATABASE_URL`.

## 4) Security
Do not upload `.env` or passwords to GitHub.
Change the seed/demo owner password before any real use.
Use a long random JWT_SECRET.

## 5) Current limitation
I cannot click Deploy inside your personal GitHub/Render accounts without you connecting/authorizing those accounts. The project is prepared so the remaining action is account authorization + environment values.
