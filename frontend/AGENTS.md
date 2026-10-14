# RehabMotion — Project Rules & Guidelines

## 1. Tech Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui.
- **Backend**: FastAPI (already exists).
  - Base URL from env: `VITE_API_BASE_URL`
  - Endpoint prefix: `/api/v1`
  - **CRITICAL**: Do NOT recreate backend endpoints or alter API contracts.

## 2. Mandatory Folder Structure
```text
src/
├── app/                  # Application root, routing, providers
├── pages/                # Page-level components
├── features/<domain>/    # Feature-specific logic, components, hooks, api
├── components/
│   ├── ui/               # shadcn/ui components (DO NOT edit manually)
│   └── shared/           # Reusable shared components
├── lib/                  # Utilities, helpers, axios/fetch client
├── types/                # Shared TypeScript type definitions
└── styles/               # Global CSS, theme configurations
```
*Do NOT create new folders outside of this pattern without explicit confirmation.*

## 3. Zero Dead Code
- Whenever creating or editing files, immediately remove unused imports, components, and variables.
- Never leave `// TODO nanti` comments for unrequested features — do not write code/stubs for features until explicitly requested.

## 4. UI/UX Design Principles (No "AI Slop")
- **Target Audience**: Elderly post-stroke rehabilitation patients.
- **Visual Style**:
  - High contrast (WCAG 2.1 AA compliant).
  - Large, easily accessible buttons and touch targets.
  - Clear, legible typography.
  - Calm, focused layouts with minimal cognitive load and zero unnecessary distractions.
  - **STRICTLY PROHIBITED**: Generic purple-blue gradients, heavy stacked shadow cards, redundant icon-in-circle badges, non-functional decorative clutter.

## 5. Backend Auth Contract
Do NOT guess or add extra fields to auth requests/responses.

- **POST `/auth/register`**
  - Request body:
    ```json
    {
      "email": "string",
      "full_name": "string",
      "password": "string (min 10 characters)",
      "role": "patient" | "caregiver"
    }
    ```
  - *Note*: Roles `"clinician"` and `"admin"` are NOT available in public register form.

- **POST `/auth/login`**
  - Request body:
    ```json
    {
      "email": "string",
      "password": "string"
    }
    ```

- **Auth Response (both register & login)**:
  ```json
  {
    "access_token": "string",
    "token_type": "bearer",
    "user": {
      "id": "string",
      "email": "string",
      "full_name": "string",
      "role": "patient" | "caregiver" | "clinician" | "admin",
      "is_active": boolean,
      "created_at": "string"
    }
  }
  ```

- **GET `/auth/me`**
  - Header: `Authorization: Bearer <token>`
  - Response: User object as defined above.

## 6. Execution Workflow
1. **Before big tasks**: Write a concise plan detailing the exact files and components to create/modify. Wait for user confirmation before executing.
2. **After execution**: Report all modified/created files and explicitly detail whether any old code was removed.
