# Software Requirements Specification (SRS)
## For Nyaya Legal Guidance System

---

### 1. Introduction

#### 1.1 Purpose
The purpose of this Software Requirements Specification (SRS) is to document the functional and non-functional requirements for the **Nyaya Legal Guidance System**. This document will serve as a definitive guide for developers, project managers, and stakeholders to understand the system's capabilities, constraints, and architecture during development and maintenance.

#### 1.2 Document Conventions
- **Nyaya / Platform**: Refers to the Nyaya Legal Guidance System.
- **User**: Any individual interacting with the web application.
- **AI / LLM**: Artificial Intelligence / Large Language Model (specifically Google Gemini).

#### 1.3 Intended Audience
This document is intended for:
- Developers and Software Engineers
- Quality Assurance (QA) Testers
- Project Managers

#### 1.4 Product Scope
Nyaya is an AI-powered legal assistant platform designed specifically for the Indian legal context. It empowers users by democratizing access to legal information. The system allows users to ask legal queries in natural language, upload and analyze complex legal documents for risks and obligations, and find nearby legal services such as courts, police stations, and lawyers. 

#### 1.5 References
- Google Gemini API Documentation
- Supabase Documentation (PostgreSQL, Authentication & Storage)
- Next.js Documentation

---

### 2. Overall Description

#### 2.1 Product Perspective
The Nyaya Legal Guidance System is a standalone web-based platform with a decoupled client-server architecture. It features a React-based frontend (Next.js) that communicates with a Node.js/Express backend via RESTful APIs. It integrates with external cognitive services (Google Gemini) for AI processing and Supabase for database management, authentication, and file storage.

#### 2.2 Product Functions
- **User Authentication**: Secure signup, login, and session management using JWT.
- **AI Chat Assistant**: Interactive contextual chat to answer legal queries based on Indian law.
- **Document Analysis**: Uploading legal documents (PDFs/Images) to automatically extract text, summarize content, and identify risks, rights, and obligations.
- **Q&A on Documents**: Users can ask specific questions about an uploaded document.
- **Nearby Legal Services**: Location-based directory mapping local police stations, courts, lawyers, and legal aid.

#### 2.3 User Classes and Characteristics
- **General Public (End Users)**: Individuals seeking basic legal guidance, document review, or local legal services. They require an intuitive, easy-to-use interface without technical jargon.
- **Administrators (Future Scope)**: Users managing the platform, monitoring AI usage, and updating the database of legal services.

#### 2.4 Operating Environment
- **Client**: Modern web browsers (Chrome, Firefox, Safari, Edge) on desktop and mobile devices.
- **Server**: Node.js runtime environment.
- **Database**: Supabase (PostgreSQL) residing on the cloud.

---

### 3. Functional Requirements

#### 3.1 User Authentication (FR-01)
- **FR-01.1**: The system shall allow users to register an account using an email address and password.
- **FR-01.2**: Passwords shall be securely hashed using `bcrypt` before storing.
- **FR-01.3**: The system shall generate and return a JSON Web Token (JWT) upon successful login.
- **FR-01.4**: Protected API routes shall require a valid JWT in the Authorization header.

#### 3.2 AI Legal Chat (FR-02)
- **FR-02.1**: The system shall provide a chat interface for users to enter text queries.
- **FR-02.2**: The backend shall maintain conversation history to provide contextual AI responses.
- **FR-02.3**: Chat sessions shall be stored in the database, allowing users to resume previous conversations.
- **FR-02.4**: The system shall integrate with Google Gemini API to process the queries and return relevant legal information.

#### 3.3 Document Analysis (FR-03)
- **FR-03.1**: The system shall allow users to upload files in PDF or Image formats (up to 10MB).
- **FR-03.2**: The system shall extract raw text from uploaded PDFs using `pdf-parse` and from images using AI Vision models.
- **FR-03.3**: The extracted text shall be analyzed by the AI to return a summary, identified risks, parties involved, and key obligations.
- **FR-03.4**: Files shall be securely stored in Supabase Storage under the user's specific directory.

#### 3.4 Nearby Legal Services (FR-04)
- **FR-04.1**: The system shall allow users to search for legal services by city name.
- **FR-04.2**: The system shall categorize services into Police Stations, Courts, Lawyers, Legal Aid, and Notaries.
- **FR-04.3**: The frontend shall display these localized services on an interactive map using `react-leaflet`.

---

### 4. Non-Functional Requirements

#### 4.1 Performance Requirements
- **NFR-01**: The web application frontend shall load within 3 seconds on standard broadband connections.
- **NFR-02**: Standard API endpoints (excluding AI generation) should respond within 500ms. AI generation endpoints may take up to 5-10 seconds depending on the provider latency.

#### 4.2 Security Requirements
- **NFR-03**: All communication between the client and server must be encrypted using HTTPS/TLS.
- **NFR-04**: Passwords must never be stored in plain text.
- **NFR-05**: Uploaded user documents must be strictly isolated and only accessible to the authenticated owner of the document.

#### 4.3 Reliability & Availability
- **NFR-06**: The system backend shall gracefully handle failures from external APIs (e.g., Gemini AI, Supabase) and return appropriate error messages to the user without crashing.

#### 4.4 Maintainability & Scalability
- **NFR-07**: The backend code shall be modular, separating route definitions from business logic and database access.
- **NFR-08**: The system should be scalable horizontally by running multiple instances of the Node.js server.

---

### 5. Appendices
**Appendix A: Glossary**
- **JWT**: JSON Web Token
- **API**: Application Programming Interface
- **REST**: Representational State Transfer
- **LLM**: Large Language Model
