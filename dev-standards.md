# Personal Dev Standards

> Generic reference for any new app — mirroring the conventions from my main project so everything looks like it came from the same hand.

---

## Table of Contents

1. [Stack & Tooling](#1-stack--tooling)
2. [Monorepo Layout](#2-monorepo-layout)
3. [Frontend Directory Structure](#3-frontend-directory-structure)
4. [Backend Directory Structure](#4-backend-directory-structure)
5. [TypeScript](#5-typescript)
6. [Prettier](#6-prettier)
7. [ESLint — Frontend](#7-eslint--frontend)
8. [ESLint — Backend](#8-eslint--backend)
9. [Tailwind & Shadcn/UI](#9-tailwind--shadcnui)
10. [Component Architecture](#10-component-architecture)
11. [Code Style Rules](#11-code-style-rules)
12. [State & Data Fetching](#12-state--data-fetching)
13. [Backend Patterns](#13-backend-patterns)
14. [Database / ORM](#14-database--orm)
15. [Testing](#15-testing)
16. [Naming Conventions](#16-naming-conventions)
17. [Security Rules](#17-security-rules)
18. [Performance Rules](#18-performance-rules)
19. [Docker & Deployment](#19-docker--deployment)
20. [Git & PR Conventions](#20-git--pr-conventions)

---

## 1. Stack & Tooling

| Layer | Choice |
|---|---|
| Package manager | `pnpm@10.22.0` — never substitute with npm or yarn |
| Monorepo orchestration | Turborepo (`turbo`) |
| Frontend | React 19 + Vite 7 + TypeScript 5.5 |
| Routing | `react-router-dom` v7 |
| Server state | TanStack Query v5 |
| Client state | Zustand |
| UI primitives | Shadcn/UI (`new-york` style) + Radix |
| Styling | Tailwind CSS 3.4 + CSS variables for design tokens |
| Icons | Lucide React |
| Backend | Express + TypeScript |
| ORM | TypeORM with decorators |
| Queue | BullMQ + Redis |
| DB | PostgreSQL |
| Testing | Vitest (unit + integration), Playwright (e2e) |
| CI build | `pnpm run build` via Turborepo (`dependsOn: ["^build"]`) |

---

## 2. Monorepo Layout

```
root/
├── frontend/
├── backend/
├── shared/                  # shared TS types/utils, compiled before consumers
├── packages/
│   └── <sdk-name>/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json             # root scripts only, no app code
└── docker-compose.yml
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - frontend
  - backend
  - shared
  - packages/*
```

### `turbo.json`

```json
{
  "globalDependencies": ["pnpm-lock.yaml"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "envMode": "loose"
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

### Root `package.json` scripts pattern

```json
{
  "scripts": {
    "dev": "concurrently \"pnpm run dev:frontend\" \"pnpm run dev:backend\"",
    "dev:frontend": "turbo run dev --filter=frontend",
    "dev:backend": "turbo run dev --filter=backend",
    "dev:worker": "turbo run dev:worker --filter=backend",
    "build": "turbo run build",
    "build:frontend": "turbo run build --filter=frontend",
    "build:backend": "turbo run build --filter=backend",
    "test": "turbo run test",
    "test:frontend": "turbo run test --filter=frontend",
    "test:backend": "turbo run test --filter=backend",
    "lint:frontend": "turbo run lint --filter=frontend",
    "lint:backend": "turbo run lint --filter=backend",
    "install:all": "pnpm install"
  }
}
```

---

## 3. Frontend Directory Structure

```
frontend/src/
├── main.tsx                  # Entry point — do not touch lightly
├── App.tsx                   # Root component + router — do not touch lightly
├── index.css                 # Global styles + Tailwind directives
│
├── pages/                    # Route-level components ONLY (no business logic)
│   ├── app/                  # Authenticated org-scoped routes
│   ├── auth/                 # Login, register, etc.
│   └── public/               # Public-facing pages
│
├── components/               # Feature components (contain business logic)
│   ├── [domain]/             # One folder per feature domain
│   │   ├── DomainComponent.tsx
│   │   ├── hooks/
│   │   │   └── use-domain-thing.ts
│   │   ├── utils/
│   │   │   └── domain-helpers.ts
│   │   ├── constants.ts
│   │   └── types.ts
│   └── ui/                   # Shadcn-generated primitives (auto-generated, don't edit)
│
├── harmony-components/       # Presentational, reusable design-system components
│   ├── primitives/           # Atomic: Badge, Avatar, Tag…
│   ├── layouts/              # Layout shells
│   └── panel.tsx             # Use Panel (not Card) everywhere
│
├── hooks/                    # Global React hooks
├── services/                 # API service layer (one file per domain)
├── stores/                   # Zustand stores
├── contexts/                 # React Contexts
├── providers/                # Provider wrappers — do not touch lightly
├── lib/                      # Pure utilities, no React
│   ├── utils.ts              # cn() and misc helpers
│   ├── formatters.ts         # formatDate, formatCurrency, formatNumber
│   ├── date-utils.ts         # date math
│   ├── string-utils.ts       # truncate, capitalize, slugify
│   ├── validation.ts         # isEmail, isUrl…
│   ├── queryClient.ts        # TanStack Query config
│   └── queryKeys.ts          # Centralized cache key factory
├── constants/                # App-wide constants
├── types/                    # Shared TypeScript types
├── config/                   # Frontend config (reads env vars once, exports typed values)
└── i18n/                     # i18next setup + locale files
```

### Import aliases (`tsconfig.json` + Vite)

```json
{
  "@frontend/*": ["./src/*"],
  "@components/*": ["./src/components/*"],
  "@harmony-components/*": ["./src/harmony-components/*"],
  "@hooks/*": ["./src/hooks/*"],
  "@services/*": ["./src/services/*"],
  "@stores/*": ["./src/stores/*"],
  "@contexts/*": ["./src/contexts/*"],
  "@lib/*": ["./src/lib/*"],
  "@types/*": ["./src/types/*"],
  "@constants/*": ["./src/constants/*"],
  "@config/*": ["./src/config/*"],
  "@pages/*": ["./src/pages/*"],
  "shared/*": ["../shared/*"]
}
```

---

## 4. Backend Directory Structure

```
backend/src/
├── app.ts                    # Express app factory
├── worker.ts                 # BullMQ worker entry
├── config.ts                 # ONLY file allowed to read process.env
├── data-source.ts            # TypeORM DataSource
├── entities.ts               # Register all TypeORM entities
├── migrations.ts             # Register all migrations
│
├── controllers/              # Route handlers (thin — delegate to services)
│   ├── _shared/
│   │   └── base.controller.ts
│   └── [domain]/
│       └── domain.controller.ts
│
├── routes/
│   ├── private/              # JWT-authenticated (/api/*)
│   ├── public/               # API-key-authenticated (/v1/*)
│   └── admin/                # Admin-key-authenticated (/admin/*)
│
├── services/                 # Business logic
│   └── [domain]/
│       └── domain.service.ts
│
├── models/                   # TypeORM entities
│   └── [entity].ts
│
├── middleware/               # Auth, org, rate-limit, validation, error handler
├── queues/                   # BullMQ queue definitions and processors
├── lib/
│   └── http.ts               # sendOk(), sendError() helpers
├── repositories/             # Custom TypeORM repositories
├── types/                    # Backend-specific types
├── utils/                    # Pure utility functions
└── migrations/               # TypeORM migration files
```

---

## 5. TypeScript

### Config baseline (frontend `tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": false,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "paths": { /* aliases from §3 */ }
  }
}
```

### Config baseline (backend `tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "strict": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "baseUrl": "./src",
    "paths": { /* aliases from §4 */ }
  },
  "include": ["src/**/*"]
}
```

### Rules

- Avoid `any`. If you must, leave a comment explaining why.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- Use `import type` for type-only imports.
- Prefix intentionally unused params with `_`.

---

## 6. Prettier

Single shared config (`.prettierrc` or `prettier.config.js`) — identical between frontend and backend:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

Frontend-only additions (plugins in `prettier.config.js`):

```js
export default {
  // ...same core options...
  plugins: [
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
  ],
  importOrder: [
    '^react$',
    '^react-dom(.*)$',
    '^react(.*)$',
    '^react-router(.*)$',
    '<THIRD_PARTY_MODULES>',
    '^@config(.*)$',
    '^@constants(.*)$',
    '^@stores(.*)$',
    '^@contexts(.*)$',
    '^@providers(.*)$',
    '^@services(.*)$',
    '^@hooks(.*)$',
    '^@components(.*)$',
    '^@harmony-components(.*)$',
    '^@pages(.*)$',
    '^@lib(.*)$',
    '^@types(.*)$',
    '^@frontend/(.*)$',
    '^shared(.*)$',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  importOrderCaseInsensitive: true,
  importOrderParserPlugins: ['typescript', 'jsx'],
};
```

---

## 7. ESLint — Frontend

Use ESLint 9 flat config (`eslint.config.js`):

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'test/**', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2020, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      // Enforce design-token usage and standard Tailwind utilities
      'no-restricted-syntax': [
        'warn',
        {
          selector: "CallExpression[callee.property.name=/^toLocale(String|DateString|TimeString)$/]",
          message: 'Use lib/formatters helpers instead of toLocale* in UI.',
        },
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/\\bfont-[5-9]00\\b/]",
          message: 'Use font-medium/font-semibold/font-bold instead of font-500/600/700.',
        },
      ],
    },
  },
  prettierConfig
);
```

---

## 8. ESLint — Backend

Use ESLint 9 flat config (`eslint.config.mjs`):

```js
import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '*.js', 'scripts/**', 'test/**', 'coverage/**'],
  },
  // Controllers must use sendOk() instead of res.json()
  {
    files: ['src/controllers/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "CallExpression[callee.object.name='res'][callee.property.name='json']",
          message: 'Use sendOk(res, data) from src/lib/http in controllers.',
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', project: './tsconfig.json' },
      globals: { console: 'readonly', process: 'readonly', Buffer: 'readonly' },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-debugger': 'error',
      'no-unreachable': 'warn',
      // Centralize all env var access in config.ts
      'no-restricted-properties': ['error', {
        object: 'process',
        property: 'env',
        message: 'Use config from src/config.ts instead of process.env directly.',
      }],
    },
  },
  // Allow process.env only in the central config file
  {
    files: ['src/config.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  // Entities must not import config (keeps migrations safe in CI)
  {
    files: ['src/models/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'config', message: 'Do not import global config from entities.' },
          { name: '../config', message: 'Do not import global config from entities.' },
          { name: '../../config', message: 'Do not import global config from entities.' },
        ],
      }],
    },
  },
];
```

---

## 9. Tailwind & Shadcn/UI

### `tailwind.config.js` baseline

```js
export default {
  darkMode: ['class'],
  content: ['index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Geist', 'sans-serif'] },
      colors: {
        // Map CSS variable tokens so components stay theme-aware
        'harmony-surface-1': 'hsl(var(--surface-1))',
        'harmony-surface-2': 'hsl(var(--surface-2))',
        'harmony-border-subtle': 'hsl(var(--border-subtle))',
        'harmony-fg': 'hsl(var(--fg))',
        'harmony-fg-secondary': 'hsl(var(--fg-secondary))',
        'harmony-cta': 'hsl(var(--cta))',
      },
    },
  },
  plugins: ['@tailwindcss/typography', 'tailwindcss-animate'],
};
```

### `components.json` (Shadcn)

```json
{
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": { "config": "tailwind.config.js", "css": "src/index.css", "baseColor": "neutral", "cssVariables": true },
  "aliases": { "components": "@frontend/components", "utils": "@frontend/lib/utils" },
  "iconLibrary": "lucide"
}
```

### Rules

- **Never use `Card`** — use `Panel` (custom primitive based on design tokens).
- Use `cn()` from `lib/utils` for conditional class merging.
- Use design tokens (`text-harmony-fg`, `bg-harmony-surface-1`) instead of raw gray classes (`text-gray-*`).
- Use standard Tailwind font utilities (`font-medium`, `font-semibold`, `font-bold`) — not `font-500`.

---

## 10. Component Architecture

### Four tiers

| Tier | Location | Rule |
|---|---|---|
| Page | `pages/` | Routing + composition only. Zero business logic. |
| Feature | `components/[domain]/` | Owns data fetching, mutations, domain logic. |
| Presentational | `harmony-components/` | Pure props-in / JSX-out. No side effects. |
| UI Primitive | `components/ui/` (shadcn) | Auto-generated atoms. Treat as read-only. |

### Page component

```tsx
// pages/app/contacts/index.tsx
export const ContactsPage = () => (
  <PageLayout>
    <ContactFilters />
    <ContactList />
  </PageLayout>
);
```

### Feature component

```tsx
// components/contacts/ContactList.tsx
export const ContactList = () => {
  const { data: contacts, isLoading } = useContacts();
  if (isLoading) return <ContactListSkeleton />;
  return <ContactTable contacts={contacts} />;
};
```

### Presentational component

```tsx
// harmony-components/primitives/badge.tsx
interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export const Badge = ({ label, variant = 'default', className }: BadgeProps) => (
  <span className={cn(VARIANTS[variant], className)}>{label}</span>
);
```

### Feature folder structure

```
components/contacts/
├── ContactList.tsx
├── ContactListItem.tsx
├── hooks/
│   ├── use-contacts.ts
│   └── use-contact-form.ts
├── utils/
│   └── contact-helpers.ts
├── constants.ts
└── types.ts
```

### Size limits

- Preferred: 100–200 LOC per component.
- Acceptable: up to ~400 LOC for forms / tables with lots of fields.
- Must split: > 400 LOC, or does more than one thing, or has > 3 independent `useEffect` blocks.

---

## 11. Code Style Rules

### Exports — always named arrow functions

```tsx
// ✅
export const MyComponent = ({ title }: Props) => <h1>{title}</h1>;

// ❌ export default
// ❌ function declaration with export default
```

### Import order (manually, if not using the Prettier plugin)

```tsx
// 1. React & framework
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. External libraries
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 3. Internal aliases
import { useAppStore } from '@stores/appStore';
import { Button } from '@components/ui/button';

// 4. Relative imports
import { ContactForm } from './ContactForm';

// 5. Type imports
import type { Contact } from './types';
```

### `useEffect` — body must be a single function call

```tsx
// ❌ Logic inside useEffect
useEffect(() => {
  fetch('/api/things').then(r => r.json()).then(setThings);
}, []);

// ✅ Named function called from useEffect
const loadThings = useCallback(async () => {
  const data = await thingService.getAll();
  setThings(data);
}, []);

useEffect(() => { loadThings(); }, [loadThings]);

// ✅ Better — use TanStack Query instead of useEffect for data
const { data } = useQuery({ queryKey: ['things'], queryFn: thingService.getAll });
```

### Utility functions — never inline above components

```tsx
// ❌
const formatDate = (d: string) => new Date(d).toLocaleDateString();
export const MyComponent = () => { ... };

// ✅ — put in lib/formatters.ts and import
import { formatDate } from '@lib/formatters';
export const MyComponent = () => { ... };
```

### General rules

- No `useEffect` for data fetching — use TanStack Query.
- No `any` unless absolutely necessary and commented.
- Never leave unused imports, variables, or commented-out code.
- No `var` — only `const` / `let`.
- Prefer template literals over string concatenation.
- Never hardcode UI text — use `useTranslation()` (i18next).
- Never use IIFEs in JSX.

---

## 12. State & Data Fetching

### TanStack Query

```tsx
// services/contact.ts
export const contactService = {
  getAll: (params: ContactListParams) =>
    api.get<Contact[]>('/contacts', { params }),
  getById: (id: string) =>
    api.get<Contact>(`/contacts/${id}`),
  create: (data: CreateContactDto) =>
    api.post<Contact>('/contacts', data),
};

// lib/queryKeys.ts — centralize all query keys
export const queryKeys = {
  contacts: {
    all: () => ['contacts'] as const,
    list: (filters: object) => ['contacts', 'list', filters] as const,
    detail: (id: string) => ['contacts', id] as const,
  },
};

// hooks/use-contacts.ts
export const useContacts = (filters = {}) =>
  useQuery({
    queryKey: queryKeys.contacts.list(filters),
    queryFn: () => contactService.getAll(filters),
  });
```

### Zustand

```tsx
// stores/uiStore.ts
interface UiState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
```

---

## 13. Backend Patterns

### Controllers — thin, delegate to services

```ts
// controllers/contacts/contact.controller.ts
import { BaseController } from '../_shared/base.controller';
import { sendOk } from '../../lib/http';
import { hasPermission } from '../../decorators/permissions';
import { contactSchema } from './contact.schema';

export class ContactController extends BaseController {
  @hasPermission('contact:read:team')
  async list(req: Request, res: Response) {
    const contacts = await this.contactService.findAll(req.org.id);
    sendOk(res, contacts);
  }

  @hasPermission('contact:create:team')
  async create(req: Request, res: Response) {
    const body = contactSchema.parse(req.body);
    const contact = await this.contactService.create(req.org.id, body);
    sendOk(res, contact);
  }
}
```

### `src/lib/http.ts` helpers

```ts
export const sendOk = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ data });

export const sendError = (res: Response, message: string, status = 400) =>
  res.status(status).json({ error: message });
```

### `src/config.ts` — single env accessor

```ts
// The ONLY file allowed to read process.env (enforced by ESLint)
export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
} as const;
```

### Permission decorator pattern

```ts
// RBAC format: resource:action:scope
@hasPermission('user:read:own')
@hasAnyPermission(['user:read:own', 'user:read:team'])
@hasAllPermissions(['project:read:team', 'user:read:team'])
```

### Route namespacing

```
/api/*          private, JWT-authenticated
/v1/*           public, API-key-authenticated
/admin/*        admin, admin-key-authenticated
```

---

## 14. Database / ORM

### TypeORM entity pattern

```ts
// models/contact.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, BaseEntity } from 'typeorm';
import { Organization } from './organization';

@Entity('contacts', { schema: 'public' })
export class Contact extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @ManyToOne(() => Organization, (org) => org.contacts)
  organization: Organization;

  @Column()
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Rules

- Register new entities in `src/entities.ts`.
- Register new migrations in `src/migrations.ts`.
- Entities must **not** import `config.ts` (ESLint enforced).
- Multi-tenant queries must always scope by `organizationId`.
- Never run `migrate:run` manually — leave it to humans / CI.

---

## 15. Testing

### Vitest config baseline (frontend)

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    exclude: ['**/e2e/**', '**/node_modules/**'],
  },
  resolve: { alias: { /* same as tsconfig paths */ } },
});
```

### Vitest config baseline (backend)

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },   // avoid DB deadlocks
    sequence: { concurrent: false },
    setupFiles: ['test/setup-env.ts', 'src/test/setup.ts'],
    include: ['test/**/*.test.ts', 'test/e2e/**/*.e2e.test.ts'],
    testTimeout: 30_000,
  },
});
```

### File naming

| Kind | Pattern |
|---|---|
| Unit test | `*.test.ts` / `*.test.tsx` |
| Integration / e2e | `*.e2e.test.ts` |
| Test setup | `test/setup.ts`, `test/setup-env.ts` |

### Rules

- Backend: run Vitest with `singleFork: true` and `sequence.concurrent: false` to prevent DB deadlocks.
- Never test implementation details — test behavior.
- Cover: critical business paths, API contracts for new routes, UI logic for complex components.
- Use `_` prefix for params you ignore in test callbacks.

---

## 16. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files (components) | PascalCase | `ContactCard.tsx` |
| Files (hooks) | camelCase with `use-` prefix | `use-contacts.ts` |
| Files (services, utils, constants) | kebab-case | `contact-helpers.ts` |
| Files (backend) | kebab-case | `contact.controller.ts` |
| React components | PascalCase | `ContactCard` |
| Hooks | `useXxx` | `useContacts` |
| Zustand stores | `useXxxStore` | `useUiStore` |
| Services (frontend) | camelCase object | `contactService` |
| Classes (backend) | PascalCase | `ContactController` |
| Variables/functions | camelCase | `fetchContacts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| DB tables | snake_case plural | `contacts`, `user_team_memberships` |
| Env vars | SCREAMING_SNAKE_CASE | `DATABASE_URL` |

---

## 17. Security Rules

- **Never** commit `.env` files — only `.env.example` templates.
- **Never** expose server env vars to frontend code.
- All env vars on the backend flow through `src/config.ts` (ESLint-enforced).
- All private API routes validate JWT and org membership via middleware.
- Multi-tenant queries always filter by `organizationId`.
- CORS configured for trusted origins only.
- Public API uses API-key auth; private API uses JWT + refresh tokens.
- No real PII in test fixtures — use generated/fake data.

---

## 18. Performance Rules

- Lazy-load heavy components with `React.lazy` + `Suspense`.
- Use TanStack Query's `staleTime` and `gcTime` appropriately.
- Heavy/long-running operations go to BullMQ queues, never inline in request handlers.
- Use connection pooling for the database.
- Use Redis for session storage and job queues.
- Vite manual chunks: separate `vendor`, `ui`, and `data` chunks.

---

## 19. Docker & Deployment

### `docker-compose.yml` baseline

```yaml
version: '3.8'
services:
  frontend:
    build:
      context: frontend
      dockerfile: ../deployments/dockerfiles/frontend.Dockerfile
    ports:
      - "${FRONTEND_PORT:-5000}:5000"
    deploy:
      resources:
        limits: { cpus: '1', memory: 512M }

  backend:
    build:
      context: .
      dockerfile: deployments/dockerfiles/backend.Dockerfile
    ports:
      - "3000:3000"
    env_file: ./backend/.env

  worker:
    build:
      context: .
      dockerfile: deployments/dockerfiles/worker.Dockerfile
    env_file: ./backend/.env
    depends_on:
      - backend
```

### Rules

- Separate Dockerfiles for `frontend`, `backend`, and `worker`.
- `worker` depends on `backend` in Compose.
- Use `env_file` for secrets — never `environment:` with literal secrets.
- Resource limits in production Compose files.

---

## 20. Git & PR Conventions

### Commit messages — Conventional Commits

```
feat: add contact merge endpoint
fix: debounce search to prevent rapid API calls
refactor: extract useContacts hook from ContactList
chore: update pnpm lockfile
docs: document queryKeys pattern
test: add e2e tests for contact creation flow
```

### PR title — same Conventional Commit format

Do NOT include `[codex]`, ticket IDs in brackets, or other prefixes.

### PR description template

```md
## What changed
- 

## Why
- 

## How it works
- 

## Risks / edge cases
- 

## How to test
- [ ] 
```

### Branch naming

```
feat/contact-merge
fix/debounce-search
chore/update-deps
```

### General

- Squash or rebase before merging — keep history clean.
- Run the smallest relevant check before requesting review (`lint` + `test:unit` at minimum).
- Never force-push to `main`/`master`.
