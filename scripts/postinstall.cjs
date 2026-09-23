// يعيد بناء better-sqlite3 لإصدار Electron عند توفر أدوات البناء.
// عند غيابها (مثل جهاز تطوير بلا gcc/make) يتخطّى الخطوة بتحذير واضح،
// لأن better-sqlite3 يوفّر ثنائيات N-API مبنية مسبقًا تعمل في Node وElectron الحديث.
const { execSync } = require('node:child_process')

try {
  execSync('electron-builder install-app-deps', { stdio: 'inherit' })
} catch {
  console.warn(
    '[postinstall] تعذّر install-app-deps (أدوات بناء مفقودة؟). ' +
      'سيتم الاعتماد على الثنائي المبني مسبقًا لـ better-sqlite3. ' +
      'إن فشل تشغيل التطبيق بخطأ ABI فثبّت أدوات البناء (gcc-c++ / make) وأعد npm rebuild better-sqlite3.',
  )
}
