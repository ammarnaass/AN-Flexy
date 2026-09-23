# خطة تطوير AN Flexy

خطة تنفيذ الـ PRD (`AN-Flexy-PRD.md`). التقديرات **تقريبية لمطوّر واحد** بدوام كامل، ولا تشمل الأعطال غير المتوقعة.

---

## 1. الجدول العام

| المرحلة | المحتوى | المدة |
|---|---|---|
| 0 | تجهيز المستودع والأدوات | 1 يوم |
| 1 | الأساس: المشروع، القاعدة، IPC، الدخول، هيكل RTL | 3–4 أيام |
| 2 | المتعاملون، المخزون، البيع | 5–6 أيام |
| 3 | الزبائن والديون | 3–4 أيام |
| 4 | لوحة التحكم، التقارير، النسخ الاحتياطي | 3–4 أيام |
| 5 | تكامل تليغرام (P1) | 3–4 أيام |
| 6 | التغليف، الاختبار الميداني، الإصلاحات | 4–5 أيام |
| **المجموع** | | **22–28 يوم عمل** |

---

## 2. قرارات ثابتة (لا تُعاد مناقشتها أثناء التنفيذ)

1. المبالغ أعداد صحيحة بالسنتيم.
2. القاعدة في Main process فقط.
3. الرصيد والدين **محسوبان** من السجلات، غير مخزّنين.
4. لا حذف فعلي: إلغاء منطقي (void) وتعطيل (active = false).
5. كل عملية تمس الرصيد داخل Transaction واحدة.
6. الخدمات (services) لا تستورد Electron.

---

## 3. المرحلة 0 — التجهيز (يوم)

- [ ] إنشاء مستودع Git.
- [ ] `.gitignore` (يشمل `*.db`, `dist`, `out`, `.env`).
- [ ] ESLint + Prettier + `tsc --noEmit` كسكربت `npm run check`.
- [ ] GitHub Actions أولي: تثبيت + `check` + بناء على runner ويندوز (لكشف مشكلة `better-sqlite3` مبكرًا).

**تعريف الإنجاز:** الـ CI أخضر على مشروع فارغ.

---

## 4. المرحلة 1 — الأساس (3–4 أيام)

### المهام
- [ ] إنشاء المشروع:
  ```bash
  npm create @quick-start/electron@latest an-flexy -- --template react-ts
  cd an-flexy
  npm i drizzle-orm better-sqlite3 zod
  npm i -D drizzle-kit @types/better-sqlite3 vitest
  ```
- [ ] في `package.json`: `"postinstall": "electron-builder install-app-deps"` (ليُبنى `better-sqlite3` لإصدار Electron).
- [ ] إعداد Tailwind وفق التوثيق الحالي لإصدارك، وتفعيل `dir="rtl"` و `lang="ar"` على `<html>`، وتضمين خط عربي محليًا.
- [ ] `drizzle.config.ts`:
  ```ts
  import { defineConfig } from 'drizzle-kit'
  export default defineConfig({
    dialect: 'sqlite',
    schema: './src/main/db/schema.ts',
    out: './src/main/db/migrations',
  })
  ```
- [ ] نسخ الـ schema من الـ PRD (القسم 8) إلى `src/main/db/schema.ts`، ثم `npx drizzle-kit generate`.
- [ ] `src/main/db/client.ts`:
  ```ts
  import Database from 'better-sqlite3'
  import { drizzle } from 'drizzle-orm/better-sqlite3'
  import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
  import { app } from 'electron'
  import path from 'node:path'
  import * as schema from './schema'

  export function openDb() {
    const file = path.join(app.getPath('userData'), 'anflexy.db')
    const sqlite = new Database(file)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    const db = drizzle(sqlite, { schema })

    const migrationsFolder = app.isPackaged
      ? path.join(process.resourcesPath, 'migrations')
      : path.join(app.getAppPath(), 'src/main/db/migrations')
    migrate(db, { migrationsFolder })

    return { db, sqlite }
  }
  export type DB = ReturnType<typeof openDb>['db']
  export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0]
  ```
- [ ] نمط IPC موحّد (`src/main/ipc/handle.ts`):
  ```ts
  import { ipcMain } from 'electron'
  import { z } from 'zod'

  export function handle<S extends z.ZodTypeAny, R>(
    channel: string,
    schema: S,
    fn: (input: z.infer<S>) => R,
  ) {
    ipcMain.handle(channel, async (_e, raw) => {
      try {
        return { ok: true as const, data: fn(schema.parse(raw)) }
      } catch (err) {
        return { ok: false as const, error: toAppError(err) }
      }
    })
  }
  ```
  وفي كل handler: فحص صلاحية المستخدم الحالي (محفوظ في Main) قبل استدعاء الخدمة.
- [ ] `preload/index.ts`: `contextBridge.exposeInMainWorld('api', { ... })` بأنواع TypeScript مشتركة.
- [ ] إعدادات أمان النافذة: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`، وCSP، ومنع `will-navigate` و`setWindowOpenHandler`.
- [ ] الدخول: شاشة + خدمة auth بـ scrypt (`node:crypto`) + معالج أول تشغيل + قفل بعد المحاولات الخاطئة.
- [ ] هيكل الواجهة: Layout + Sidebar (RTL) + Router + صفحة فارغة لكل شاشة.

**تعريف الإنجاز:** التطبيق يفتح، ينشئ القاعدة، يشغّل الترحيلات، يسجّل دخول المالك، ويتنقل بين شاشات فارغة. وبناء ويندوز في الـ CI ينجح.

---

## 5. المرحلة 2 — المتعاملون والمخزون والبيع (5–6 أيام)

### المهام
- [ ] خدمة + شاشة المتعاملين (إضافة، تعديل الهامش، تعطيل).
- [ ] خدمة المخزون: شحن، تسوية (سبب إلزامي)، حساب الرصيد.
- [ ] خدمة البيع:
  ```ts
  export function createSale(db: DB, input: SaleInput, userId: number) {
    return db.transaction((tx) => {
      const balance = getOperatorBalance(tx, input.operatorId)
      if (balance < input.amount) throw new AppError('INSUFFICIENT_BALANCE', { balance })
      if (input.paidAmount < input.amount && !input.customerId)
        throw new AppError('DEBT_REQUIRES_CUSTOMER')

      const op = tx.select().from(operators).where(eq(operators.id, input.operatorId)).get()!
      const profit = Math.round((input.amount * op.marginBp) / 10000)

      const sale = tx.insert(sales).values({ ...input, profit, userId }).returning().get()
      tx.insert(auditLog).values({
        userId, action: 'sale.create', details: JSON.stringify({ id: sale.id }),
      }).run()
      return sale
    })
  }

  export function getOperatorBalance(tx: Tx, operatorId: number) {
    const credit = tx.select({ v: sql<number>`coalesce(sum(${stockEntries.creditAmount}), 0)` })
      .from(stockEntries).where(eq(stockEntries.operatorId, operatorId)).get()!.v
    const sold = tx.select({ v: sql<number>`coalesce(sum(${sales.amount}), 0)` })
      .from(sales)
      .where(and(eq(sales.operatorId, operatorId), isNull(sales.voidedAt))).get()!.v
    return credit - sold
  }
  ```
  (`better-sqlite3` متزامن، فـ `db.transaction` ترجع القيمة مباشرة.)
- [ ] إلغاء البيع (المالك فقط) مع سبب.
- [ ] شاشة "بيع جديد": تركيز تلقائي، اختصارات المبالغ، `Enter` للتأكيد، رسائل الأخطاء بالعربية.
- [ ] اختبارات Vitest للخدمات بقاعدة `:memory:` (تشغيل الترحيلات عليها).

**تعريف الإنجاز:** شحن رصيد → بيع → الرصيد ينقص صحيحًا → إلغاء البيع → الرصيد يعود. وكل الاختبارات خضراء، ومحاولة البيع فوق الرصيد ترفض.

---

## 6. المرحلة 3 — الزبائن والديون (3–4 أيام)

### المهام
- [ ] CRUD الزبائن + بحث سريع (يُستخدم داخل شاشة البيع).
- [ ] ربط البيع الآجل بالزبون (إلزامي عند المدفوع < المبلغ).
- [ ] خدمة الدفعات + منع الدفعة الأكبر من الدين.
- [ ] حساب الدين بالاستعلام (لا حقل مخزَّن).
- [ ] شاشة الديون: الأكبر أولًا + أقدم دين + ملف الزبون.
- [ ] اختبارات: دين جزئي، دفعات متعددة، إلغاء بيع آجل.

**تعريف الإنجاز:** مجموع ديون الشاشة = مجموع الحساب اليدوي في سيناريو اختبار من 10 عمليات مختلطة.

---

## 7. المرحلة 4 — اللوحة والتقارير والنسخ الاحتياطي (3–4 أيام)

### المهام
- [ ] لوحة التحكم (بطاقات الأرصدة + مؤشرات اليوم + آخر العمليات).
- [ ] تقارير: يومي / شهري / فترة، حسب المتعامل، حسب البائع (الاستعلامات بـ `date(created_at, 'localtime')`).
- [ ] إخفاء الأرباح عن Cashier في الواجهة **وفي الـ handler**.
- [ ] النسخ الاحتياطي اليدوي بـ `sqlite.backup(path)`.
- [ ] الاسترجاع: تأكيد → نسخة أمان تلقائية → استبدال → إعادة تشغيل التطبيق.
- [ ] (P1) نسخ تلقائي يومي + الاحتفاظ بآخر N نسخة + تصدير PDF/Excel.

**تعريف الإنجاز:** نسخ احتياطي ثم حذف بيانات ثم استرجاع يعيد الحالة الأصلية تمامًا (جرّبها فعليًا).

---

## 8. المرحلة 5 — تكامل تليغرام (3–4 أيام، P1)

### المهام
- [ ] `npm i grammy`.
- [ ] جدول `settings`: `telegram_token` (مشفّر بـ `safeStorage`)، `telegram_allowed_ids` (JSON).
- [ ] خدمة `telegram/bot.ts`:
  - كود ربط 6 أرقام صالح 5 دقائق، و`/start CODE` يضيف المعرّف.
  - middleware يتجاهل أي معرّف غير مسموح.
  - أوامر `/balance` و`/today` و`/debts` تستدعي **الخدمات نفسها** المستخدمة في الواجهة.
  - `bot.start({ drop_pending_updates: true })` و`bot.catch(...)`.
  - `stopBot()` عند إغلاق التطبيق وعند تغيير التوكن.
- [ ] إشعارات: رصيد منخفض بعد كل بيع، وملخص يومي بمؤقت (`setInterval` مع فحص الساعة).
- [ ] شاشة الإعدادات: التوكن، توليد الكود، الأجهزة المربوطة + فصلها، مفتاح التفعيل.
- [ ] فشل الشبكة لا يُسقط التطبيق ولا يعطّل عملية البيع.
- [ ] رسائل البوت بلا أرقام هواتف كاملة.

**تعريف الإنجاز:** ربط الهاتف بالكود، `/balance` يردّ صحيحًا، حساب تليغرام آخر غير مربوط لا يتلقى أي رد، وقطع الإنترنت لا يعطّل التطبيق.

---

## 9. المرحلة 6 — التغليف والاختبار الميداني (4–5 أيام)

### المهام
- [ ] `electron-builder.yml`: هدف NSIS + AppImage/rpm، و`extraResources` لمجلد الترحيلات، والتأكد من `.node` خارج asar.
- [ ] بناء ويندوز عبر GitHub Actions وتجربته على جهاز ويندوز **حقيقي** (ليس افتراضًا).
- [ ] تجربة الترحيل: تثبيت نسخة، إدخال بيانات، ثم تثبيت نسخة أحدث بترحيل جديد، والتأكد من سلامة البيانات.
- [ ] أيقونة التطبيق واسمه ومعلومات الإصدار.
- [ ] اختبار ميداني **أسبوع** بجانب الدفتر الورقي، ومقارنة الرصيد والديون يوميًا.
- [ ] إصلاح ما يظهر، وتجميد الميزات.
- [ ] كتابة دليل مستخدم قصير (صفحة أو صفحتان).

**تعريف الإنجاز:** أسبوع ميداني دون اختلاف في الرصيد أو الديون عن الدفتر، ودون فقدان بيانات.

---

## 10. ترتيب القص إن ضاق الوقت

تُحذف بهذا الترتيب (الأول أولًا):
1. اقتراح المتعامل تلقائيًا (FR-14).
2. طباعة الوصل (FR-13).
3. تصدير PDF/Excel.
4. تكامل تليغرام كاملًا (المرحلة 5).
5. النسخ التلقائي اليومي (يبقى اليدوي).

**لا تُحذف أبدًا:** Transactions، النسخ الاحتياطي اليدوي، الاسترجاع، سجل التدقيق، الاختبار الميداني.

---

## 11. قائمة الإصدار (Release checklist)

- [ ] كل اختبارات الوحدة خضراء، والترحيلات تعمل على قاعدة فارغة وعلى قاعدة إصدار سابق.
- [ ] استرجاع نسخة احتياطية جُرّب فعليًا.
- [ ] Cashier لا يصل لأي وظيفة إدارية عبر الواجهة ولا عبر IPC.
- [ ] لا توكنات ولا أسرار في Git.
- [ ] بناء ويندوز نُصِّب وشُغِّل على جهاز نظيف.
- [ ] دليل المستخدم جاهز، ويوضح أن التطبيق **يسجّل ولا يرسل التعبئة**.
- [ ] رقم الإصدار (`1.0.0`) وسجل التغييرات.

---

## 12. الخطوة التالية مباشرة

1. نفّذ المرحلة 0 والمرحلة 1 أولًا.
2. جرّب **بناء ويندوز في الـ CI في اليوم الأول**، فمشاكل `better-sqlite3` أرخص كثيرًا إن ظهرت مبكرًا.
3. ثبّت الإجابات على الأسئلة المفتوحة في القسم 13 من الـ PRD قبل بدء المرحلة 2، لأن سؤال الإرسال الفعلي يغيّر نموذج البيانات.
