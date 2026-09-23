# RULES.md — قواعد معمارية AN Flexy

قواعد إلزامية للتطبيق (Electron + Vite + React + Drizzle + SQLite). **المعمارية مبنية على الخصائص (Feature-first).**
تسري على كل من يكتب كودًا في المشروع، إنسانًا كان أو وكيل ذكاء اصطناعي.

> **عند التعارض** بين هذا الملف وقسم البنية في `AN-Flexy-PRD.md` (7.2) أو `AN-Flexy-Plan.md` (المرحلة 1)، **يسود هذا الملف**.
> تغيير أي قاعدة هنا يتم بتسجيل قرار في `docs/adr/NNNN-عنوان.md` قبل التعديل، لا بكسر القاعدة بصمت.

---

## 0. لمن يكتب الكود (خصوصًا الوكلاء)

1. اقرأ هذا الملف وملف `index.ts` للخاصية المعنية قبل أي تعديل.
2. لا تُنشئ ملفات خارج تشريح الخاصية (القسم 3).
3. إن تطلّب الطلب كسر قاعدة، **توقف ونبّه** واقترح بديلًا، ولا تكسرها لتنجز المهمة.
4. لا تضف اعتمادية (npm) دون سبب مكتوب في وصف الـ PR.
5. شغّل `npm run check` قبل إعلان الإنجاز. إن فشل شيء فاذكره بصراحة، ولا تُخفِه.
6. تغييرات صغيرة مركّزة: خاصية واحدة أو إصلاح واحد لكل PR.

---

## 1. المبادئ الحاكمة

1. **الخاصية هي وحدة البناء.** كل شيء يخص "البيع" في مجلد `sales`، لا موزّعًا على مجلدات تقنية (services/ipc/components).
2. **الاعتماديات تسير في اتجاه واحد** (مستويات، القسم 4). لا دوائر، ولا اعتماد على مستوى أعلى.
3. **واجهة عامة واحدة لكل خاصية** (`index.ts`). ما لم يُصدَّر منها فهو خاص.
4. **Main هو مالك البيانات والمنطق.** الواجهة تعرض وتجمع المدخلات فقط.
5. **مصدر واحد للحقيقة:** كل قاعدة عمل (رصيد، دين، ربح) في مكان واحد فقط.
6. **الوضوح قبل الذكاء:** كود مملّ ومفهوم أفضل من تجريد أنيق غامض.
7. **لا تجريد استباقي:** لا تُنشئ abstraction قبل ظهور حاجة ثالثة حقيقية (Rule of Three).

---

## 2. هيكل المشروع

```
an-flexy/
├─ src/
│  ├─ shared/                    # عقود ومساعدات نقية (بلا Electron/DOM/DB)
│  │  ├─ contracts/              # <feature>.ts: zod schemas + أنواع + أسماء القنوات
│  │  ├─ money.ts                # التحويل والتنسيق (سنتيم ↔ DA)
│  │  ├─ result.ts               # Result<T, AppErrorPayload>
│  │  └─ errors.ts               # رموز الأخطاء المشتركة
│  │
│  ├─ main/
│  │  ├─ app/                    # جذر التركيب (Composition Root)
│  │  │  ├─ index.ts             # دورة حياة Electron + النافذة
│  │  │  └─ compose.ts           # إنشاء الخصائص وتوصيلها ببعض
│  │  ├─ core/                   # بنية تحتية عامة، لا تعرف أي خاصية
│  │  │  ├─ db/                  # client.ts, migrations/, types (DB, Tx, DbOrTx)
│  │  │  ├─ ipc/                 # handle.ts (التسجيل + zod + الصلاحيات)
│  │  │  ├─ session/             # المستخدم الحالي (في ذاكرة Main فقط)
│  │  │  ├─ permissions/         # مصفوفة الأدوار والصلاحيات
│  │  │  ├─ audit/               # كتابة سجل التدقيق
│  │  │  ├─ errors/              # AppError
│  │  │  └─ logger/
│  │  └─ features/               # ← قلب التطبيق
│  │     ├─ auth/ settings/ operators/ customers/
│  │     ├─ stock/ sales/ debts/
│  │     └─ dashboard/ reports/ backup/ telegram/
│  │
│  ├─ preload/index.ts           # جسر ضيق: قائمة قنوات مسموحة فقط، بلا منطق
│  │
│  └─ renderer/
│     ├─ app/                    # الراوتر، المزوّدات (Providers)، الـ Layout
│     ├─ shared/                 # مكوّنات UI عامة، hooks عامة، i18n الأساسي
│     ├─ features/               # مكوّنات وhooks كل خاصية
│     └─ pages/                  # تركيب عدة خصائص في شاشة واحدة
│
├─ drizzle.config.ts
├─ .dependency-cruiser.cjs
├─ docs/adr/
└─ RULES.md
```

**الاختصارات (path aliases):** `@shared/*`، `@main/*`، `@renderer/*` في `tsconfig` وفي `electron.vite.config.ts` (لكل هدف على حدة). لا مسارات نسبية تتجاوز مجلد الخاصية (`../../`).

---

## 3. تشريح الخاصية

### 3.1 في Main
```
main/features/sales/
├─ index.ts             # الواجهة العامة الوحيدة
├─ sales.schema.ts      # جداول Drizzle الخاصة بالخاصية
├─ sales.service.ts     # منطق العمل، بلا استيراد من electron
├─ sales.queries.ts     # استعلامات القراءة الثقيلة (اختياري)
├─ sales.ipc.ts         # تسجيل handlers فقط: تحقق + صلاحية + استدعاء الخدمة
└─ sales.test.ts        # اختبارات الخدمة بقاعدة :memory:
```

| الملف | يجوز | لا يجوز |
|---|---|---|
| `*.schema.ts` | تعريف الجداول والفهارس | أي منطق |
| `*.service.ts` | قواعد العمل، Transactions، استدعاء واجهات خصائص أدنى | استيراد `electron`، الوصول لـ `ipcMain`، قراءة الجلسة مباشرة |
| `*.ipc.ts` | zod، الصلاحيات، تحويل النتيجة | منطق عمل، استعلامات DB |
| `index.ts` | تصدير المصنع والأنواع والجداول اللازمة لـ FK | تصدير دوال داخلية |

### 3.2 في Renderer
```
renderer/features/sales/
├─ index.ts             # ما تستهلكه الصفحات فقط
├─ api.ts               # غلاف مُنمَّط فوق window.api.invoke
├─ hooks.ts             # TanStack Query: useSales, useCreateSale ...
├─ components/          # مكوّنات الخاصية
└─ messages.ar.ts       # كل نصوص الخاصية
```
الصفحات التي تجمع أكثر من خاصية تعيش في `renderer/pages/<page>/` لا داخل خاصية.

### 3.3 الواجهة العامة ومصنع الخاصية
```ts
// main/features/sales/index.ts
import { createSalesService } from './sales.service'
import { registerSalesIpc } from './sales.ipc'

export type SalesDeps = {
  db: DB
  audit: Audit
  operators: OperatorsApi
  stock: StockApi
  customers: CustomersApi
}

export function createSalesFeature(deps: SalesDeps) {
  const api = createSalesService(deps)
  return { api, registerIpc: (ipc: IpcRegistry) => registerSalesIpc(ipc, api) }
}
export type SalesApi = ReturnType<typeof createSalesFeature>['api']
export { sales } from './sales.schema'   // للـ FK والقراءة فقط
```

### 3.4 التركيب في جذر واحد فقط
```ts
// main/app/compose.ts — المكان الوحيد الذي تعرف فيه الخصائص بعضها
export function compose(db: DB) {
  const audit = createAudit(db)
  const operators = createOperatorsFeature({ db, audit })
  const customers = createCustomersFeature({ db, audit })
  const stock     = createStockFeature({ db, audit, operators: operators.api })
  const sales     = createSalesFeature({ db, audit, operators: operators.api, stock: stock.api, customers: customers.api })
  const debts     = createDebtsFeature({ db, audit, customers: customers.api, sales: sales.api })
  // ...
  return [operators, customers, stock, sales, debts /* ... */]
}
```
- لا singletons ولا استيراد `db` عامًّا داخل الخدمات: كل شيء عبر `deps` (حقن يدوي، بلا إطار).
- هذا يجعل الاختبار بقاعدة `:memory:` وخصائص مزيفة سهلًا، ويجعل الاعتماديات مرئية.

---

## 4. قواعد الاعتماد

### 4.1 مستويات الخصائص

| المستوى | الخاصية | تعتمد على | المسؤولية |
|:-:|---|---|---|
| 1 | `auth` | — | المستخدمون، الدخول، الـ PIN |
| 1 | `settings` | — | إعدادات key/value |
| 1 | `operators` | — | المتعاملون والهوامش |
| 1 | `customers` | — | الزبائن |
| 2 | `stock` | operators | الشحنات والتسويات، مجموع الرصيد المستلم |
| 3 | `sales` | operators, stock, customers | البيع والإلغاء، **رصيد المتعامل (مصدر الحقيقة)** |
| 4 | `debts` | customers, sales | الدفعات، دين الزبون |
| 5 | `dashboard` | مستويات أدنى | قراءة فقط |
| 5 | `reports` | مستويات أدنى | قراءة فقط |
| 5 | `backup` | settings | نسخ واسترجاع |
| 5 | `telegram` | settings, operators, sales, debts | واجهة بديلة، بلا منطق عمل |

**القواعد:**
1. الخاصية تستورد **من مستوى أدنى فقط**. الاستيراد من نفس المستوى أو أعلى ممنوع.
2. لا أحد يستورد من المستوى 5 (مستهلكون فقط).
3. الاستيراد من خاصية أخرى **عبر `index.ts` فقط**، ولا استيراد ملفات داخلية.
4. الخصائص المخصصة للقراءة (المستوى 5) تُستخدم فيها **استعلامات قراءة فقط** ويجوز أن تضم جداول مُصدَّرة من الخصائص الأدنى. الكتابة على بيانات خاصية أخرى تتم عبر `api` الخاصية المالكة فقط.
5. الاستعلام الذي يحتاجه أكثر من مستهلك يُنقل إلى **الخاصية المالكة للبيانات** ويُصدَّر في `api`، ولا يُنسخ.
6. الخاصية الجديدة تُسجَّل في جدول المستويات هنا **وفي** `.dependency-cruiser.cjs` في نفس الـ PR.

### 4.2 قواعد الطبقات العامة
- `shared/` لا يستورد من `main` ولا `renderer` ولا `preload` ولا `electron`.
- `renderer/` لا يستورد من `main` ولا `preload`، ولا `electron` ولا `drizzle-orm` ولا `better-sqlite3`. التواصل فقط عبر `window.api.invoke` و`shared/contracts`.
- `main/core/` لا يستورد من `features/` ولا `app/`.
- `main/features/` لا تستورد من `app/`.
- `renderer/features/` لا تستورد من `pages/`. الصفحات وحدها تركّب الخصائص.
- لا دوائر استيراد (circular) إطلاقًا.

### 4.3 مثال تطبيقي: أين يعيش رصيد المتعامل؟
الرصيد = مجموع الشحنات (`stock`) − مجموع المبيعات (`sales`). لو وُضع في `stock` لاعتمد على `sales` (أعلى منه) فتنشأ دائرة. الحل:
- `stock` يصدّر `getCreditTotal(exec, operatorId)`.
- `sales` يصدّر `getSoldTotal(...)` و`getOperatorBalance(exec, operatorId)` و`listOperatorBalances()`، وهو **المصدر الوحيد** للرصيد.
- `dashboard` و`telegram` يستدعون `sales.api.listOperatorBalances()`.
- شاشة المخزون التي تريد عرض الرصيد تُركَّب في `renderer/pages/inventory` من مكوّنات `stock` و`sales`.

### 4.4 فرض القواعد آليًا
```bash
npm i -D dependency-cruiser
```
```json
// package.json
"scripts": {
  "arch:check": "depcruise src --config .dependency-cruiser.cjs",
  "check": "npm run lint && npm run typecheck && npm run arch:check && npm run test"
}
```
```js
// .dependency-cruiser.cjs  (قالب أولي)
const levels = {
  auth: 1, settings: 1, operators: 1, customers: 1,
  stock: 2, sales: 3, debts: 4,
  dashboard: 5, reports: 5, backup: 5, telegram: 5,
}

// ممنوع الاستيراد من نفس المستوى أو الأعلى
const levelRules = Object.entries(levels).flatMap(([from, lf]) =>
  Object.entries(levels)
    .filter(([to, lt]) => to !== from && lt >= lf)
    .map(([to]) => ({
      name: `level-${from}-cannot-import-${to}`,
      severity: 'error',
      from: { path: `^src/(main|renderer)/features/${from}/` },
      to:   { path: `^src/(main|renderer)/features/${to}/` },
    })),
)

module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'renderer-not-main', severity: 'error',
      from: { path: '^src/renderer' }, to: { path: '^src/(main|preload)' } },
    { name: 'main-not-renderer', severity: 'error',
      from: { path: '^src/(main|preload)' }, to: { path: '^src/renderer' } },
    { name: 'shared-is-pure', severity: 'error',
      from: { path: '^src/shared' }, to: { path: '^src/(main|renderer|preload)' } },
    { name: 'renderer-no-node-libs', severity: 'error',
      from: { path: '^src/(renderer|shared)' },
      to: { path: 'node_modules/(electron|better-sqlite3|drizzle-orm)/' } },
    { name: 'core-not-features', severity: 'error',
      from: { path: '^src/main/core' }, to: { path: '^src/main/(features|app)' } },
    { name: 'features-not-app', severity: 'error',
      from: { path: '^src/main/features' }, to: { path: '^src/main/app' } },
    { name: 'features-not-pages', severity: 'error',
      from: { path: '^src/renderer/features' }, to: { path: '^src/renderer/pages' } },
    // استيراد خاصية أخرى عبر index.ts فقط
    { name: 'feature-public-api-only', severity: 'error',
      from: { path: '^src/(main|renderer)/features/([^/]+)/' },
      to: {
        path: '^src/$1/features/[^/]+/',
        pathNot: ['^src/$1/features/$2/', '^src/$1/features/[^/]+/index\\.ts$'],
      } },
    ...levelRules,
  ],
  options: { tsPreCompilationDeps: true, tsConfig: { fileName: 'tsconfig.json' } },
}
```
> هذا قالب أولي لم يُجرَّب على مشروعك. **قبل الاعتماد عليه**، أنشئ مخالفة مقصودة (مثل استيراد `sales` من `stock`) وتأكد أن `npm run arch:check` يفشل، ثم أزلها.

---

## 5. الطبقات داخل الخاصية

```
Renderer:  Component → hook → api.ts → window.api.invoke
                                            │  (IPC)
Main:      *.ipc.ts → *.service.ts → Drizzle (db / tx)
```
- المكوّن لا يستدعي `window.api` مباشرة، بل عبر `hooks.ts`.
- `*.ipc.ts` لا يحتوي منطق عمل.
- `*.service.ts` لا يعرف IPC ولا Electron.
- **لا منطق عمل في المكوّنات**: لا حساب رصيد أو دين أو ربح. المكوّن يعرض ويجمع المدخلات.
- التحقق في الواجهة (zod من `shared/contracts`) لتحسين التجربة فقط، **والمرجع هو التحقق في Main**.

---

## 6. عقد IPC

### 6.1 العقد المشترك
```ts
// shared/contracts/sales.ts
import { z } from 'zod'

export const salesChannels = {
  create: 'sales:create',
  void:   'sales:void',
  list:   'sales:list',
} as const

export const createSaleInput = z.object({
  operatorId: z.number().int().positive(),
  targetPhone: z.string().regex(/^0[567]\d{8}$/),
  amount: z.number().int().positive(),          // سنتيم
  paidAmount: z.number().int().nonnegative(),
  customerId: z.number().int().positive().optional(),
})
export type CreateSaleInput = z.infer<typeof createSaleInput>
```

### 6.2 القواعد
1. أسماء القنوات `feature:action` وتُعرَّف **مرة واحدة** في `shared/contracts`.
2. الـ preload يمرّر القنوات المعرّفة في العقود فقط (allowlist)، ولا يحتوي منطقًا.
3. كل handler عبر `handle()` الذي **يفرض** ثلاثة أمور: مخطط zod، وصلاحية (أو `public` صراحةً)، ومعالجة الأخطاء. handler بلا صلاحية لا يُترجَم (خطأ types).
4. الاستجابة دائمًا `Result`: `{ ok: true, data } | { ok: false, error: { code, params? } }`.
5. الواجهة **لا ترسل هوية المستخدم**؛ يأخذها Main من `core/session`.
6. لا تُمرَّر كائنات Drizzle أو `Date` أو `Buffer` عبر IPC؛ بيانات بسيطة قابلة للتسلسل فقط.
7. Main **لا يعيد نصوصًا عربية**، بل رموز أخطاء (`INSUFFICIENT_BALANCE`)؛ والترجمة في `messages.ar.ts` بالواجهة.

```ts
// main/features/sales/sales.ipc.ts
export function registerSalesIpc(ipc: IpcRegistry, sales: SalesApi) {
  ipc.handle(salesChannels.create, {
    input: createSaleInput,
    permission: 'sales.create',
    run: (input, ctx) => sales.create(input, ctx.userId),
  })
  ipc.handle(salesChannels.void, {
    input: voidSaleInput,
    permission: 'sales.void',
    run: (input, ctx) => sales.void(input, ctx.userId),
  })
}
```

---

## 7. قاعدة البيانات

1. **الجداول تُعرَّف في `<feature>.schema.ts`** لكل خاصية، و`drizzle.config.ts`:
   ```ts
   export default defineConfig({
     dialect: 'sqlite',
     schema: './src/main/features/*/*.schema.ts',
     out: './src/main/core/db/migrations',
   })
   ```
2. نستخدم **query builder** (`db.select()...`) لا relational API (`db.query.*`)، فلا نحتاج تجميع كل الـ schemas في مكان واحد وقت التشغيل.
3. جدول الخاصية **يُكتب من خدمتها فقط**. الخصائص الأخرى تقرأ عبر `api` (والاستثناء في 4.1 بند 4).
4. أي دالة `api` قد تُستدعى من داخل transaction لخاصية أخرى **تقبل `exec: DbOrTx`** لتنضم لنفس الـ transaction.
5. **كل عملية تغيّر رصيدًا أو دينًا داخل `db.transaction` واحدة** تشمل فحص الشرط والكتابة والتدقيق.
6. **المال:** أعداد صحيحة بالسنتيم. لا `float`، ولا `parseFloat`، ولا `Number(x) * 100` لتحويل مدخل المستخدم. التحويل والتنسيق عبر `shared/money.ts` فقط.
7. **الحذف:** لا حذف فعلي للمبيعات والدفعات والشحنات. الإلغاء المنطقي (`voided_at` + سبب) والتعطيل (`active`).
8. **الرصيد والدين والأرباح تُحسب بالاستعلام** ولا تُخزَّن كحقول قابلة للتعديل. (`sales.profit` لقطة وقت البيع، وهذا مقصود.)
9. **الزمن:** التخزين UTC. أي تجميع يومي عبر `date(created_at, 'localtime')`.
10. **الترحيلات:** تُولَّد بـ `drizzle-kit generate` فقط، وتُراجَع يدويًا. لا يُعدَّل ترحيل بعد دمجه، وأي تغيير جديد = ترحيل جديد. يُختبر كل ترحيل على قاعدة فارغة وعلى نسخة من الإصدار السابق.
11. الأسماء: جداول وأعمدة `snake_case` بصيغة الجمع للجداول. فهرس لكل عمود يُستخدم في `WHERE`/`JOIN` بكثرة.
12. `journal_mode = WAL` و`foreign_keys = ON` عند كل فتح.
13. النسخ الاحتياطي عبر `sqlite.backup()` فقط، وليس نسخ الملف وهو مفتوح.

---

## 8. الأمان

1. `contextIsolation: true`، `nodeIntegration: false`، `sandbox: true`.
2. CSP صارم، ولا محتوى أو خطوط أو سكربتات من الشبكة.
3. منع التنقل (`will-navigate`) وفتح النوافذ (`setWindowOpenHandler`).
4. **الصلاحيات تُفحص في Main** لكل handler. إخفاء الزر في الواجهة ليس أمانًا.
5. PIN بـ scrypt + salt (`node:crypto`)، وقفل بعد محاولات فاشلة.
6. الأسرار (توكن تليغرام) بـ `safeStorage`، ولا تُكتب في الكود أو Git أو السجلات.
7. لا تُسجَّل في `logger` أرقام هواتف كاملة ولا PINs ولا توكنات.
8. مدخلات IPC كلها غير موثوقة حتى تمر عبر zod.

---

## 9. الأخطاء والتدقيق

- `AppError(code, params?)` هو النوع الوحيد المسموح رميه لأخطاء العمل المتوقعة. الأخطاء غير المتوقعة تُسجَّل وتُعاد كـ `INTERNAL_ERROR` دون تفاصيل.
- رموز الأخطاء `SCREAMING_SNAKE_CASE` وتُعرَّف في `shared/contracts/<feature>.ts`.
- **كل عملية كتابة** (بيع، إلغاء، شحن، تسوية، دفعة، تعديل هامش، دخول فاشل) تكتب سطر تدقيق داخل نفس الـ transaction.
- لا `catch` فارغ، ولا ابتلاع خطأ دون تسجيل.

---

## 10. الواجهة (Renderer)

1. **RTL أولًا:** `dir="rtl"`، وخصائص Tailwind المنطقية (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) بدل `ml/mr/pl/pr/left/right`.
2. **لا نصوص مكتوبة داخل JSX.** كل نص في `messages.ar.ts` للخاصية (يمهّد للفرنسية).
3. **حالة الخادم** (بيانات Main) عبر TanStack Query: مفاتيح `[feature, query, params]`، وبعد أي mutation يُبطَل مفتاح الخاصية المعنية.
4. حالة الواجهة المحلية: `useState`/`useReducer`. لا store عام إلا لما يشترك فيه التطبيق فعلًا (الجلسة، القفل).
5. **لا حساب مالي في الواجهة** سوى التنسيق عبر `shared/money.ts`.
6. **لوحة المفاتيح أولًا** في الشاشات السريعة (البيع): ترتيب Tab منطقي، `Enter` يؤكد، وتركيز تلقائي.
7. المكوّنات الصغيرة والمتخصصة: مكوّن > 200 سطر يُقسَّم. مكوّنات UI العامة في `renderer/shared/ui`.
8. لا إشعارات أو نوافذ منبثقة تعيق تدفق البيع، بل تأكيد خفيف غير حاجب.
9. الخطوط والأصول كلها محلية.

---

## 11. الاختبارات

1. كل `*.service.ts` له اختبارات بجانبه (`*.test.ts`) على SQLite `:memory:` بعد تشغيل الترحيلات الحقيقية.
2. **إلزامي** اختبار: حساب الرصيد، الدين، الأرباح، منع الرصيد السالب، الإلغاء، التسوية، وأي منطق مالي جديد.
3. اختبار **تزامن/تتابع سريع** لعمليات تمس الرصيد.
4. كل إصلاح خلل يأتي مع اختبار يفشل قبل الإصلاح.
5. خدمات الخصائص الأعلى تُختبر بخصائص أدنى **حقيقية** (قاعدة في الذاكرة) لا بمحاكاة، إلا للأنظمة الخارجية (تليغرام، الملفات).
6. لا اختبار يعتمد على الوقت الفعلي أو الشبكة.

---

## 12. الأسلوب والتسمية

- TypeScript صارم (`strict: true`)، و**لا `any`** (`unknown` ثم تضييق). `@ts-expect-error` مع تعليق سبب عند الضرورة فقط.
- **Named exports فقط**، لا `export default` (الاستثناء: ما يفرضه الأداة).
- ملفات: `<feature>.<role>.ts` في Main، و`PascalCase.tsx` للمكوّنات، و`kebab-case` للمجلدات.
- دالة ≤ ~50 سطرًا، وملف ≤ ~300 سطر (مؤشر للتقسيم لا حدّ صارم).
- التعليقات تشرح **لماذا** لا **ماذا**. أي قاعدة عمل غير بديهية تُشرح بجانبها.
- لا كود ميت ولا `console.log`؛ استخدم `logger`.
- Commits بصيغة Conventional Commits مع اسم الخاصية: `feat(sales): منع البيع عند نقص الرصيد`، `fix(debts): ...`.

---

## 13. إضافة خاصية جديدة (Checklist)

- [ ] حدّد مستواها وإلامَ تعتمد، وسجّلها في جدول 4.1 وفي `.dependency-cruiser.cjs`.
- [ ] أنشئ `main/features/<name>/` بالملفات القياسية، و`index.ts` بالمصنع.
- [ ] أضف العقد في `shared/contracts/<name>.ts` (قنوات + zod + رموز الأخطاء).
- [ ] عرّف الصلاحيات في `core/permissions` لكل قناة.
- [ ] `drizzle-kit generate` وراجع الترحيل.
- [ ] سجّلها في `app/compose.ts`.
- [ ] أنشئ `renderer/features/<name>/` (api, hooks, components, messages.ar.ts).
- [ ] أضف الصفحة في `renderer/pages/` إن لزم.
- [ ] اكتب اختبارات الخدمة، و`npm run check` أخضر.

---

## 14. ممنوعات (Anti-patterns)

- ❌ استيراد ملف داخلي من خاصية أخرى (`../sales/sales.service`).
- ❌ خاصية تستدعي خاصية من مستواها أو أعلى.
- ❌ SQL أو Drizzle في `*.ipc.ts` أو في الواجهة.
- ❌ منطق عمل في مكوّن React أو في preload.
- ❌ handler IPC بلا zod أو بلا صلاحية.
- ❌ وضع رصيد أو دين كحقل يُحدَّث يدويًا.
- ❌ `float` للمال، أو `Math.round(x * 100)` على مدخل نصي.
- ❌ حذف فعلي لسجل مالي.
- ❌ تعديل ترحيل مدموج.
- ❌ ملف `utils.ts` أو `helpers.ts` عام بلا مالك؛ ضع الدالة عند الخاصية التي تملكها، أو في `shared/` إن كانت نقية وعامة فعلًا.
- ❌ singleton لقاعدة البيانات مُستورد داخل الخدمات.
- ❌ ابتلاع الأخطاء أو إعادة نصوص عربية من Main.
- ❌ كسر قاعدة هنا "مؤقتًا" دون ADR.

---

## 15. قائمة مراجعة الـ PR

- [ ] `npm run check` أخضر (lint + types + arch + tests).
- [ ] لا مخالفات معمارية، ولا استثناءات جديدة دون ADR.
- [ ] كل handler جديد: zod + صلاحية + تدقيق للكتابة.
- [ ] أي عملية مالية داخل transaction ولها اختبار.
- [ ] لا نصوص عربية داخل JSX، ولا `ml/mr` في Tailwind.
- [ ] ترحيل جديد (إن وُجد) جُرِّب على قاعدة الإصدار السابق.
- [ ] لا أسرار أو بيانات حقيقية في الكود أو الاختبارات.
- [ ] الوصف يذكر الخاصية المتأثرة والسبب.
