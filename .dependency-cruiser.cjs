// قواعد فرض المعمارية آليًا (RULES 4.4). كل خاصية جديدة تُسجَّل هنا وفي جدول المستويات في RULES.md.
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
      to: { path: `^src/(main|renderer)/features/${to}/` },
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
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    // نتوقّف عن توغّل داخل node_modules: نفحص اعتمادياتنا المباشرة عليها
    // (قواعد مثل renderer-no-node-libs تعمل)، لكن نتجاهل دوراتها الداخلية (مثل zod).
    doNotFollow: { path: 'node_modules' },
  },
}
