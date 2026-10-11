# Thesis_Careera

A student-centered career guidance web application designed to help users explore career paths, complete assessments, and discover job opportunities that match their interests and skills.

## Overview

Thesis_Careera combines a React frontend with an Express backend and a Prisma/PostgreSQL database to deliver a prototype career platform. The app allows users to:

- create an account and log in securely
- complete a short career assessment
- browse personalized career recommendations
- explore live job listings from the Jobicy API
- save favorite jobs for later review
- view their profile and saved opportunities
- manage student accounts through admin-only developer tools

## Tech Stack

- Frontend: React + Vite
- Routing: React Router
- Backend: Express.js
- Database: PostgreSQL via Prisma ORM
- Authentication: bcryptjs and signed bearer tokens for admin APIs
- API integration: Jobicy remote jobs API

## Project Structure

```bash
Thesis_Careera/
├── README.md
├── package.json
├── thesis-system/
│   ├── backend/
│   │   ├── lib/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── App.jsx
│   │   │   └── main.jsx
│   │   ├── index.html
│   │   └── vite.config.js
│   ├── package.json
│   └── README.md
└── ...
```

## Prerequisites

Before running the project, make sure you have:

- Node.js 18 or newer
- npm
- PostgreSQL database or a Neon/Postgres-compatible database
- A `.env.local` file in the `thesis-system` folder

## Environment Setup

Create a file named `.env.local` inside `thesis-system` with your database URL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
AUTH_TOKEN_SECRET="replace-with-a-long-random-secret"
```

If you are using Neon or another managed Postgres service, paste the connection string supplied by that platform.
Keep `AUTH_TOKEN_SECRET` private and stable across backend restarts and application instances.

## Installation

From the project root, go into the app folder and install dependencies:

```bash
cd thesis-system
npm install
```

Then generate the Prisma client and apply the database schema:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

If the database already has the schema applied, you can run:

```bash
npx prisma migrate deploy
```

The admin and bulk-import feature requires the latest Prisma migration before starting the backend.
Student ID and camera verification also require the InsightFace API described below.

## Running the Application

On Windows, after configuring `thesis-system/.env.local`, run `run-system.bat` from
the repository folder. It installs missing Node.js dependencies, generates the
Prisma client only when missing or older than the Prisma schema, prepares the
InsightFace Python environment, and opens a separate console window for each of
the frontend, backend, and InsightFace API. Service output and
errors are not redirected: frontend/Vite output appears in the frontend window,
backend diagnostics appear in the backend window, and Python/InsightFace output
appears in the InsightFace window. Close each service window or press Ctrl+C in it
to stop that service. If a healthy InsightFace API is already running on port 8000,
the launcher reuses it instead of opening a duplicate. Database migrations are not
applied by `run-system.bat`.

To apply committed pending migrations before starting the same three services, run
`run-system-with-migration.bat`. It runs `npx prisma migrate deploy` from
`thesis-system` and does not start the services if migration fails. Verification
API failures and rejected name, student-ID, or face comparisons are printed in the
backend console and appended as JSON lines to
`thesis-system/verification-errors.log`.
If Prisma Client generation fails with a Windows `EPERM` rename error, stop any
already-running backend and rerun the launcher so no process holds the query
engine DLL open.

Start the backend authentication API:

```bash
npm run server
```

This serves the API on:

- http://127.0.0.1:3001
- health endpoint: http://127.0.0.1:3001/health

Start the frontend development server:

```bash
npm run dev
```

Then open the app in your browser at:

- http://localhost:5173

The Vite server is configured to proxy API requests such as `/api/register` and `/api/login` to the backend server.

### Student ID and face verification

The backend calls a private Python API for OCR and InsightFace embeddings. The service
processes the uploaded ID and live camera image without saving either image or its face
vector. Face vectors remain in backend memory for up to five minutes and are discarded
after a successful camera check. Both verification steps must reach the same Node.js
backend process; use a shared short-lived store if deploying multiple backend instances.

Add a shared secret to `thesis-system/.env.local`:

```env
INSIGHTFACE_API_URL="http://127.0.0.1:8000"
INSIGHTFACE_API_KEY="replace-with-a-long-random-secret"
```

In a separate terminal, from the project root, start the Python service (Python 3.10
or 3.11 required):

```bash
cd thesis-system/backend/insightface_api
# Windows: select a supported Python version explicitly
py -3.11 -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Use `py -3.10` instead if Python 3.11 is not installed. Avoid Python 3.13 for this
service: compatible NumPy wheels are unavailable, which can make pip try to compile
NumPy and fail without a native C/C++ build toolchain. The Windows `run-system.bat`
launcher selects Python 3.11 first, then 3.10. If it reports that an existing `.venv`
uses another version, remove `thesis-system\backend\insightface_api\.venv` and run the
launcher again.

On Windows, installing `insightface==0.7.3` also builds a native extension. If pip
reports that Microsoft Visual C++ 14.0 or greater is required, install Visual Studio
Build Tools with the **Desktop development with C++** workload, then rerun
`run-system.bat`. The Python environment can remain on Python 3.10 or 3.11.

The API reads `INSIGHTFACE_API_KEY` from `thesis-system/.env.local`. InsightFace and
EasyOCR download their model weights on first startup. Start this service before using
either verification step. OCR limits its processing canvas to 1280 pixels to reduce
CPU memory use on large ID images.

## Useful Scripts

```bash
npm run dev        # start the Vite frontend
npm run build      # create a production build
npm run preview    # preview the production build locally
npm run server     # start the Express backend
npm run lint       # run ESLint checks
```

## Authentication API

The backend exposes the following endpoints:

- `POST /api/register` — start a pending registration after matching the submitted full name and student ID against the student record; credentials are saved only after ID and camera verification pass
- `POST /api/login` — validate user credentials
- `GET /api/admin/users` — list user names, student IDs, and emails (admin token required)
- `POST /api/admin/users/import` — bulk-create password-pending accounts (admin token required)

Request body examples:

```json
{
  "fullName": "Jane Doe",
  "studentId": "PDM-2026-123456",
  "email": "jane@example.com",
  "password": "securepassword"
}
```

```json
{
  "email": "jane@example.com",
  "password": "securepassword"
}
```

Students must upload a student ID matching their name and student ID, then pass a live face comparison before the account is created and they can reach the home page. Pending registration details are held in backend memory for up to 15 minutes; the ID face vector is held for up to five minutes.

## Main Features

### Career Assessment
Users answer a short set of questions about their interests, preferred work style, and skills. Their responses contribute to the career guidance flow.

### Job Dashboard
The home page loads live jobs from the Jobicy API and allows users to:

- search for job titles or skills
- view recommended roles
- open detailed job information
- save jobs to a personal list

### Saved Jobs
Saved opportunities are stored locally for the current account and can be revisited from the saved page.

### Profile and Navigation
The app includes profile and navigation pages to support the overall student career portal experience.

### Admin Developer Tools
Users whose `is_admin` value is true see **Developer Tools** under Help. The page lists user names, student IDs, and emails, and can export the table to Excel. Admins can also import `.xlsx` files with `name`, `student_id`, and `email` columns; only `student_id` is required. New imported records have no name, email, or password until the student registers using their imported student ID and chooses their own name, email, and password. Existing users are skipped, and duplicate rows in an upload are rejected.

## Notes

This is a prototype application, so some sections are still designed as UI placeholders and may evolve as the project grows. The backend currently focuses on authentication and user registration/login, while the frontend provides a richer experience around career matching and job browsing.

## License

This project is currently for academic/thesis use. Add a license if you plan to share or distribute it publicly.
