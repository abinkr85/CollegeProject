# Smart Campus Complaint & Analytics System — Project Report

## 1. Project Overview

The Smart Campus Complaint & Analytics System is a comprehensive web-based platform designed to facilitate the reporting and management of campus-related issues. It provides an efficient "digital suggestion box" mechanism allowing students to report problems—such as maintenance, cleanliness, or facility concerns—and campus administrators to track, categorize, and resolve these issues systematically. 

The system leverages an automated NLP (Natural Language Processing) service that categorizes complaints based on artificial intelligence, significantly reducing administrative overhead. The overarching goal is to replace informal procedures with an organized, data-driven approach that includes robust analytics dashboards to highlight campus trends and bottlenecks.

## 2. Real-World Use Case

In a real-world campus setting, students frequently encounter broken amenities, cleanliness issues, or infrastructure faults but lack a clear, accountable channel to report them. 
- **Students** log into the student portal, fill out a complaint form, attach an image, and provide location details. 
- The **NLP Service** instantly processes the text and assigns an appropriate category (e.g., "Maintenance").
- **Administrators** monitor a centralized dashboard in the admin portal where they review incoming complaints, update their statuses (Open, In Progress, Resolved), and assign staff.
- The system generates **Analytics** that give campus management visual trends (e.g., peak complaint times or recurrent issues in specific departments), speeding up response times and improving overall institutional maintenance.

## 3. Why This Project Is Useful

- **For Students:** Provides a straightforward, accessible platform to report issues with transparent status tracking, ensuring their concerns are heard and addressed rather than lost in paperwork.
- **For Administrators:** Centralizes all complaints into one dashboard, offering powerful filtering, searching, and exporting capabilities.
- **For College Management:** Analytics provide data-driven insights to identify recurring problems, allocate maintenance budgets efficiently, and measure the performance of different campus departments.
- **For Maintenance Departments:** Streamlines workflows and prioritizes tasks, preventing trivial issues from escalating into major problems.

## 4. Technology Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React, Vite, Tailwind CSS | Building interactive user interfaces and styling |
| **Backend** | Node.js, Express.js | Serving REST API endpoints and managing business logic |
| **Database** | PostgreSQL (with Prisma ORM) | Relational data modeling and storage |
| **AI/NLP** | Python, Flask, scikit-learn | Machine learning categorization for incoming complaints |
| **Storage** | Cloudinary | Cloud storage for uploaded complaint images |
| **Cache & Queues** | Redis, BullMQ | Fast data caching and background job queuing |
| **Hosting (Production)** | Render | Deployment of web clients and API/NLP services |

## 5. Languages Used

| Language | Used In | Purpose |
|---|---|---|
| **JavaScript / JSX** | Frontend | UI components and client-side logic |
| **JavaScript (Node.js)** | Backend | Server-side logic and API handling |
| **Python** | NLP Service | AI model training and text classification |
| **SQL (Prisma Schema)** | Database | Data modeling, schema definitions, indexing |
| **HTML** | Frontend entry | Application root template (`index.html`) |
| **CSS / Tailwind** | Frontend styling | Rapid, utility-first UI design (`index.css`) |

## 6. Frameworks Used

- **React:** A JavaScript library for building component-based user interfaces.
- **Vite:** A blazing fast build tool and development server for the frontend.
- **Tailwind CSS:** A utility-first CSS framework for rapid and responsive UI design.
- **Express:** A minimal and flexible Node.js web application framework providing a robust set of features for web and mobile APIs.
- **Prisma:** A next-generation Node.js and TypeScript ORM to interact with the PostgreSQL database securely.
- **Flask:** A lightweight WSGI web application framework in Python used to expose the NLP model via an API.

## 7. Installed Packages and Libraries

### 7.1 Frontend Packages

| Package | Purpose |
|---|---|
| `react` & `react-dom` | Core UI library for the application |
| `react-router-dom` | Routing and navigation between pages |
| `@tanstack/react-query` | Data fetching, caching, and state management |
| `react-hook-form` | Handling complex form state and validation |
| `zod` & `@hookform/resolvers` | Schema-based form validation |
| `axios` | Making HTTP requests to the backend API |
| `recharts` | Rendering analytical charts and graphs |
| `react-toastify` | Displaying temporary toast notifications |
| `lucide-react` | Scalable vector icons for the UI |
| `dompurify` | Sanitizing HTML to prevent XSS attacks |
| `jwt-decode` | Decoding JSON Web Tokens client-side |

*Total Frontend Packages: ~15 main dependencies*

### 7.2 Backend Packages

| Package | Purpose |
|---|---|
| `express` | Web API server framework |
| `@prisma/client` | Auto-generated database client |
| `bcryptjs` | Hashing passwords securely |
| `jsonwebtoken` | Generating and verifying auth tokens |
| `bullmq` & `ioredis` | Managing background task queues and Redis connections |
| `cloudinary` | Managing image uploads |
| `zod` | Validating API request payloads |
| `twilio` & `@sendgrid/mail` | SMS and Email delivery services for notifications/MFA |
| `pino` & `pino-http` | Fast logging framework |
| `cors`, `helmet`, `hpp` | Security middleware to protect API endpoints |

*Total Backend Packages: ~25 main dependencies*

### 7.3 NLP Service Packages

| Package | Purpose |
|---|---|
| `flask` & `flask-cors` | Web server and cross-origin resource sharing |
| `scikit-learn` | Machine learning algorithms (TF-IDF, Logistic Regression) |
| `nltk` | Natural Language Toolkit for text preprocessing |
| `pandas` & `numpy` | Data manipulation and numerical operations |
| `joblib` | Saving and loading trained machine learning models |
| `pydantic` | Data validation for incoming API requests |

*Total NLP Service Packages: ~10 main dependencies*

## 8. Project Folder Structure

```text
smart-campus-complaints/
├── .github/                   # GitHub Actions (CI/CD workflows)
├── backend/                   # Backend Node.js service
│   ├── prisma/                # Database schema and migrations
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/            # Server configurations
│   │   ├── controllers/       # Route business logic (implied)
│   │   ├── jobs/              # Background worker jobs
│   │   ├── queues/            # Queue setup (BullMQ)
│   │   ├── routes/            # API endpoints
│   │   ├── utils/             # Helper utilities (logger)
│   │   ├── app.js             # Express app setup
│   │   └── server.js          # Main entry point
│   ├── .env.example
│   └── package.json
├── docs/                      # Documentation
├── frontend/                  # React Frontend application
│   ├── public/                # Static assets
│   ├── src/
│   │   ├── api/               # API call wrappers
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # React context (Auth, Timezone)
│   │   ├── data/              # Mock data / constants
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/
│   │   │   ├── admin/         # Admin portal views
│   │   │   └── student/       # Student portal views
│   │   ├── App.jsx            # Main App component
│   │   ├── index.css          # Tailwind and global styles
│   │   └── main.jsx           # React DOM root entry
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── nlp-service/               # Python NLP service
│   ├── src/                   # Model and predictor logic
│   ├── app.py                 # Flask server
│   ├── classifier.py          # AI logic (implied)
│   ├── requirements.txt
│   └── .env.example
├── docker-compose.yml         # Local development Docker config
├── docker-compose.prod.yml    # Production Docker config
└── render.yaml                # Render Blueprint deployment configuration
```

## 9. Frontend Design & Workflow

The frontend is built as a Single Page Application (SPA) using React and Vite, structured into two main portals: Student and Admin. It uses Tailwind CSS to implement a modern, responsive design. The application state and caching are heavily managed by `@tanstack/react-query`, ensuring the UI stays in sync with the backend. Forms are built securely with `react-hook-form` and validated using `zod`. `recharts` is utilized in the admin dashboard for analytical data visualization.

## 10. Backend Workflow

The Node.js backend acts as the central hub. It accepts REST API requests from the frontend, validates them using `zod`, and verifies authentication via `jsonwebtoken`. When a complaint is submitted, the backend:
1. Uploads attached images to Cloudinary.
2. Sends the text description to the Python NLP Service for categorization.
3. Saves the final processed data to the PostgreSQL database via Prisma.
4. Optionally queues background notifications (Emails via SendGrid, SMS via Twilio) using `bullmq` and Redis.

## 11. Student Portal Flow

1. **Authentication:** A student registers/logs in securely. Multi-factor authentication (MFA) is supported.
2. **Dashboard:** The student sees an overview of their past complaints and current statuses.
3. **Submission:** They navigate to a "New Complaint" page to enter a title, description, priority, location, and upload an image.
4. **Follow-up:** Students can track updates or provide follow-up notes on their open complaints.

## 12. Admin Portal Flow

1. **Secure Access:** Admins log in (requiring an admin registration key to create an account initially).
2. **Global Dashboard:** Admins view all campus complaints sorted by priority, date, or category. Data analytics charts summarize the campus situation.
3. **Complaint Management:** Admins can click on individual complaints to read details, change statuses (e.g., "In Progress", "Resolved"), add internal notes, or assign departments.
4. **Data Export:** Admins have the ability to export complaint data (e.g., CSV) for external reporting.

## 13. NLP Service Operation

The NLP service runs as an independent microservice using Python and Flask. It exposes endpoints (e.g., `/classify`).
- **Input:** It receives raw complaint text from the backend API.
- **Processing:** It utilizes `scikit-learn` algorithms (like TF-IDF vectorization and Logistic Regression) and `nltk` to sanitize and classify the text.
- **Output:** It returns the predicted category (e.g., "Maintenance") and a confidence score back to the backend. It also supports batch processing and model reloading without downtime.

## 14. Database Structure

The PostgreSQL database (managed by Prisma) is highly relational. Key tables include:
- **User:** Stores credentials, roles (STUDENT vs ADMIN), and preferences.
- **Complaint:** Stores the issue details, assigned category, NLP confidence, image URLs, and current status.
- **ComplaintLog:** An audit trail tracking every time a complaint status is modified.
- **Notes / Updates:** Tables like `InternalNote`, `PublicUpdate`, and `StudentFollowUp` facilitate communication.
- **Security:** Tables like `RefreshToken` and `MfaChallenge` handle secure authentication sessions.
- **Notification:** Manages alerts for users regarding complaint updates.

## 15. Complaint Flow (Student to Admin)

1. Student submits a complaint via the React frontend.
2. The Node.js API receives it, handles image uploading to Cloudinary, and proxies the text to the NLP service.
3. The NLP service categorizes the text and replies to the Node.js API.
4. The Node.js API writes the complete record (with category) to the `Complaint` table in PostgreSQL.
5. The Admin portal frontend queries the Node.js API and populates the dashboard.
6. The Admin reviews the complaint, changes its status to "Resolved", which creates a `ComplaintLog` entry.
7. The system triggers a notification (via email/SMS/in-app) alerting the student that their issue was resolved.

## 16. Current Status & Hosting Platforms

- **Local Development:** Handled natively via Docker Compose (`docker-compose.yml`) spinning up Postgres, Redis, the Node backend, the Python NLP service, and the Vite frontend.
- **Frontend Hosting:** Configured for **Render Static Sites** (`render.yaml` found in root, specifically handling custom build commands for student vs admin builds).
- **Backend & NLP Hosting:** **Render** is used as the hosting platform for the Node.js API and Python Flask service.
- **Database / Cache:** Cloud Postgres and Redis (e.g. Supabase/Neon and Upstash).

## 17. How to Run Locally

Using Docker (the recommended approach):
1. Clone the repository.
2. Copy the environment variables:
   - `cp backend/.env.example backend/.env`
   - `cp frontend/.env.example frontend/.env`
   - `cp nlp-service/.env.example nlp-service/.env`
3. Run the complete stack:
   ```bash
   docker compose up --build
   ```
4. Access the portals:
   - Student Portal: `http://localhost:5173`
   - Admin Portal: `http://localhost:5174`

## 18. Public Access

Public URLs rely on the deployed Render environments:
- Student Portal: `https://student-frontend-8w2s.onrender.com`
- Admin Portal: `https://admin-frontend-5d1n.onrender.com`
- Backend API: `https://backend-9tut.onrender.com`
- NLP Microservice: `https://nlp-service-ixwy.onrender.com`

## 19. PageSpeed Insights Results

*Based on known external audit metrics:*

**Desktop:**
- Performance: 100
- Accessibility: 100
- Best Practices: 100
- SEO: 100

**Mobile:**
- Performance: 93
- Accessibility: 100
- Best Practices: 100
- SEO: 100

**Explanation:**
1. Desktop performance is excellent, achieving perfect scores across all categories.
2. Mobile performance is also remarkably strong (93), indicating a highly responsive application, though there is a small margin for optimization.
3. Possible mobile improvement areas include:
   - Image optimization (ensuring Cloudinary serves WebP formats optimized for mobile viewports).
   - Unused JavaScript reduction.
   - Font loading optimization.
   - Avoiding layout shift.
   - Reducing bundle size.
   - Lazy loading heavy components (like Recharts visualizations) to defer main-thread execution on slower mobile devices.

## 20. Current Drawbacks & Limitations

1. **Image Scaling Costs:** Cloudinary is used for image uploads; if users upload large, uncompressed images, bandwidth and storage limits could be reached quickly.
2. **Database Search Limitation:** PostgreSQL basic indexing is implemented, but full-text search across thousands of complaint descriptions could become slow without a dedicated search engine (like Elasticsearch) or advanced PostgreSQL text-search configurations.

## 21. Solutions to Drawbacks

1. **Client-Side Compression:** Implement client-side image compression in React before uploading to the backend, drastically reducing upload times and Cloudinary usage.
2. **Optimized Search:** Implement native PostgreSQL full-text search capabilities (`tsvector`) or connect an external search service.

## 22. Recently Implemented Solutions

- **Async NLP Queuing:** NLP categorization is successfully decoupled from the HTTP request cycle using BullMQ. Complaints are created immediately, and their categories are updated asynchronously in the background.
- **Real-time Engine (SSE):** Integrated Server-Sent Events (SSE) into the Express backend and React frontend. The system now pushes live updates directly to the Admin dashboard, ensuring administrators instantly see new complaints and status changes without refreshing.
- **Font Rendering Optimization:** Eliminated third-party render-blocking Google Font requests by migrating all instances of `material-symbols-outlined` to the `lucide-react` SVG icon library, significantly improving Largest Contentful Paint (LCP) and mobile performance.
- **Admin Search Bar Optimization:** Implemented local state debouncing on the Admin portal's complaint search filter. This prevents excessive re-renders on every keystroke. Additionally, removed restrictive `disabled` attributes during data fetches, preventing the search input from unexpectedly losing cursor focus while typing, which perfectly matches the fluid performance of the student portal.

## 23. Future Improvement Suggestions

- **Mobile Application:** While the web version scores highly on mobile PageSpeed, a dedicated native app (React Native) could offer push notifications and native camera integration for students.
- **Advanced Predictive Analytics:** Expand the NLP service to predict time-to-resolution or auto-assign complaints to specific personnel based on historical data.
- **SSO Integration:** Integrate with existing university authentication providers (OAuth, SAML, Google Workspace) to eliminate the need for separate student account registration.
- **Location Mapping:** Integrate Google Maps or Mapbox APIs to allow students to drop a pin on a campus map, providing maintenance staff with exact GPS coordinates for external campus issues.
