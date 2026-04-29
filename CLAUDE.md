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

### 초기화 시스템 (lib/resetUtils.js)
- 퀘스트·물물교환·콘텐츠 공통으로 사용
- `reset_type`: `'none'` / `'daily'` / `'weekly'`
- `reset_day`: 0~6 (0=일, 1=월 ... 주간일 때만 사용)
- `reset_hour`: 0~23 (KST 기준 초기화 시각)
- `getLastResetTime(type, day, hour)` → 가장 최근 초기화 시각(UTC Date) 반환
- `isCompleted(completedAt, type, day, hour)` → completedAt이 마지막 초기화 이후면 true
- `reset_type='none'`: completedAt이 있으면 항상 true (영구 완료)
- 관리자 등록 UI: `components/admin/ResetFields.jsx` — 프리셋(매일 6시, 매주 월 9시) + 직접 입력

### 물물교환 (trades)
- `trades` 테이블: NPC별 교환 정보 (give/receive 아이템·수량, scope, reset_type/day/hour)
- `trade_progress` 테이블: 유저별 완료 기록 (partial unique indexes)
  - `character_id IS NOT NULL` → `(user_id, character_id, trade_id)` 유니크
  - `character_id IS NULL` → `(user_id, server, trade_id)` 유니크
- `scope`: `'character'` (캐릭터별) / `'server'` (서버 공통)
- 완료 판단: `isTradeDone(trade, prog)` — `reset_type='none'`이면 completed 그대로, 아니면 `isCompleted(completed_at, ...)`
- `upsertTradeProgress`: partial index 때문에 select-then-update-or-insert 패턴 사용
- 관리자: `components/admin/TradesTab.jsx` / `app/actions/trades.js`
- 유저 탭: `components/tabs/TradesPanel.jsx` — optimistic toggle

### 퀘스트/미션 (quests)
- `quests.scope`: `'character'` (캐릭터별) / `'server'` (서버 공통, 같은 서버 캐릭터 중 1개 완료 시 공유)
- `quest_progress` 저장 구조: `{ user_id, character_id, server, condition_id, value, completed_at }`
  - character scope: `character_id` 사용, `server = null`
  - server scope: `character_id = null`, `server` 사용
  - partial unique indexes: `(character_id, condition_id) WHERE character_id IS NOT NULL`, `(user_id, server, condition_id) WHERE server IS NOT NULL AND character_id IS NULL`
- `handleChangeCondition(condId, type, rawValue, maxValue)` — condScopeMap으로 scope 조회 후 upsertProgress 호출
- `upsertProgress({ characterId, server, conditionId, value, completedAt })` — 객체 파라미터, trades 패턴과 동일
- 완료 판단: `reset_type='none'`이면 value 기반, 아니면 `isCompleted(completed_at, ...)`
- 계층형 reset info 전달: `ri = { type, day, hour }`을 QuestCard→SectionDisplay→MissionDisplay→ConditionRow로 prop 전달
- `QuestsPanel`은 `character` (전체 객체) prop을 받음 — `character.id`, `character.server` 모두 필요
- 데이터 로드 시 character-scope + server-scope progress 동시 조회 후 condition_id 기준으로 병합

### 콘텐츠 (contents)
- `contents` 테이블: 콘텐츠명, 조건, 보상, reset_type/day/hour
- `content_progress`: `{ value, completed_at, updated_at }`
- 관리자: `components/admin/ContentsTab.jsx` / `app/actions/contents.js`
- 유저 탭: `components/tabs/ContentsPanel.jsx`

### 위치 관리 / 최적 경로 계산
- `locations` 테이블: 지역 정보 (name, emoji, region, sort_order)
- `location_connections` 테이블: 지역 간 연결 (location_a_id, location_b_id, travel_time 분)
- `dungeons` 테이블: 던전/필드보스 (name, emoji, location_id FK, dungeon_type: 'dungeon'|'field_boss')
- `items.location_id` FK: 아이템 획득 위치
- `trades.location_id` FK: NPC 위치 (경로 계산용) — 기존 text `location` 필드와 별개
  - 관리자 UI에서 `location_info:location_id(...)` alias로 조회 (text `location` 컬럼과 이름 충돌 방지)
- 관리자: `components/admin/LocationsTab.jsx` (지역/연결/던전 서브탭) / `app/actions/locations.js`
- 경로 계산: `lib/routeCalculator.js` — `buildGraph(connections)` + `calculateRoute(graph, startId, destIds)` (Dijkstra + greedy nearest-neighbor TSP)
- 유저 페이지: `app/route-planner/page.js` (서버) + `components/RoutePlannerView.jsx` (클라이언트)
  - 오늘의 미완료 trades(location_id 있는 것) 자동 로드 + 던전/수동 목적지 추가
  - 경로 결과: 각 목적지별 이동시간, 경유지, 해야 할 교환/던전 표시
