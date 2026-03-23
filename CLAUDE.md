@AGENTS.md

# Treasury Multi-Agent Committee

## Project Overview
AI投資委員会シミュレーター。Next.js 16 + Firebase (Firestore + Auth) + Cloud Run。

## Key Architecture
- **Frontend**: Next.js 16 App Router, shadcn/ui v4 (base-ui, NOT Radix), Tailwind v4
- **Backend**: Next.js Route Handlers → Firebase Admin SDK → Firestore
- **Auth**: Firebase Auth (Email/Password), client-side via auth-provider.tsx
- **AI**: Multi-provider LLM (OpenRouter/Anthropic/OpenAI/LM Studio/Dummy), orchestrated in /api/runs/route.ts
- **Deploy**: Cloud Run (Dockerfile, standalone output) + Firebase Hosting (proxy)

## shadcn/ui v4 Notes
- Button does NOT support `asChild`. Use `render` prop or Link with `buttonVariants()`.
- Components use @base-ui/react, NOT @radix-ui.

## Local Development
- Firebase Emulator ports: Auth=9199, Firestore=8181, UI=4100 (avoid conflict with other projects on default ports)
- Dev server: port 3002, hostname 0.0.0.0
- `FIRESTORE_EMULATOR_HOST` env var auto-detected by firebase-admin
- Auth uses production Firebase Auth (not emulator) because browser connects remotely via Tailscale

## Deploy Commands
```bash
# Cloud Run
gcloud run deploy treasury-committee --source=. --region=asia-northeast1 --allow-unauthenticated --memory=512Mi
# Firebase Hosting
firebase deploy --only hosting --project treasury-committee
```

## Important Files
- `src/app/api/runs/route.ts` - Deliberation orchestrator (the core)
- `src/lib/ai/llm-client.ts` - LLM provider implementations
- `src/lib/ai/personas.ts` - Default persona definitions
- `src/lib/types.ts` - All types + OpenRouter model catalog with pricing
- `src/lib/firebase/admin.ts` - Server-side Firestore (auto-detects emulator)
- `src/lib/firebase/config.ts` - Client-side Firebase init
