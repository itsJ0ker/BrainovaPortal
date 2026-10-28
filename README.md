<div align="center">

<img src="public/logobrainova.png" alt="Brainova Olympiad Logo" width="140" height="140" style="border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);" />

# 🌟 Brainova Olympiad

### Enterprise Multi-Tenant Assessment & Olympiad Examination SaaS Platform

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Vitest](https://img.shields.io/badge/Vitest-46%20Passed-green?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A high-performance, production-ready assessment and Olympiad examination platform built for school districts, institutional consortiums, and national academic contests. Engineered with strict institutional data isolation, client-less student verification, live proctor invigilation, server-authoritative anti-cheating enforcement, and tamper-proof automated credential issuance.

[Key Features](#-key-features) • [Architecture](#-architecture--data-flow) • [Portals](#-portal-ecosystem) • [Quick Start](#-quick-start) • [Bot Testing Suite](#-bot-testing-team--security-audit) • [Deployment](#-production-deployment)

</div>

---

## 🚀 Key Features

### 🏛️ 1. Complete Multi-Tenant Institutional Isolation
- **Tenant Boundaries**: Every collection (`Student`, `Exam`, `ExamAttempt`, `Academic`, `QuestionBank`, `AuditLog`) is partitioned strictly by `schoolId`.
- **Compound Uniqueness**: Roll numbers and admission IDs are unique per school, allowing multiple independent schools to maintain separate registries.
- **Tenant Safeguards**: Server-side checks (`requireSchoolAccess`) prevent cross-tenant enumeration, data scraping, and unauthorized mutations with HTTP 403 enforcement.

### 🎓 2. Zero-Account Student Verification (`/portal`)
- **Frictionless Candidate Entry**: Students do not need to create accounts or manage passwords. Authentication validates instantly against institutional rosters via **Roll Number**, **Admission Number**, or **Registered Email**.
- **Stateless Cryptographic Sessions**: Issues signed HMAC-SHA256 JWT tokens containing `attemptId`, `studentId`, `schoolId`, and an immutable `serverDeadline`.
- **Session Resumption**: Disconnections or accidental refreshes automatically recover in-progress tests (`isResuming: true`) with zero response loss.

### 📡 3. Live Invigilation Dashboard (`/school/[slug]/exams/[id]/invigilation`)
- **Real-Time Proctor Feed**: Aggregates live candidate heartbeats, answered question tallies, time remaining, and integrity flags.
- **Proctor Interventions**:
  - ⏱️ **Time Extension**: Add +5m, +10m, or +15m directly to a candidate's authoritative server deadline.
  - 🔄 **Violation Reset**: Clear false-positive warnings and return flagged candidates to active status.
  - 🛑 **Force Submission**: Instantly finalize and auto-evaluate attempts for disqualified candidates.
  - 🚩 **Manual Flagging**: Mark suspicious candidate sessions for manual post-exam review.

### 📜 4. Automated Certificate Generation (`/portal/certificate/[attemptId]`)
- **Merit Tiers**: Automatically assigns honors based on final score percentage:
  - 🥇 **$\ge 90\%$**: *Certificate of Distinction (Gold Honor Roll)*
  - 🥈 **$\ge 75\%$**: *Certificate of Excellence (Silver Tier)*
  - 🥉 **$\ge 60\%$**: *Certificate of Merit (Bronze Tier)*
  - 🎖️ **$\ge 40\%$**: *Certificate of Achievement*
  - 🏅 **$< 40\%$**: *Certificate of Participation*
- **Tamper-Evident Security**: Binds every certificate to a 16-character SHA-256 cryptographic verification hash (`BO-2026-<EXAM>-<HASH>`).
- **Publication Guard**: Certificates are withheld until official results are published by school administrators.
- **Print & PDF Optimization**: Clean print stylesheets formatted for landscape certification card stock.

### 📊 5. Candidate Test History & Scorecards (`/portal`, `/portal/results`)
- **Comprehensive Scorecards**: Displays total marks, percentage, sectional scores, MCQ breakdown, and individual question feedback.
- **Answer Secrecy Shield**: Protects correct answers, explanations, and rubrics until the administrator officially publishes examination results.
- **Performance Analytics**: Aggregates overall average percentage, pass rate, and exams completed for each student.

### 🛡️ 6. Multi-Layered Anti-Cheating Engine
- **Client Deterrence**: Intercepts tab switching, window focus loss, fullscreen exit, right-click context menus, and copy/paste actions.
- **Smart Debouncing**: Debounces companion events (`tab_switch` followed by `focus_loss` within 2000ms) to eliminate false positives.
- **Server-Authoritative auto-submission**: Configurable thresholds (`maxViolations: 3`) immediately finalize and grade the exam when breached.
- **Post-Deadline Exploit Prevention**: Server validates arrival timestamps against `serverDeadline`; expired requests trigger automatic transition to `timed_out`.
- **Atomic MongoDB Saves**: Uses `$set` and `$push` operators to eliminate race conditions during high-frequency parallel autosaves.

---

## 🏗️ Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Clients["Candidate & Institutional Portals"]
        Student["Candidate Browser\n(/portal/runner)"]
        Proctor["Teacher / Proctor\n(Invigilation Console)"]
        Admin["School / Super Admin\n(Management Studio)"]
    end

    subgraph SecurityLayer["Security & Gateway Layer"]
        RateLimiter["Sliding-Window Rate Limiter\n(25-60 req/min/IP)"]
        JWTAuth["JWT Session Verification\n(HMAC-SHA256 / 32-byte secret)"]
        TenantGuard["Tenant Boundary Guard\n(requireSchoolAccess)"]
    end

    subgraph AppEngines["Application Engines"]
        VerifyEngine["Verification & Targeting Engine\n(Class, Section, Cohort Check)"]
        Sanitizer["Question Sanitizer\n(Strips correctAnswer & rubric)"]
        AutosaveEngine["Atomic Autosave Engine\n($set & $push Operations)"]
        GradingEngine["Auto-Evaluation Engine\n(MCQ, True/False, Negative Marking)"]
        CertEngine["Certificate Engine\n(SHA-256 Verification Hash)"]
    end

    subgraph StorageLayer["Data Tier (MongoDB)"]
        DB_Schools[(Schools)]
        DB_Students[(Students)]
        DB_Exams[(Exams & Questions)]
        DB_Attempts[(Exam Attempts & Logs)]
        DB_Audit[(Immutable Audit Logs)]
    end

    Student --> RateLimiter --> JWTAuth
    JWTAuth --> VerifyEngine --> Sanitizer --> DB_Exams
    JWTAuth --> AutosaveEngine --> DB_Attempts
    JWTAuth --> GradingEngine --> DB_Attempts
    
    Proctor --> TenantGuard --> DB_Attempts
    Admin --> TenantGuard --> DB_Schools & DB_Students & DB_Audit
    
    GradingEngine --> CertEngine --> DB_Attempts
```

---

## 💻 Portal Ecosystem

| Portal | URL Path | Persona | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `/super-admin` | Platform Owner | Provision institutional tenants, global analytics, system audit logs, school status toggles |
| **School Admin** | `/school/[slug]` | Principal / Dean | Academic year & class hierarchy, bulk Excel student import/export, institutional settings |
| **Exam Studio** | `/school/[slug]/exams` | Faculty / Teacher | Author questions, configure negative marking, targeting cohorts, result publishing |
| **Live Invigilation** | `.../exams/[id]/invigilation` | Exam Invigilator | Live candidate stream, dynamic time extensions (+10m), warning resets, force-submit |
| **Grading Studio** | `.../exams/[id]/grading` | Grader / Faculty | Grade written answers, assign fractional scores, provide feedback, recalculate totals |
| **Candidate Portal** | `/portal` | Student / Parent | Verify credentials, launch examination runner, view past test history & scorecards |
| **Test Runner** | `/portal/runner` | Active Candidate | Synchronized countdown timer, interactive question palette, autosave, anti-cheating lock |
| **Official Certificate** | `/portal/certificate/[id]` | Public / Verifier | Gold/Silver/Bronze distinction badges, 16-hex cryptographic hash verification, PDF print |

---

## 🤖 Bot Testing Team & Security Audit

The platform includes an automated multi-persona simulation harness validating stability, concurrency, and security under extreme conditions:

```
 RUN  v5.0.5 Vitest Test Runner

 ✓ test/anti-cheating.test.ts (1 test)
 ✓ test/exam-timing-grading.test.ts (3 tests)
 ✓ test/tenant-isolation.test.ts (2 tests)
 ✓ test/student-history-results.test.ts (5 tests)
 ✓ test/student-verification.test.ts (5 tests)
 ✓ test/vulnerabilities-invigilation-certificate.test.ts (5 tests)
 ✓ test/bots/anti-cheating-stress.bot.test.ts (4 tests)
 ✓ test/bots/invigilation-certificate.bot.test.ts (5 tests)
 ✓ test/bots/school-admin-academic.bot.test.ts (3 tests)
 ✓ test/bots/security-redteam.bot.test.ts (9 tests)
 ✓ test/bots/candidate-swarm.bot.test.ts (4 tests)

 Test Files  11 passed (11)
      Tests  46 passed (46)
   Duration  4.31s (100% Pass Rate)
```

### Tested Scenarios
- **Candidate Swarm Bot**: 20 parallel student bots verifying credentials, answering questions simultaneously, autosaving with zero race conditions, and submitting together without answer clobbering.
- **Red Team Security Bot**: Probed cross-tenant boundaries, JWT tampering, question secrecy on unpublished exams, rate limiting on verify/login endpoints, and post-deadline submissions.
- **Anti-Cheating Stress Bot**: Fired burst violations to verify server-side companion event deduplication and threshold auto-submission.
- **Invigilator Bot**: Tested real-time roster tracking, deadline extensions, violation resets, and cross-tenant action blocks.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: [Next.js 16.4.3](https://nextjs.org/) (App Router, Turbopack, Server Actions, Dynamic API Routes)
- **Frontend**: [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Database & ODM**: [MongoDB Atlas](https://www.mongodb.com/) via [Mongoose 8.9](https://mongoosejs.com/) (with automatic in-memory fallback for local development)
- **Authentication**: Signed stateless JWT (`jsonwebtoken`) for students & school sessions; [Clerk](https://clerk.com/) integration for Super Admin
- **Testing**: [Vitest](https://vitest.dev/), [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server)
- **Spreadsheets**: [SheetJS (xlsx)](https://sheetjs.com/) for roster ingestion and scorecard exports

---

## ⚡ Quick Start

### Prerequisites
- Node.js `20.x` or `22.x` (LTS recommended)
- npm or yarn

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/itsJ0ker/BrainovaPortal.git
cd BrainovaPortal
npm install
```

### 2. Configure Environment Variables
Copy the template configuration:
```bash
cp .env.example .env.local
```
*(If no `MONGODB_URI` is provided, an in-memory MongoDB server initializes automatically for zero-config local testing.)*

### 3. Run Automated Bot Testing Suite
```bash
npm test
```
Executes all 46 tests across all 11 test suites.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Seed Demonstration Records
Navigate to `/super-admin` or trigger the database seeder endpoint:
```bash
curl -X POST http://localhost:3000/api/seed
```
This populates sample schools, active candidate rosters, and sample Olympiad exams with published results.

---

## 🧪 Demo Credentials & Test Personas

When running locally, use the top navigation role switcher to toggle between roles:

| Persona | Role / Workspace | Credentials / Identifiers | Notes |
| :--- | :--- | :--- | :--- |
| **Super Admin** | Platform Console | Email: `superadmin@schexamport.internal` | Access to `/super-admin` |
| **School Admin** | Greenwood High | Email: `admin@greenwood.edu` | Access to `/school/greenwood-high` |
| **Candidate 1** | Physics Exam (`PHYS101`) | Roll: `GRN-101` \| Name: `Alex Mercer` | Eligible Grade 10 student |
| **Candidate 2** | CS Exam (`CS202`) | Roll: `GRN-102` \| Name: `Sophia Zhang` | Eligible Grade 10 student |

---

## 📦 Production Deployment

### 1. Build Verification
Verify production compilation with Turbopack and strict type-checking:
```bash
npm run build
npm run start
```

### 2. Deploying to Vercel
1. Push your repository to GitHub.
2. Import the project in your [Vercel Dashboard](https://vercel.com).
3. Set the following environment variables:

| Variable | Description | Example / Value |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://user:pass@cluster0.mongodb.net/brainova` |
| `STUDENT_SESSION_SECRET` | 32-byte secret for signing student exam tokens | `openssl rand -base64 32` |
| `JWT_SECRET` | Secret for school admin JWT cookies | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Canonical production URL | `https://olympiad.yourdomain.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | *(Optional)* Clerk public key for Super Admin | `pk_live_...` |
| `CLERK_SECRET_KEY` | *(Optional)* Clerk secret key | `sk_live_...` |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ by the Brainova Olympiad Engineering Team.</sub>
</div>
