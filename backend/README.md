# VoxOrtho Backend

Backend API for the VoxOrtho orthoptist SaaS. This service handles the management of orthoptic consultations and prepares for AI-driven transcription structuring.

## Architecture

The backend follows a layered architecture:
- **API Layer**: Fastify server with REST endpoints.
- **Validation Layer**: Zod schemas for request validation.
- **Service Layer**: Business logic (e.g., `AIService` for structuring transcripts).
- **Repository Layer**: Data access abstraction (currently in-memory).

## Installation

```bash
cd backend
npm install
```

## Running the Server

```bash
npm run dev
```
The server starts on `http://localhost:3000`.

## Running Tests

```bash
npm test
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/api/consultations` | GET | List all consultations |
| `/api/consultations` | POST | Create a new consultation |
| `/api/consultations/:id` | GET | Get a consultation by ID |
| `/api/consultations/:id/transcript` | POST | Update consultation transcript |
| `/api/consultations/:id/structure` | POST | Structure transcript using AI (Mocked) |

## JSON Schema & AI Integration

The file `src/domain/schemas/consultation.schema.json` defines the strict contract for structured medical data. Future AI integrations (LLMs) will use this schema to ensure that extracted data is valid and consistent.

The current AI logic is mocked in `src/services/mock-ai.service.ts`.
