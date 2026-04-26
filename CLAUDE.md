@AGENTS.md

# 마비노기 헬퍼 v2

마비노기 게임 정보를 조회하고 관리하는 Next.js 웹 앱.

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| 백엔드 | Supabase (DB + Auth) |
| 언어 | JavaScript (JSX) |
| 패키지 매니저 | npm |

## 프로젝트 구조

```
app/                  # Next.js App Router 라우트
  layout.js           # 루트 레이아웃
  page.js             # 홈 페이지
  globals.css         # 전역 스타일 (Tailwind)
lib/
  supabase.js         # 클라이언트 컴포넌트용 Supabase ('use client')
  supabase-server.js  # 서버 컴포넌트/Server Action/Route Handler용 Supabase (async)
public/               # 정적 파일
```

## Supabase 클라이언트 사용 규칙

- **클라이언트 컴포넌트** (`'use client'`): `lib/supabase.js`의 `createClient()` 사용
- **서버 컴포넌트 / Server Action / Route Handler**: `lib/supabase-server.js`의 `createClient()` 사용 (반드시 `await`)
- 서버 컴포넌트에서는 쿠키 **읽기만** 가능 — 쿠키 **쓰기**는 Server Action 또는 Route Handler에서만

```js
// 클라이언트 컴포넌트
import { createClient } from '@/lib/supabase'
const supabase = createClient()

// 서버 컴포넌트
import { createClient } from '@/lib/supabase-server'
const supabase = await createClient()
```

## Next.js 16 주의사항

- `cookies()`, `headers()` 등 Request-time API는 **async** — 반드시 `await` 사용
- Server Component에서는 `cookies().set()` / `.delete()` 불가
- 코드 작성 전 `node_modules/next/dist/docs/` 가이드 확인 (AGENTS.md 지침)

## 개발 규칙

- 환경변수는 `.env.local`에만 작성 — 절대 커밋 금지 (`.gitignore`의 `.env*`로 보호)
- 새 라우트는 `app/` 디렉토리 하위에 폴더 + `page.js` 방식으로 생성
- 공통 UI 컴포넌트는 `components/` 디렉토리에 배치
- DB 접근 로직은 서버 사이드(Server Action / Route Handler)에서 처리
- Tailwind CSS v4 사용 — PostCSS 플러그인 방식 (`@tailwindcss/postcss`)

## 환경변수

```
NEXT_PUBLIC_SUPABASE_URL      # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase anon 공개 키
```

## 주요 기능

### 물물교환 (trades)
- `trades` 테이블: NPC별 교환 정보 (give/receive 아이템·수량, scope, reset_cycle)
- `trade_progress` 테이블: 유저별 완료 기록 (partial unique indexes)
  - `character_id IS NOT NULL` → `(user_id, character_id, trade_id)` 유니크
  - `character_id IS NULL` → `(user_id, server, trade_id)` 유니크
- `scope`: `'character'` (캐릭터별) / `'server'` (서버 공통)
- `reset_cycle`: `'daily'` / `'weekly'` — 클라이언트에서 KST 자정/주 기준으로 만료 체크
- `upsertTradeProgress`: partial index 때문에 select-then-update-or-insert 패턴 사용
- 관리자: `components/admin/TradesTab.jsx` / `app/actions/trades.js`
- 유저 탭: `components/tabs/TradesPanel.jsx` — optimistic toggle
