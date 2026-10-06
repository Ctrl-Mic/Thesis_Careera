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

## Tech Stack

- Frontend: React + Vite
- Routing: React Router
- Backend: Express.js
- Database: PostgreSQL via Prisma ORM
- Authentication: bcryptjs
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
```

If you are using Neon or another managed Postgres service, paste the connection string supplied by that platform.

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

## Running the Application

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

- `POST /api/register` — create a new user account
- `POST /api/login` — validate user credentials

Request body examples:

```json
{
  "fullName": "Jane Doe",
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

## Notes

This is a prototype application, so some sections are still designed as UI placeholders and may evolve as the project grows. The backend currently focuses on authentication and user registration/login, while the frontend provides a richer experience around career matching and job browsing.

## License

This project is currently for academic/thesis use. Add a license if you plan to share or distribute it publicly.
