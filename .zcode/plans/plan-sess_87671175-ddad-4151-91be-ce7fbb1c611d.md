# خطة الإصلاحات متوسطة الأهمية — 8 إصلاحات

---

## الإصلاح 1: `nginx.conf` — CSP connect-src يحتوي `ws://localhost:3002`
**المشكلة:** في الإنتاج، المتصفح سيحظر كل اتصالات WebSocket لأنها لا تتطابق مع `localhost:3002`.
**التغيير:** استبدال `ws://localhost:3002` بـ `wss:` للسماح باتصالات WebSocket الآمنة من أي مصدر same-origin.

---

## الإصلاح 2: `shared/symbols.json` — MATICUSDT → POLUSDT (إعادة التسمية)
**المشكلة:** Polygon أعاد تسمية MATIC إلى POL في 2024. الرمز `MATIC-USD` في Yahoo قد يصبح قديماً.
**التغييرات في 4 ملفات:**
- `shared/symbols.json`: تغيير المفتاح `MATICUSDT` → `POLUSDT` وتحديث yahoo/td
- `server/data-sources/coingecko.js`: تحديث المفتاح و CoinGecko ID
- `api/src/utils/constants.ts`: تغيير المفتاح
- `src/utils/mockData.ts`: تغيير المفتاح + تحديث مرجع 'MATIC' في المصفوفة

---

## الإصلاح 3: تكرار كود المؤشرات — إنشاء `indicators-core.ts`
**المشكلة:** 5 دوال مكررة بالضبط بين `indicators.ts` و `indicators.worker.ts`. أي إصلاح في ملف دون الآخر سيؤدي لاختلاف النتائج.
**التغيير:**
- إنشاء `src/utils/indicators-core.ts` بالمصدر الوحيد للخوارزميات
- تعديل `indicators.ts` ليُصدير من `indicators-core.ts`
- تعديل `indicators.worker.ts` ليستورد من `indicators-core.ts`

---

## الإصلاح 4: `server/lib/engine.js` — حماية processTick من قيم فارغة
**المشكلة:** لا يوجد تحقق داخل `processTick()` من null/NaN/0 في price. أي مستدعي مستقبلي قد يُفسد بيانات tick.
**التغيير:** إضافة guard في بداية `processTick()`.

---

## الإصلاح 5: `server/lib/engine.js` — O(n) splice على مصفوفات كبيرة
**المشكلة:** `ticks.splice(0, 20000)` عند 100K عنصر يُزيح كل العناصر المتبقية (O(n)) مما يسبب تقطيع.
**التغيير:** استبدال `splice` بـ `slice` + إعادة التعيين.

---

## الإصلاح 6: `server/lib/engine.js` — catch فارغ في restoreRedisState
**المشكلة:** `catch {}` يبتلع كل الأخطاء مما يمنع تصحيح مشاكل Redis.
**التغيير:** إضافة `console.warn` داخل catch.

---

## الإصلاح 7: `server/data-sources/yahoo.js` — كشف JSON vs binary هش
**المشكلة:** الفحص بـ `startsWith('[')` يفشل إذا أرسل Yahoo JSON يبدأ بمسافة، أو إذا أرسل binary يبدأ بـ `[` (0x5B).
**التغيير:** استخدام try/JSON.parse بدلاً من فحص البايت الأول.

---

## الإصلاح 8: `server/data-sources/yahoo.js` — catch فارغ في fetchYahooKlines
**المشكلة:** `catch { return null }` يخفي أخطاء API.
**التغيير:** إضافة `console.warn` في كلا catch blocks.

---

## الملفات التي ستتغير (10 ملفات)

| الملف | الإصلاح |
|-------|---------|
| `nginx.conf` | #1 — CSP connect-src |
| `shared/symbols.json` | #2 — POLUSDT |
| `server/data-sources/coingecko.js` | #2 — POLUSDT |
| `api/src/utils/constants.ts` | #2 — POLUSDT |
| `src/utils/mockData.ts` | #2 — POLUSDT |
| `src/utils/indicators-core.ts` | #3 — ملف جديد |
| `src/utils/indicators.ts` | #3 — re-export |
| `src/utils/indicators.worker.ts` | #3 — import |
| `server/lib/engine.js` | #4, #5, #6 |
| `server/data-sources/yahoo.js` | #7, #8 |
