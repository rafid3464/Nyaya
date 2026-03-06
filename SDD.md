# Software Design Document (SDD)
## For Nyaya Legal Guidance System

---

### 1. Introduction

#### 1.1 Purpose
This Software Design Document (SDD) describes the architecture, system components, database design, and interface design of the **Nyaya Legal Guidance System**. It serves as a blueprint for developers to understand the internal workings and structural decisions of the application.

#### 1.2 Scope
This document covers the architectural design of both the Next.js frontend and the Node.js/Express backend. It details data flow, component interactions, and the database schema implemented via Supabase.

---

### 2. System Architecture

#### 2.1 Overview
The system follows a standard Client-Server architecture, divided into three main tiers:
1.  **Presentation Tier (Frontend Client)**: A Next.js (React) Single Page Application (SPA).
2.  **Application Tier (Backend API)**: A Node.js server running Express.js.
3.  **Data Tier**: Supabase Platform (PostgreSQL Database + Object Storage).
4.  **External Services**: Google Gemini API for GenAI capabilities.

#### 2.2 Component Diagram Overview
```text
[ Web Browser ]  <--(HTTP/REST)-->  [ Node.js/Express API Server ]
                                          |           |
                                          v           v
                               [ Google Gemini ]  [ Supabase (DB & Storage) ]
```

---

### 3. Frontend Architecture (Next.js)

#### 3.1 Technology Stack
- **Framework**: Next.js v14+ (App Router structure).
- **UI Library**: React (v19).
- **Styling**: Tailwind CSS, Framer Motion (for animations), Lucide React (icons).
- **Mapping**: React-Leaflet and Leaflet.js.
- **Markdown Rendering**: React-Markdown for formatting AI responses.

#### 3.2 Key Directories & Routing (`/app`)
- `/login`, `/register`: Authentication views.
- `/chat`: Main interface for the AI Legal Assistant.
- `/documents`: Interface for uploading, viewing, and chatting with documents.
- `/nearby`: Interactive map and listing of localized legal services.
- `/history`: Overview of past chat sessions and analyzed documents.

#### 3.3 State Management
Context and local component state (`useState`, `useEffect`) are used for state management. An `AuthProvider` may wrap the application to maintain global user authentication state.

---

### 4. Backend Architecture (Node.js/Express)

#### 4.1 Technology Stack
- **Framework**: Express.js.
- **File Parsing**: Multer (Memory Storage), `pdf-parse`.
- **Authentication**: `bcryptjs` for hashing, `jsonwebtoken` for session tokens.
- **AI Integration**: `@google/generative-ai` SDK.
- **Database Client**: `@supabase/supabase-js`.

#### 4.2 Module Structure (`/src`)
- **`/routes`**: Defines the API endpoints.
  - `auth.js`: User registration and login.
  - `chat.js`: Handles session creation, retrieval, and message prompting to Gemini.
  - `documents.js`: Handles file uploads (Multer), text extraction, AI analysis, and Supabase storage.
  - `location.js`: Provides geographical data of legal services across Indian cities.
- **`/services`**: External integrations.
  - `geminiService.js`: Encapsulates AI model initializations, system prompts, and AI utility functions.
  - `supabaseClient.js`: Initializes and exports the database connection instance.
- **`/middleware`**: Request interceptors.
  - `auth.js`: Verifies JWT tokens in `Authorization` headers.

---

### 5. Database Design (Supabase / PostgreSQL)

The system utilizes a relational database structure. Below are the logical representations of key tables:

#### 5.1 `users` Table
| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key. |
| `name` | VARCHAR | User's full name. |
| `email` | VARCHAR | User's email (Unique). |
| `password` | VARCHAR | Bcrypt hashed password. |
| `created_at` | TIMESTAMPTZ | Creation timestamp. |

#### 5.2 `chat_sessions` Table
| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key. |
| `user_id` | UUID | Foreign Key -> `users.id`. |
| `title` | VARCHAR | Short description of the chat. |
| `category` | VARCHAR | AI-determined category of the chat. |
| `messages` | JSONB | Array of message objects `{role, content, timestamp}`. |
| `created_at` | TIMESTAMPTZ | - |
| `updated_at` | TIMESTAMPTZ | - |

#### 5.3 `documents` Table
| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key. |
| `user_id` | UUID | Foreign Key -> `users.id`. |
| `original_name` | VARCHAR | Original uploaded filename. |
| `storage_key` | VARCHAR | Supabase Storage path/reference. |
| `doc_type` | VARCHAR | Type determined by AI (e.g., NDA, Lease). |
| `extracted_text` | TEXT | Raw extracted text from PDF/Image. |
| `summary` | TEXT | AI-generated summary. |
| `risks` | JSONB | Array of identified risks. |
| `qa_history` | JSONB | Q&A history specific to this document. |
| `created_at` | TIMESTAMPTZ | - |

---

### 6. API Design & Data Flow Specifications

#### 6.1 Authentication Flow
1. Client POSTs credentials to `/api/auth/login`.
2. Backend verifies email/password against the `users` table.
3. Upon success, backend signs a JWT with the `user_id` and responds with the token.
4. Client stores the JWT (e.g., LocalStorage) and includes it in the `Authorization: Bearer <token>` header for subsequent requests.

#### 6.2 Document Analysis Flow
1. Client POSTs `multipart/form-data` to `/api/documents/upload` containing the document file.
2. The `multer` middleware buffers the file in memory.
3. Backend extracts text (`pdf-parse` or Gemini Vision).
4. Backend streams the buffer to Supabase Storage.
5. Backend sends the extracted text to Gemini API for structural analysis.
6. Backend saves metadata and analysis to the `documents` table.
7. Backend responds to the client with the resulting Document ID and Analysis JSON.

---

### 7. Security Design
- **CORS Configuration**: The backend restricts origins using the `cors` middleware, defaulting to the application's URL.
- **File Upload Limitations**: Multer enforces a hard limit of 10MB per file to prevent memory exhaustion on the server.
- **Token Expiry**: JWTs should implement an expiration time (e.g., 24h) to limit attack windows.

### 8. Error Handling Design
Global request failure falls back to standard HTTP status codes:
- `400 Bad Request`: Validation errors, missing fields.
- `401 Unauthorized`: Invalid or missing JWT.
- `404 Not Found`: Requesting non-existent documents or sessions.
- `500 Server Error`: Unhandled backend exceptions, Gemini timeouts, or Database down.
