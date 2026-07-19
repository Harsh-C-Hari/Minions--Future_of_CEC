# Future of CEC

> **Team Name:** Minions

A unified Smart Campus platform for the **College of Engineering Chengannur (CEC)** that combines secure student authentication with an AI-powered campus assistant to improve the overall student experience ,an automated elevator access managment and an admin dashboard.

---

# Problem Statement

## 04. Fragmented Student Experience in Higher Education

Modern higher education institutions require students to navigate a web of disconnected platforms and physical service counters for course registration, administrative grievances, hostel facilities, mental health support, and career placement, each operating in isolation. This fragmentation creates administrative friction, increases academic anxiety, and leaves critical student needs unmet at the moments when timely institutional support could make the greatest difference.

---

# Project Description

**Future of CEC** is a unified Smart Campus platform designed for the **College of Engineering Chengannur (CEC)** that brings multiple student services into a single modern interface.

Instead of requiring students to navigate multiple disconnected systems, Minions provides a centralized portal where students can securely sign in using their institutional Google account and access an AI-powered campus assistant integrated directly into the college website.

The AI assistant helps students with:

- Academic guidance
- College information
- Campus navigation
- Programming and technical assistance
- Student support workflows
- General college-related queries

The backend uses a local **Gemma 4 e2b** large language model running through **Ollama**, allowing the chatbot to operate with institution-specific knowledge while keeping the architecture modular and privacy-friendly.

The project also has a automated elevator access request system with an admin dashboard system.

---

# Google AI Usage

## Tools / Models Used

### Google AI

- Gemma 4 e2b (running locally via Ollama)

### AI Development Tools

- Claude
- ChatGPT
- Antigravity

---

# Tech Stack Used

## Frontend

- HTML5
- CSS3
- JavaScript

## Backend

- Node.js
- Express.js
- Python
- FastAPI

## Database

- PostgreSQL (Supabase)
- Prisma ORM

## AI

- Gemma 4 e2b
- Ollama

## Authentication

- Google Identity Services
- JWT Authentication

## Version Control

- Git
- GitHub

---

## How Google AI Was Used

Google's **Gemma 4 e2b** model powers the Smart Campus AI assistant.

The model runs locally using **Ollama** and is integrated into the website through a FastAPI-based AI service. Student queries are securely routed from the frontend to the Express backend, which communicates with the AI service before returning responses to users.

The assistant uses prompt engineering, institution-specific knowledge files, and workflow rules to provide contextual responses for academic guidance, campus navigation, programming assistance, and general college-related queries while maintaining privacy through local inference.

---

# GitHub Repository

**Project:** Future of CEC

**Team:** Minions

Repository:
https://github.com/Jo-ohan/Minions-Future_of_CEC

---

# Proof of Google AI Usage

Proof of Google AI usage will be included in the `/proofs` directory.

---

# Screenshots

Project screenshots will be included in the `/screenshots` directory.

---

# Demo Video

Demo video (maximum 3 minutes):

**Link:** *(To be added)*

---

# Installation Steps

## 1. Clone the Repository

```bash
git clone https://github.com/Jo-ohan/Minions-Future_of_CEC.git
cd Minions-Future_of_CEC
```

## 2. Backend + AI Service

```bash
cd backend
npm install
cp .env.example .env    # fill in DATABASE_URL, JWT secrets, GOOGLE_CLIENT_ID, etc.

# Optional (development only)
# DEV_ADMIN_EMAIL=your_email@gmail.com
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run ai:install      # first time only (Python deps for ai-service)
npm run dev:all         # runs the Express API (:5000) and ai-service (:8000) together
```

The AI service requires a local **Ollama** installation with the configured **Gemma 4 e2b** model downloaded.

---

## 3. Frontend

```bash
cd frontend
python3 -m http.server 5500
```

Open:

```
http://localhost:5500
```

Visit:

```
http://localhost:5500/
```

**Student Portal**

```
http://localhost:5500/student-portal/index.html
```

for the dedicated Student Portal.

The Elevator Management module can be accessed directly during development:

**Student Dashboard**

```
http://localhost:5500/elevator/
```

**Admin Dashboard**

```
http://localhost:5500/elevator/admin/
```

> **Note:** The Elevator module is currently accessed directly via URL and is not linked from the public website navigation.

for the dedicated Student Portal.

---

# Project Structure

```
frontend/     Static college website + Student Portal + AI Chat
backend/      Express API + Authentication + AI Proxy
backend/
└── ai-service/
    ├── FastAPI
    ├── Prompt System
    ├── Gemma 4 Integration
    └── Ollama
```

---

# How It Fits Together

```
 Browser
     │
     ▼
 Student Portal
     │
     ▼
Express Backend (Node.js)
     │
     ▼
FastAPI AI Service (Python)
     │
     ▼
Ollama
     │
     ▼
Gemma 4 e2b
```

The frontend never communicates directly with the AI service. All requests pass securely through the Express backend before being forwarded to the FastAPI service and finally to the locally hosted Gemma model.

---

# Google OAuth Setup

1. Create a **Google OAuth 2.0 Client ID** in Google Cloud Console.
2. Add your frontend URL under **Authorized JavaScript Origins**.
3. Add the client ID to:

- `backend/.env`
- `frontend/assets/portal/portal-config.js`

4. Authentication is restricted to institutional email addresses (`@ceconline.edu`).

---

---

# Development Admin Setup

For local development and testing, the backend supports an optional **development-only admin override**.

Add the following variable to `backend/.env`:

```env
DEV_ADMIN_EMAIL="your_email@gmail.com"
```

When:

- `NODE_ENV=development`
- The signed-in Google account matches `DEV_ADMIN_EMAIL`

that account will:

- Bypass the `ALLOWED_EMAIL_DOMAIN` restriction.
- Automatically receive the `ADMIN` role.
- Authenticate using the normal Google OAuth and JWT flow.

To access the Elevator Management dashboards after signing in:

**Student Dashboard**

```
http://localhost:5500/elevator/
```

**Admin Dashboard**

```
http://localhost:5500/elevator/admin/
```

> **Note:** The Elevator Management pages are currently intended for direct URL access during development and are not exposed through the public website navigation.

> **Note:** This development admin override is ignored completely outside `NODE_ENV=development` and should **not** be configured in staging or production environments.

---

# Repository Layout

| Path | Description |
|------|-------------|
| `frontend/index.html` | Redesigned homepage |
| `frontend/student-portal/` | Student Portal |
| `frontend/assets/portal/` | Login widget and AI chat |
| `backend/src/` | Express API |
| `backend/ai-service/` | FastAPI AI service |
| `backend/src/prisma/schema.prisma` | PostgreSQL database schema |

---

# Notes

- `backend/.env` and `backend/ai-service/.env` are excluded from version control.
- Only `.env.example` files should be committed.
- The project uses local AI inference through **Gemma 4 e2b** running on **Ollama**.
- The frontend is based on a static mirror of the official college website with a newly developed Student Portal and AI assistant integrated into it.
