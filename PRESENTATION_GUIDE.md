# Nyaya Legal Guidance System - Presentation Guide

This document is designed to help you prepare for your project presentation, viva, or demonstration. It covers the core aspects of the project from concept to implementation, including testing and potential examiner questions.

---

## 1. Introduction & Elevator Pitch
**Nyaya** is an AI-powered legal assistant designed specifically for the Indian context. It democratizes access to legal information by providing instant, localized, and easily understandable guidance. It bridges the gap between complex legal jargon and the common citizen.

## 2. Problem Statement & Solution
*   **The Problem:** Legal language is complex, consulting lawyers is expensive, and citizens often struggle to understand their basic rights, comprehend complex contracts, or locate nearby legal help.
*   **The Solution:** An intuitive web platform where users can:
    1. Ask legal questions in natural language.
    2. Upload complex legal documents (like leases or NDAs) for automatic summarization and risk analysis.
    3. Easily locate nearby police stations, courts, and lawyers on an interactive map.

---

## 3. Technology Stack & Explanation
*   **Frontend: Next.js (React) & Tailwind CSS**
    *   *Explanation:* Next.js is a React framework that provides fast rendering and a robust routing system. Tailwind CSS allows for rapid, modern, and responsive UI styling. `react-leaflet` is used to render the interactive map component.
*   **Backend: Node.js & Express.js**
    *   *Explanation:* Node.js provides a fast, non-blocking asynchronous architecture. Express.js makes it easy to build RESTful APIs, handle file uploads, and integrate with external AI services.
*   **Database & Storage: Supabase (PostgreSQL)**
    *   *Explanation:* Supabase acts as a Backend-as-a-Service (BaaS). It provides secure user authentication, a scalable relational database (PostgreSQL) for storing chat histories and document metadata, and Object Storage for securely holding user-uploaded PDFs and images.
*   **AI Engine: Google Gemini API**
    *   *Explanation:* Gemini acts as the brain of the system. It is a Large Language Model (LLM) utilizing Natural Language Processing (NLP) to understand context, summarize large unstructured texts, and answer legal questions based on Indian law.

---

## 4. System Architecture & Working Flow
The system follows a decoupled **3-tier architecture**: Presentation (Frontend), Application (Backend), and Data (Database/AI).

*   **Authentication Flow:** User logs in securely -> Backend verifies credentials against Supabase -> Backend issues a JSON Web Token (JWT) -> Frontend stores JWT to keep the session active securely.
*   **Chat Flow:** User sends a query -> Backend retrieves the user's past chat history from Supabase for context -> Backend sends history + new query to Gemini AI -> Gemini responds -> Backend saves the new interaction to the DB and returns the response to the Frontend.
*   **Document Analysis Flow:** User uploads a PDF -> Backend `multer` middleware buffers the file -> PDF text is extracted using the `pdf-parse` library -> File is saved to Supabase Storage -> Extracted text is sent to Gemini for structural analysis (Summary, Risks, Obligations) -> Results are saved to DB and displayed to the User.

---

## 5. Implementation Highlights
*   **Security:** Passwords are never stored in plain text; they are hashed using `bcrypt`. All protected routes require JWT authorization headers.
*   **NLP Prompt Engineering:** The Gemini model is given a strict "system prompt" instructing it to act as an Indian Legal expert, ensuring it cites relevant laws (like the BNS or IPC) while always including a disclaimer that its advice does not replace a human lawyer.
*   **Location Services:** The backend serves structured JSON datasets of legal services mapped by latitude and longitude, which the frontend visualizes using Leaflet maps.

---

## 6. Testing Workflow
1.  **Component Testing (Frontend):** Ensuring UI elements like forms, buttons, and markdown renderers display correctly on different screen sizes.
2.  **API Integration Testing (Backend):** Using tools like Postman to ensure endpoints (`/api/chat`, `/api/documents/upload`) handle requests properly, return the correct JSON structure, and throw `401 Unauthorized` errors if no JWT is provided.
3.  **End-to-End (E2E) User Flow Testing:** Manually going through the user journey in the browser: Registering an account -> Logging in -> Uploading a 5-page PDF -> Asking a question about it -> Checking the Map for nearby legal aid.
4.  **Error Handling & Edge Cases:** Testing what happens when a user uploads an invalid file type (e.g., an MP3 instead of a PDF), types empty chat messages, or if the Gemini API goes down (ensuring the UI shows friendly error messages instead of crashing).

---

## 7. Possible Presentation/Viva Questions (With Answers)

**Q1: How do you ensure the AI's legal advice is accurate and safe?**
*Answer:* We utilize "System Prompting" to strictly instruct the Gemini model to act as an Indian Legal Expert and to base its answers on Indian jurisdiction. Furthermore, the system is designed to provide *guidance*, not binding legal counsel. UI disclaimers are present to advise users to consult real lawyers for critical issues.

**Q2: How does the document analysis feature actually work under the hood?**
*Answer:* When a PDF is uploaded, the Node.js backend uses a library called `pdf-parse` to read the binary file and extract raw text. We truncate this text if it's too long, and then send it to the Gemini API with instructions to identify key fields like "Risks", "Obligations", and "Summary". The structured response from Gemini is saved to Supabase and displayed on the UI.

**Q3: How are you managing user sessions and security?**
*Answer:* We use JWT (JSON Web Tokens). Upon successful login, the backend generates a token containing the user's ID, signed with a secret key. The frontend stores this token locally and sends it in the `Authorization` header with every subsequent API request, ensuring stateless and secure communication.

**Q4: Why did you choose Supabase over MongoDB or Firebase?**
*Answer:* Supabase provides the robustness and strict data integrity of a relational PostgreSQL database while offering easy-to-use APIs similar to Firebase. crucially, it provides an all-in-one solution containing Auth, Database, and Object Storage (necessary for our PDF uploads) preventing us from needing three separate services.

**Q5: What happens if a user uploads a massive 500-page document?**
*Answer:* We implemented file size limits using the `multer` middleware on the backend to reject files over 10MB to prevent server memory crashes. For the AI analysis, we truncate the extracted text to a maximum of 50,000 characters before sending it to Gemini to ensure we stay within API token limits and maintain fast response times.
