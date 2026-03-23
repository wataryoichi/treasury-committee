# Treasury Multi-Agent Committee

AI投資委員会シミュレーター

複数のAI専門家ペルソナ（議長・BTC専門家・Gold専門家・マクロ専門家・リスクオフィサー・エディター）が、企業トレジャリーの投資判断を構造化された審議フローで議論・評価するWebアプリケーションです。

**Live Demo:** https://treasury-committee.web.app

## Features

- **ケース管理** - 企業の財務条件・制約条件・候補資産を入力してケースを作成
- **6つのAIペルソナ** - Chair主導の構造化審議（論点定義→一次意見→相互反論→リスク評価→統合→レポート）
- **ペルソナ別モデル設定** - OpenRouter利用時、ペルソナごとに異なるモデルを指定可能
- **マルチプロバイダー対応** - OpenRouter / Anthropic / OpenAI / LM Studio（ローカルLLM） / ダミー
- **リアルタイム進捗表示** - 審議ステップの進行状況を3秒ごとに自動更新
- **ステップ出力の展開表示** - 各ペルソナの一次意見・反論をクリックで確認
- **Markdownエクスポート** - 最終レポートのみ or 全審議過程を含む完全版
- **Firebase認証** - Email/Passwordログイン
- **Firebase Emulator対応** - ローカル開発でプロダクションと分離

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **shadcn/ui v4** (base-ui based)
- **Firebase** (Firestore + Auth + Hosting)
- **Cloud Run** (SSR deployment)

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

# Emulators (local dev)
NEXT_PUBLIC_USE_EMULATORS=true
NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT=8181
NEXT_PUBLIC_AUTH_EMULATOR_PORT=9199
FIRESTORE_EMULATOR_HOST=localhost:8181
FIREBASE_AUTH_EMULATOR_HOST=localhost:9199
```

### 3. Firebase setup

- Enable **Email/Password** authentication in the Firebase Console
- Enable **Cloud Firestore** in the Firebase Console

### 4. Seed the admin user

Via API endpoint:

```bash
curl -X POST http://localhost:3002/api/auth/seed \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"your-password"}'
```

Or via script:

```bash
SEED_EMAIL=your@email.com SEED_PASSWORD=your-password npx tsx scripts/seed-user.ts
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3002, all interfaces) |
| `npm run dev:emulators` | Start Firebase emulators (Auth:9199, Firestore:8181) |
| `npm run dev:full` | Start emulators + dev server concurrently |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated routes (with sidebar)
│   │   ├── page.tsx         # Dashboard
│   │   ├── cases/           # Investment cases (list, create, detail)
│   │   ├── personas/        # AI persona configuration
│   │   └── settings/        # Model settings (provider, model, pricing)
│   ├── api/
│   │   ├── auth/seed/       # User seed endpoint
│   │   ├── cases/           # Cases CRUD
│   │   ├── personas/        # Personas CRUD
│   │   ├── runs/            # Deliberation execution + progress + export
│   │   └── settings/        # Model settings API
│   └── login/               # Login page (unauthenticated)
├── components/
│   ├── auth/                # Auth provider & guard
│   ├── cases/               # Case form
│   ├── layout/              # App sidebar
│   └── ui/                  # shadcn/ui components
├── hooks/                   # SWR data fetching hooks
└── lib/
    ├── ai/                  # LLM clients, persona definitions, orchestrator
    ├── firebase/            # Client SDK, Admin SDK, auth, collections
    ├── schemas.ts           # Zod validation schemas
    └── types.ts             # TypeScript types, model catalog with pricing
```

## Deployment

### Cloud Run (production)

```bash
gcloud run deploy treasury-committee \
  --source=. \
  --region=asia-northeast1 \
  --allow-unauthenticated \
  --memory=512Mi
```

### Firebase Hosting (proxy to Cloud Run)

```bash
firebase deploy --only hosting --project your-project-id
```

## AI Deliberation Flow

1. **Chair** - 論点定義・アジェンダ設定
2. **Specialists** - BTC/Gold/Macro各専門家が一次意見を提出
3. **Rebuttals** - 各専門家が他の意見に反論・補足
4. **Risk Officer** - Red flags・リスク整理
5. **Chair** - 全意見を統合、最終提案を策定
6. **Editor** - Markdownレポートに整形
