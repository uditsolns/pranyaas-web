# Pranyaas ElderCare

This project is a modern web application for elder care management, built with a robust React/Vite/TypeScript stack and styled with Tailwind CSS and shadcn/ui.

## Technologies

- **Frontend**: React (with Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **State Management**: React Query (TanStack)
- **Routing**: React Router
- **Form Handling**: React Hook Form with Zod validation
- **Backend API**: Integrated via Axios/Fetch (see `src/context/AuthContext.tsx` and components).

## Project Structure

- `src/components`: Reusable UI components.
- `src/pages`: Main application views (Dashboard, Patients, Tasks, etc.).
- `src/context`: Authentication and application-level state.
- `src/hooks`: Custom React hooks for data fetching and logic.
- `src/data`: Mock data and static configuration.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Bun (Recommended) or NPM

### Setup

1. **Install dependencies**:
   ```bash
   bun install
   # or
   npm install
   ```

2. **Start development server**:
   ```bash
   bun dev
   # or
   npm run dev
   ```

3. **Build for production**:
   ```bash
   bun run build
   # or
   npm run build
   ```
