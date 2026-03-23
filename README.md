# Treasury Multi-Agent Committee

AI投資委員会シミュレーター

複数のAIペルソナが投資案件を議論・評価する委員会シミュレーションシステムです。

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui v4** (base-ui based)
- **Firebase** (Firestore + Auth)
- **Anthropic Claude** (AI agent backend)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AI
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Firebase setup

- Enable **Email/Password** authentication in the Firebase Console (Authentication > Sign-in method).
- Enable **Cloud Firestore** in the Firebase Console.

### 4. Seed the admin user

```bash
npx tsx scripts/seed-user.ts
```

Or call the API endpoint:

```bash
curl -X POST http://localhost:3000/api/auth/seed
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated routes (with sidebar)
│   │   ├── page.tsx         # Dashboard
│   │   ├── cases/           # Investment cases
│   │   ├── personas/        # AI persona configuration
│   │   └── settings/        # Model settings
│   ├── api/                 # API routes
│   │   ├── auth/seed/       # User seed endpoint
│   │   ├── cases/           # Cases CRUD
│   │   ├── personas/        # Personas CRUD
│   │   ├── runs/            # Committee run execution
│   │   └── settings/        # Settings API
│   └── login/               # Login page (unauthenticated)
├── components/
│   ├── auth/                # Auth provider & guard
│   ├── cases/               # Case-related components
│   ├── layout/              # App sidebar
│   ├── personas/            # Persona components
│   ├── runs/                # Run execution components
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── ai/                  # AI agent logic
│   ├── firebase/            # Firebase client, admin, auth config
│   ├── schemas/             # Zod validation schemas
│   └── types.ts             # TypeScript type definitions
└── scripts/
    └── seed-user.ts         # Admin user seeding script
```

## Default Login

シードスクリプトで初期ユーザーを作成してください。メールアドレスとパスワードは `scripts/seed-user.ts` 内で環境変数から取得されます。

```bash
SEED_EMAIL=your@email.com SEED_PASSWORD=yourpassword npx tsx scripts/seed-user.ts
```
