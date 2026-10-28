# Production Deployment Guide: SchoolExamPort on Vercel

This guide outlines the production deployment procedure for **SchoolExamPort** on [Vercel](https://vercel.com) with [MongoDB Atlas](https://www.mongodb.com/atlas) and [Clerk Authentication](https://clerk.com).

---

## 1. MongoDB Atlas Setup

### 1.1 Cluster Creation
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/) and create a shared or dedicated cluster (M0 or M10+).
2. Under **Network Access**, add IP `0.0.0.0/0` (Allow Access from Anywhere) or integrate with Vercel's IP ranges to permit serverless function connections.
3. Under **Database Access**, create a database user with read and write permissions to the `schexamport` database.

### 1.2 Connection String
Retrieve your MongoDB Atlas connection string:
```text
mongodb+srv://<db_user>:<db_password>@cluster0.xxxxx.mongodb.net/schexamport?retryWrites=true&w=majority
```

### 1.3 Database Indexes
The application automatically creates unique compound indexes via Mongoose schemas upon startup:
- `Student`: `{ schoolId: 1, rollNumber: 1 }` (unique)
- `Student`: `{ schoolId: 1, admissionNumber: 1 }` (unique)
- `Exam`: `{ schoolId: 1, accessCode: 1 }` (unique)
- `ExamAttempt`: `{ examId: 1, studentId: 1, status: 1 }`
- `School`: `{ slug: 1 }` (unique), `{ code: 1 }` (unique)

---

## 2. Clerk Authentication Setup

1. Create a new application in [Clerk Dashboard](https://dashboard.clerk.com).
2. Enable Email/Password authentication.
3. In **User Metadata & Roles**, configure claims mapping:
   - Super Admins should have `publicMetadata: { role: "super_admin" }`.
   - School Staff should have `publicMetadata: { role: "school_admin", schoolId: "<school_object_id>", schoolSlug: "<school_slug>" }`.
4. Copy your **Publishable Key** and **Secret Key**.

---

## 3. Vercel Deployment

### 3.1 Push Repository to GitHub/GitLab
```bash
git remote add origin https://github.com/your-org/schexamport.git
git branch -M main
git push -u origin main
```

### 3.2 Import Project in Vercel
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New Project** and select your `schexamport` Git repository.
3. Framework Preset: **Next.js** (automatically detected).
4. Root Directory: `./` (leave default).

### 3.3 Configure Environment Variables
In the **Environment Variables** panel in Vercel, define:

| Key | Example Value | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/schexamport` | MongoDB Atlas URI |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Clerk Publishable Key |
| `CLERK_SECRET_KEY` | `sk_test_...` | Clerk Secret Key |
| `JWT_SECRET` | `generate-a-secure-64-character-string` | Secret for candidate attempt session tokens |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Production platform URL |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Clerk Sign In redirect |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Clerk Sign Up redirect |

### 3.4 Deploy
Click **Deploy**. Vercel will run `npm run build` and provision edge network endpoints.

---

## 4. Post-Deployment Verification

1. **Seed Production Demo Data (Optional)**:
   Trigger the initial seed endpoint once to initialize default tenants:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/seed
   ```
2. **Verify Multi-School Routing**:
   - Super Admin: `https://your-domain.vercel.app/super-admin`
   - School Workspace: `https://your-domain.vercel.app/school/greenwood-high`
   - Student Portal: `https://your-domain.vercel.app/portal?code=PHYS101`
3. **Verify Anti-Cheating & Exam Timing**:
   Ensure WebSocket / HTTP polling works for live exam autosaves.

---

## 5. Security & Maintenance Checklist

- [x] **Zero Answer-Key Leakage**: Student APIs (`/api/portal/exam-info` and `/api/portal/verify`) use `sanitizeQuestionsForStudent()` to strip `correctOptionId`, `correctOptionIds`, and `rubricExplanation` before sending payloads to the browser.
- [x] **Server Deadline Enforcement**: Client timestamps are ignored. The server calculates deadlines on attempt creation and strictly rejects or finalizes expired attempts on submit.
- [x] **Rate Limiting & Autosave Debounce**: Autosaves are debounced to 3-second intervals on the client and validated atomically on the server.
- [x] **Data Isolation**: All MongoDB queries are scoped to the authenticated tenant's `schoolId`.
