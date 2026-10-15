# Smart Campus Complaint & Analytics System

A comprehensive complaint management platform for campus environments that enables students to submit complaints and allows administrators to track, analyze, and resolve issues efficiently.

### 🔗 Live Demo
- **Student Portal:** https://smart-campus-student.onrender.com
- **Admin Portal:** https://smart-campus-admin.onrender.com

---

## 📋 Table of Contents

- [Beginner Level Guide](#beginner-level-guide)
- [Intermediate Level Guide](#intermediate-level-guide)
- [Advanced Level Guide](#advanced-level-guide)
- [Quick Start](#quick-start)
- [Project Information](#project-information)
- [Language Composition](#language-composition)

---

## 🟢 Beginner Level Guide

### What is this project?

**Smart Campus Complaints** is a web application that helps students report problems on campus (like maintenance issues, cleanliness concerns, or facility problems) and helps campus administrators manage and resolve them efficiently.

Think of it like a **suggestion box**, but digital and organized:
- **Students** use a portal to submit complaints
- **Admins** use a different portal to see all complaints, categorize them, and track their progress
- The system **automatically categorizes** complaints using artificial intelligence
- **Analytics** show patterns to help the campus improve

### Why is this useful?

- **Students**: Easy way to report problems without formal procedures
- **Campus Admin**: Centralized dashboard to manage all complaints
- **Campus Leaders**: Analytics show what problems are most common
- **Faster Resolution**: Issues get tracked instead of being forgotten

### How do I run this project?

#### Step 1: Get the code
```bash
git clone https://github.com/abinkr/smart-campus-complaints.git
cd smart-campus-complaints
```

#### Step 2: Set up environment files (simple configuration)
The project needs some settings (like passwords and API keys). Copy example files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp nlp-service/.env.example nlp-service/.env
```

#### Step 3: Run everything with Docker (easiest way)
Docker is a tool that lets you run the entire application without installing everything individually:

```bash
docker compose up --build
```

This will start:
- **Student Portal**: Go to `http://localhost:5173` in your browser
- **Admin Portal**: Go to `http://localhost:5174` in your browser

#### Step 4: Test it!

1. **Create a student account**:
   - Go to student portal (localhost:5173)
   - Click "Register" and fill in your details
   - Submit a complaint (like "Broken door in building A")

2. **Create an admin account**:
   - Go to admin portal (localhost:5174)
   - Enter the `ADMIN_REGISTRATION_KEY` from `backend/.env`
   - Register as admin
   - You'll see all student complaints in a dashboard

3. **Update complaint status**:
   - Admin can change complaint from "Open" → "In Progress" → "Resolved"

### Key Features (What you can do)

| Feature | Who uses it | What it does |
|---------|-------------|------------|
| **Submit Complaint** | Students | Write a problem with title, description, image, location |
| **Auto-Categorize** | System | AI reads your complaint and suggests a category (Maintenance, Cleanliness, etc.) |
| **View My Complaints** | Students | See all complaints they submitted and their status |
| **Dashboard** | Admin | See all complaints from all students in one place |
| **Filter & Search** | Admin | Find complaints by category, priority, or status |
| **Export to CSV** | Admin | Download complaint data for reports |
| **Analytics** | Admin | See graphs showing complaint trends |
| **Multi-Factor Authentication** | All Users | Extra security: login with password + code sent via SMS or email |

---

## 🟡 Intermediate Level Guide

### Project Structure

The project is divided into **3 independent services** that communicate with each other:

```
smart-campus-complaints/
│
├── frontend/                 # Web interfaces (what users see)
│   ├── src/
│   │   ├── student/         # Student portal pages
│   │   ├── admin/           # Admin portal pages
│   │   ├── components/      # Reusable UI components
│   │   ├── stores/          # State management (Zustand)
│   │   ├── hooks/           # Custom React logic
│   │   └── utils/           # Helper functions
│   ├── package.json         # Dependencies
│   └── vite.config.js       # Build configuration
│
├── backend/                  # Server API (handles requests)
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── controllers/      # Business logic for each route
│   │   ├── models/          # Database schemas (Prisma)
│   │   ├── middleware/       # Auth, validation, error handling
│   │   ├── services/         # Reusable functions (email, NLP calls)
│   │   └── server.js        # Main entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database structure definition
│   ├── package.json
│   └── Dockerfile           # Instructions to run in Docker
│
├── nlp-service/              # AI service (categorizes complaints)
│   ├── app.py               # Flask web server
│   ├── classifier.py        # AI categorization logic
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile
│
└── docker-compose.yml        # Orchestrates all 3 services
```

### Technology Stack Explained

| Component | Technology | What it does |
|-----------|-----------|------------|
| **Frontend** | React 18 | Build interactive user interfaces |
| | Vite | Fast build tool for development |
| | Tailwind CSS | Design styling framework |
| | Zustand | Manage app state (remember user login, etc.) |
| **Backend** | Node.js | Run JavaScript on the server |
| | Express | Framework to handle HTTP requests |
| | Prisma | ORM to safely access the database |
| | PostgreSQL | Store all data (complaints, users, etc.) |
| | JWT | Secure tokens for user authentication |
| | Cloudinary | Store uploaded images in the cloud |
| **NLP** | Python | Programming language for AI |
| | Flask | Simple web framework |
| | TF-IDF & Logistic Regression | Machine learning algorithms to categorize text |
| **Infrastructure** | Docker | Package everything into containers |
| | Redis | Fast cache for performance |

### Setup Instructions (For Development)

#### Option 1: Docker (Recommended - Easiest)

```bash
# Clone and navigate
git clone https://github.com/abinkr/smart-campus-complaints.git
cd smart-campus-complaints

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp nlp-service/.env.example nlp-service/.env

# Start all services
docker compose up --build
```

**Accessing the app:**
- Student Portal: `http://localhost:5173`
- Admin Portal: `http://localhost:5174`
- Backend API: `http://localhost:5000`
- NLP Service: `http://localhost:5001`

#### Option 2: Manual Setup (For Development/Learning)

**Backend setup:**
```bash
cd backend
npm install                     # Install dependencies
npx prisma migrate dev         # Create database tables
npx prisma db seed             # Add sample data
npm run dev                     # Start server (watches for changes)
```

**Frontend setup (in separate terminals):**
```bash
# Terminal 1: Student Portal
cd frontend
npm install
npm run dev:student

# Terminal 2: Admin Portal (same frontend, different build)
cd frontend
npm run dev:admin
```

**NLP service setup:**
```bash
cd nlp-service
pip install -r requirements.txt  # Install Python dependencies
python app.py                     # Start Flask server
```

### Environment Variables (Configuration Settings)

You need to set these in `.env` files:

**Backend `.env` file:**
```env
# Server configuration
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/smart_campus

# Authentication
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRY=7d
ADMIN_REGISTRATION_KEY=admin_secret_key_here

# Email notifications
SENDGRID_API_KEY=your_sendgrid_key_or_leave_blank
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# File uploads
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# SMS (optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# Cache
REDIS_URL=redis://localhost:6379

# NLP service
NLP_SERVICE_URL=http://localhost:5001
RELOAD_SECRET=shared_secret_key

# Client URLs (for deployed apps)
CLIENT_URL=http://localhost:5173
STUDENT_CLIENT_URL=http://localhost:5173
ADMIN_CLIENT_URL=http://localhost:5174
```

**Frontend `.env` file:**
```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Smart Campus Complaints
```

**NLP Service `.env` file:**
```env
FLASK_ENV=development
PORT=5001
NLP_REQUIRE_SECRET=false
RELOAD_SECRET=shared_secret_key
```

### Main API Endpoints (What the backend does)

#### Authentication
```
POST   /api/auth/student/register      # Create student account
POST   /api/auth/student/login         # Student login
POST   /api/auth/student/login/verify-mfa  # Verify MFA code
POST   /api/auth/admin/register        # Create admin account
POST   /api/auth/admin/login           # Admin login
POST   /api/auth/admin/login/verify-mfa    # Verify MFA code
POST   /api/auth/refresh               # Get new JWT token
POST   /api/auth/logout                # User logout
```

#### Student Complaints
```
POST   /api/complaints                 # Submit new complaint
GET    /api/complaints/mine            # Get my complaints
GET    /api/complaints/:id             # View complaint details
PUT    /api/complaints/:id             # Update complaint status
DELETE /api/complaints/:id             # Cancel complaint
```

#### Admin Dashboard
```
GET    /api/admin/complaints?category=X&priority=Y&status=Z&page=1&limit=20
       # Get all complaints with filters
PUT    /api/admin/complaints/:id       # Update status, assign staff
GET    /api/admin/complaints/export    # Export complaints as CSV
```

#### Analytics (Data insights)
```
GET    /api/analytics/summary          # Total complaints, resolved %, avg time
GET    /api/analytics/by-category      # How many complaints per category?
GET    /api/analytics/status-ratio     # Open vs In Progress vs Resolved
GET    /api/analytics/monthly-trend    # Complaints over time
GET    /api/analytics/department-perf  # Which department resolves fastest?
```

#### NLP Classification
```
POST   /classify                       # AI categorizes text
Body: { "text": "The bathroom door is broken" }
Response: { "category": "Maintenance", "confidence": 0.95 }
```

### Common Development Workflow

1. **Start containers**: `docker compose up --build`
2. **Make changes** to frontend/backend/nlp code
3. **Hot reload**: Changes automatically reflect in browser/API (thanks to Vite & nodemon)
4. **Test API**: Use Postman or curl to test endpoints
5. **Check database**: Run `docker exec <container-id> psql` to query directly
6. **View logs**: `docker compose logs -f backend` to see what's happening
7. **Stop everything**: Press `Ctrl+C` and run `docker compose down`

### Debugging Tips

| Problem | Solution |
|---------|----------|
| "Port already in use" | Change port in `.env` or kill process: `lsof -i :5173` |
| "Database connection failed" | Check `DATABASE_URL` in `.env` |
| "Docker build fails" | Run `docker system prune` to clean up |
| "Can't reach API from frontend" | Ensure `VITE_API_URL` points to backend URL |
| "Upload not working" | Check Cloudinary credentials in `.env` |

---

## 🔴 Advanced Level Guide

### Architecture Overview

This is a **microservices architecture** with clear separation of concerns:

```
┌─────────────────┐         ┌─────────────────┐
│  Student Portal │         │  Admin Portal   │
│   (React)       │         │   (React)       │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │     REST API (JSON)       │
         └───────────────┬───────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         ┌────▼──────┐         ┌────▼──────┐
         │  Backend   │         │    NLP    │
         │ (Node.js)  │         │ (Python)  │
         │ + Express  │         │ + Flask   │
         └────┬───────┘         └───────────┘
              │
         ┌────▼─────────────┬──────────────┐
         │                  │              │
     ┌───▼────┐      ┌──────▼────┐   ┌────▼────┐
     │ PostgreSQL │     │  Redis   │   │Cloudinary
     │ (Data)     │     │ (Cache)  │   │(Storage)
     └────────┘     └──────────┘   └─────────┘
```

**Why this architecture?**

- **Separation of Concerns**: Each service has a single responsibility
- **Scalability**: NLP service can scale independently if it's slow
- **Technology Flexibility**: Backend (Node), Frontend (React), AI (Python)
- **Fault Isolation**: If NLP crashes, backend still works
- **Easy Testing**: Services can be tested independently

### Database Schema (PostgreSQL)

```sql
-- Users table (stores both students and admins)
CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,          -- Bcrypted password
  role ENUM('STUDENT', 'ADMIN') NOT NULL,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT,                         -- For 2FA
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Complaints table (stores all submitted complaints)
CREATE TABLE "Complaint" (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES "User"(id),
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR NOT NULL,               -- Automatically assigned by NLP
  priority ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
  status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') DEFAULT 'OPEN',
  location VARCHAR NOT NULL,
  image_url TEXT,                          -- Cloudinary URL
  assigned_admin_id TEXT REFERENCES "User"(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Complaint status updates (audit trail)
CREATE TABLE "ComplaintUpdate" (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES "Complaint"(id),
  old_status VARCHAR,
  new_status VARCHAR,
  admin_id TEXT REFERENCES "User"(id),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics table (pre-computed for performance)
CREATE TABLE "Analytics" (
  id TEXT PRIMARY KEY,
  metric_type VARCHAR,
  data JSONB,                              -- Flexible storage
  computed_at TIMESTAMP DEFAULT NOW()
);
```

**Why this structure?**

- **Normalization**: User data not duplicated in complaints
- **Audit Trail**: Track all status changes for compliance
- **JSONB Analytics**: Flexible schema for analytics metrics
- **Indexes**: Foreign keys automatically indexed for fast lookups

### Authentication & Security Flow

```
┌──────────────┐
│   Student    │
└──────┬───────┘
       │ 1. Username + Password (HTTPS)
       ▼
┌──────────────────────────────┐
│  Backend: Hash & Verify      │
│  - Bcrypt password check     │
│  - Rate limit (5 tries/min)  │
└──────┬───────────────────────┘
       │ 2. Password correct?
       ├─ NO  → Return 401 Unauthorized
       │
       ├─ YES → Check MFA enabled?
       │
       ▼ 3. If MFA enabled:
   ┌─────────────────────┐
   │ Send OTP via:       │
   │ - Email (SendGrid)  │
   │ - SMS (Twilio)      │
   └─────────────────────┘
       │ 4. User receives code
       │    Submits code back
       ▼ 5. Verify code
   ┌──────────────────────────┐
   │ Code correct?            │
   ├─ NO  → Return 401        │
   └─ YES → Generate JWT      │
           │
           ▼ 6. Return JWT Token
   ┌──────────────────────┐
   │ JWT Token:           │
   │ {                    │
   │   userId: "abc123",  │
   │   role: "STUDENT",   │
   │   exp: 1234567890    │
   │ }                    │
   │ Signed with SECRET   │
   └──────────┬───────────┘
              │ 7. Client stores token (localStorage)
              │
   ┌──────────▼──────────────┐
   │ All future requests:    │
   │ Authorization: Bearer [JWT Token]
   │                         │
   │ Backend verifies:       │
   │ - Signature valid?      │
   │ - Not expired?          │
   │ - User still exists?    │
   └────────────────────────┘
```

**Security measures:**

- **Password**: Bcrypted (one-way encryption, can't be reversed)
- **JWT Token**: Expires in 7 days, requires SECRET to forge
- **HTTPS**: Data encrypted in transit
- **Rate Limiting**: Prevents brute force attacks
- **MFA**: Multi-factor authentication for extra security
- **CORS**: Only allowed origins can access the API
- **Input Validation**: All data checked before database

### NLP Service Pipeline

**Phase 1 (Current): Rule-Based Classification**

```python
complaint_text = "The bathroom tiles are broken and dirty"

# Step 1: Preprocess text
text = text.lower()
text = remove_punctuation(text)
text = remove_stopwords(text)
# Result: "bathroom tiles broken dirty"

# Step 2: Check against keyword rules
if any keyword in text for keyword in maintenance_keywords:
    category = "MAINTENANCE"
    confidence = 0.85

# Send to backend
return { "category": "MAINTENANCE", "confidence": 0.85 }
```

**Phase 2 (Future): ML-Based Classification**

```python
# Step 1: Convert text to numerical features
vectorizer = TfidfVectorizer()
X_features = vectorizer.fit_transform(complaint_texts)

# Step 2: Train Logistic Regression model
model = LogisticRegression()
model.fit(X_features, complaint_categories)

# Step 3: Predict new complaint
new_complaint = "The cafeteria kitchen needs cleaning"
new_features = vectorizer.transform([new_complaint])
prediction = model.predict_proba(new_features)
# Result: [0.02, 0.95, 0.03]
# Probabilities for [Maintenance, Cleanliness, Other]
category = "CLEANLINESS" with confidence 0.95
```

**How to reload the model:**

```bash
# Send reload request to NLP service
curl -X POST http://localhost:5001/reload \
  -H "X-NLP-Secret: your_reload_secret" \
  -d '{"model_type": "logistic_regression"}'

# NLP service retrains on latest data and reloads
```

### API Request/Response Flow (Example: Submit Complaint)

```
1. CLIENT REQUEST:
   POST /api/complaints
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   Content-Type: application/json
   
   {
     "title": "Broken door lock",
     "description": "Main gate lock not working",
     "location": "Main Gate",
     "priority": "HIGH",
     "image": <binary image data>
   }

2. BACKEND MIDDLEWARE:
   ✓ Verify JWT token valid
   ✓ Extract user ID from token
   ✓ Validate input (title not empty, etc.)
   ✓ Check user rate limit (max 5 complaints/hour)

3. BACKEND CONTROLLER:
   ✓ Upload image to Cloudinary
   ✓ Get Cloudinary URL
   ✓ Send complaint text to NLP service

4. NLP SERVICE:
   ✓ Receive: "Broken door lock - Main gate lock not working"
   ✓ Classify: category="MAINTENANCE", confidence=0.92
   ✓ Return category to backend

5. BACKEND DATABASE:
   ✓ Insert complaint with:
     - user_id, title, description, location
     - category (from NLP)
     - image_url (from Cloudinary)
     - status: "OPEN"
     - created_at: now()

6. BACKEND RESPONSE:
   HTTP 201 Created
   {
     "id": "complaint_abc123",
     "title": "Broken door lock",
     "category": "MAINTENANCE",
     "status": "OPEN",
     "created_at": "2024-01-15T10:30:00Z"
   }

7. FRONTEND:
   ✓ Display success message
   ✓ Redirect to complaint details page
```

### Performance Optimization

**Database Optimization:**
```sql
-- Create indexes on frequently queried columns
CREATE INDEX idx_complaint_student_id ON "Complaint"(student_id);
CREATE INDEX idx_complaint_status ON "Complaint"(status);
CREATE INDEX idx_complaint_created_at ON "Complaint"(created_at);

-- Query: Get all open complaints for a student
SELECT * FROM "Complaint" 
WHERE student_id = 'user123' AND status = 'OPEN'
-- Uses indexes: O(log n) instead of O(n)
```

**Caching Strategy (Redis):**
```javascript
// Cache analytics results (expensive calculations)
const key = `analytics:summary:${startDate}`;
const cached = await redis.get(key);

if (cached) {
  return JSON.parse(cached);  // Return from cache (fast)
} else {
  const result = calculateAnalytics(startDate);
  await redis.setex(key, 3600, JSON.stringify(result));  // Cache for 1 hour
  return result;
}
```

**API Rate Limiting:**
```javascript
// Prevent abuse
const rateLimit = {
  student: {
    complaints: 5 per hour,
    requests: 100 per hour
  },
  admin: {
    requests: 1000 per hour  // More lenient
  }
};
```

### Deployment Architecture

```
┌────────────────────┐
│   GitHub Actions   │  (CI/CD Pipeline)
│   (Automation)     │
└─────────┬──────────┘
          │
          ▼ On every push:
    ┌─────────────────────────┐
    │ 1. Run Tests            │
    │ 2. Build Frontend (Vite)│
    │ 3. Build Backend (Docker)
    │ 4. Build NLP (Docker)   │
    │ 5. Push to Docker Hub   │
    └─────────┬───────────────┘
              │
    ┌─────────▼─────────────────────────────┐
    │         Render (Static Sites)         │
    │  ┌──────────────────────────────────┐ │
    │  │ Student Portal                   │ │
    │  │ smart-campus-student.onrender.com│ │
    │  │ (React frontend)                 │ │
    │  └──────────────────────────────────┘ │
    │  ┌──────────────────────────────────┐ │
    │  │ Admin Portal                     │ │
    │  │ smart-campus-admin.onrender.com  │ │
    │  │ (React frontend)                 │ │
    │  └──────────────────────────────────┘ │
    └─────────────────────────────────────┘
              │
    ┌─────────▼────────────────────────────┐
    │         Render (Web Services)        │
    │  ┌──────────────────────────────────┐│
    │  │ Backend API                      ││
    │  │ https://smart-campus-api.onrender.com
    │  │ (Node.js + Express)              ││
    │  └──────────────────────────────────┘│
    ┌──────────────────────────────────────┐│
    │  │ NLP Service                      ││
    │  │ https://smart-campus-nlp.onrender.com
    │  │ (Python + Flask)                 ││
    │  └──────────────────────────────────┘│
    ┌──────────────────────────────────────┐│
    │  │ Cloud PostgreSQL Database         ││
    │  │ (Supabase / Neon / Render)       ││
    │  └──────────────────────────────────┘│
    └──────────────────────────────────────┘
```

### Deployment Environment Variables

**All secrets should ONLY be set in the Render dashboard, never committed:**

```env
# Render Backend Dashboard:
DATABASE_URL=postgresql://user:pwd@render-postgres:5432/db
REDIS_URL=redis://redis-instance:6379
JWT_SECRET=very_long_random_string
ADMIN_REGISTRATION_KEY=admin_secret
SENDGRID_API_KEY=your_sendgrid_key
CLOUDINARY_NAME=cloudinary_account
CLOUDINARY_API_KEY=cloudinary_key
CLOUDINARY_API_SECRET=cloudinary_secret
RELOAD_SECRET=shared_secret
NLP_SERVICE_URL=https://smart-campus-nlp.onrender.com
STUDENT_CLIENT_URL=https://smart-campus-student.onrender.com
ADMIN_CLIENT_URL=https://smart-campus-admin.onrender.com
NODE_ENV=production

# Render NLP Dashboard:
ENVIRONMENT=production
NLP_REQUIRE_SECRET=true
RELOAD_SECRET=shared_secret
DATABASE_URL=postgresql://user:pwd@render-postgres:5432/db

# Render Frontend Static Sites Dashboard:
VITE_API_URL=https://smart-campus-backend.onrender.com
```

### Security Considerations

**Authentication:**
- JWT tokens expire in 7 days
- MFA via email/SMS optional but recommended for admins
- Password minimum 8 characters, hashed with bcrypt

**Data Protection:**
- All API calls use HTTPS (encrypted in transit)
- Database credentials never in source code
- Cloudinary for image storage (external, secure)
- Sensitive logs never printed

**Access Control:**
```javascript
// Middleware: Only students can submit complaints
router.post('/complaints', 
  authMiddleware,                    // Must be logged in
  roleMiddleware('STUDENT'),         // Must be student role
  complaintController.create
);

// Only admins can access admin endpoints
router.get('/admin/complaints',
  authMiddleware,
  roleMiddleware('ADMIN'),           // Must be admin role
  adminController.getAllComplaints
);
```

### Scalability Improvements (Future)

| Challenge | Current | Future |
|-----------|---------|--------|
| **Database queries** | PostgreSQL + basic indexes | Add read replicas, sharding |
| **Image uploads** | Cloudinary | CDN with edge caching |
| **NLP latency** | Flask single instance | Async queue (Bull/RabbitMQ) |
| **API load** | Single Node.js instance | Kubernetes with auto-scaling |
| **Real-time updates** | Poll API | WebSocket connections |
| **Data analytics** | On-demand queries | Data warehouse (BigQuery) |

### Monitoring & Debugging

**For production monitoring:**
```bash
# View real-time logs
heroku logs --tail

# Monitor database
SELECT COUNT(*) FROM "Complaint" WHERE status = 'OPEN';

# Check Redis cache hit rate
redis-cli INFO stats
```

**Common production issues:**

| Issue | Cause | Fix |
|-------|-------|-----|
| Slow complaints endpoint | Missing database index | Add index on status/student_id |
| NLP timeout | Model too large | Compress model or use async |
| High memory | Memory leak | Check for unclosed connections |
| Email not sending | SMTP credentials wrong | Verify SendGrid/Gmail keys |

---

## 🚀 Quick Start

### Fastest Way to Run (5 minutes)

```bash
# 1. Clone
git clone https://github.com/abinkr/smart-campus-complaints.git
cd smart-campus-complaints

# 2. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp nlp-service/.env.example nlp-service/.env

# 3. Run with Docker
docker compose up --build

# 4. Open browsers
# Student: http://localhost:5173
# Admin:   http://localhost:5174
```

### What's Running?

| Service | URL | What it does |
|---------|-----|------------|
| Student Portal | http://localhost:5173 | Students submit complaints |
| Admin Portal | http://localhost:5174 | Admins manage complaints |
| Backend API | http://localhost:5000 | Server handling requests |
| NLP Service | http://localhost:5001 | AI categorization |
| Database | localhost:5432 | PostgreSQL data storage |
| Redis Cache | localhost:6379 | Performance cache |

### First Steps

1. **Register student account** (portal 5173)
2. **Submit a test complaint**
3. **Get admin key** from `backend/.env` (ADMIN_REGISTRATION_KEY)
4. **Register admin account** (portal 5174 with key)
5. **View complaint in admin dashboard**

---

## 📊 Project Information

### Real-World Use Case

In a real-world campus setting, students frequently encounter broken amenities, cleanliness issues, or infrastructure faults but lack a clear, accountable channel to report them.

- **Students** log into the student portal, fill out a complaint form, attach an image, and provide location details.
- The **NLP Service** instantly processes the text and assigns an appropriate category (e.g., "Maintenance").
- **Administrators** monitor a centralized dashboard in the admin portal where they review incoming complaints, update their statuses (Open, In Progress, Resolved), and assign staff.
- The system generates **Analytics** that give campus management visual trends (e.g., peak complaint times or recurrent issues in specific departments), speeding up response times and improving operational efficiency.

### Why This Project Is Useful

- **For Students:** Provides a straightforward, accessible platform to report issues with transparent status tracking, ensuring their concerns are heard and addressed rather than lost in paperwork.
- **For Administrators:** Centralizes all complaints into one dashboard, offering powerful filtering, searching, and exporting capabilities.
- **For College Management:** Analytics provide data-driven insights to identify recurring problems, allocate maintenance budgets efficiently, and measure the performance of different campus departments.
- **For Maintenance Departments:** Streamlines workflows and prioritizes tasks, preventing trivial issues from escalating into major problems.

### Performance Metrics

**Desktop (PageSpeed Insights):**
- Performance: 100
- Accessibility: 100
- Best Practices: 100
- SEO: 100

**Mobile (PageSpeed Insights):**
- Performance: 93
- Accessibility: 100
- Best Practices: 100
- SEO: 100

---

## 📊 Language Composition

This repository uses multiple programming languages to deliver different components of the system:

```
Language Breakdown:
├── JavaScript:  92.4% (Frontend + Backend)
├── Python:       6.2% (NLP Service)
└── Other:        1.4%
```

### Breakdown by Component

| Component | Language | Usage | Files |
|-----------|----------|-------|-------|
| **Frontend** | JavaScript (React) | Student & Admin portals, UI components, state management | `.jsx`, `.js` |
| **Backend** | JavaScript (Node.js) | API routes, controllers, database logic, middleware | `.js` |
| **NLP Service** | Python | Machine learning, complaint categorization, AI logic | `.py` |
| **Configuration** | Other | Docker, YAML, JSON, env files, etc. | `Dockerfile`, `docker-compose.yml`, `.env` |

### Why This Language Mix?

- **JavaScript (92.4%)**: Chosen for frontend and backend because React (frontend) and Node.js (backend) provide a unified full-stack development experience, enabling code sharing (utilities, types) and faster development with a single language across multiple layers.
- **Python (6.2%)**: Selected for the NLP service because Python has the richest ecosystem for machine learning, data processing, and AI libraries (scikit-learn, TensorFlow, NLTK), making it the industry standard for NLP tasks.
- **Other (1.4%)**: Configuration files, Docker setup, and deployment scripts that support the project infrastructure.

---

## 📁 Project Structure Summary

### Key Files to Know

- **`backend/src/server.js`** - Main backend entry point
- **`backend/prisma/schema.prisma`** - Database structure
- **`frontend/src/App.jsx`** - Main frontend component
- **`nlp-service/app.py`** - AI service entry point
- **`docker-compose.yml`** - Orchestrates all services

### Technology Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React, Vite, Tailwind CSS | Building interactive user interfaces and styling |
| **Backend** | Node.js, Express.js | Serving REST API endpoints and managing business logic |
| **Database** | PostgreSQL (with Prisma ORM) | Relational data modeling and storage |
| **AI/NLP** | Python, Flask, scikit-learn | Machine learning categorization for incoming complaints |
| **Storage** | Cloudinary | Cloud storage for uploaded complaint images |
| **Hosting (Production)** | Render | Deployment of web clients and API/NLP services |

---

## 🤝 Contributing

Found a bug? Want to add a feature?

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Make changes
4. Test locally with Docker
5. Push and create a Pull Request

---

## 📞 Support

- Check logs: `docker compose logs -f [service-name]`
- Review `.env.example` files for configuration options
- Database schema: `backend/prisma/schema.prisma`
- Project documentation: `docs/SMART_CAMPUS_PROJECT_REPORT.md`

---

## 📄 License

This project is open source. Check LICENSE file for details.

---

**Built with ❤️ for campus improvement**
