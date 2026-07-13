# وثيقة التحليل الفني الشامل - منصة Pro FundX للتداول

---

## فهرس المحتويات

1. [نظرة عامة على المشروع](#1-نظرة-عامة-على-المشروع)
2. [هندسة النظام (System Architecture)](#2-هندسة-النظام-system-architecture)
3. [الواجهة الأمامية (Frontend)](#3-الواجهة-الأمامية-frontend)
4. [خادم WebSocket للبيانات الحية](#4-خادم-websocket-للبيانات-الحية)
5. [خادم API الخلفي (Backend API)](#5-خادم-api-الخلفي-backend-api)
6. [قاعدة البيانات (Database)](#6-قاعدة-data)
7. [تدفق البيانات (Data Flow)](#7-تدفق-البيانات-data-flow)
8. [مصادر بيانات السوق](#8-مصادر-بيانات-السوق)
9. [محرك التداول والمطابقة](#9-محرك-التداول-والمطابقة)
10. [محرك إدارة المخاطر](#10-محرك-إدارة-المخاطر)
11. [استراتيجية الاختبارات (Testing Strategy)](#11-استراتيجية-الاختبارات-testing-strategy)
12. [الأداء والتحسينات](#12-الأداء-والتحسينات)
13. [الوضع الحالي والخطوات القادمة](#13-الوضع-الحالي-والخطوات-القادمة)

---

## 1. نظرة عامة على المشروع

### الرؤية
منصة تداول احترافية من نوع **Prop Firm** (شركات التمويل) تهدف إلى تقديم بيئة تداول متكاملة مع بيانات سوق حية، محرك مطابقة أوامر، ونظام إدارة مخاطر متطور. المنصة تدعم المتداولين العرب بواجهة ثنائية اللغة (عربي/إنجليزي) وتغطي جميع الأسواق العالمية الرئيسية والعربية.

### التقنيات المستخدمة

| الطبقة | التقنية | الإصدار |
|--------|---------|---------|
| **الواجهة الأمامية** | React + TypeScript + Vite | React 19.2, TS 6.0, Vite 8.1 |
| **الرسم البياني** | lightweight-charts | 5.2.0 (TradingView) |
| **خادم API** | Express + Prisma + PostgreSQL | Express 4.21, Prisma 6.19 |
| **خادم WebSocket** | Node.js + ws | ws 8.16 |
| **الاختبارات** | Vitest + Testing Library | Vitest 4.1.9 |
| **الحاوية** | Docker + Nginx + Certbot | - |
| **التنسيق** | Prettier + oxlint | - |

### الأعداد الحالية
- **91 رمز تداول** (7 رئيسي + 22 عرضي + 16 نادر + 5 معادن + 3 طاقة + 21 مؤشر + 17 عملات رقمية)
- **379 اختبارًا** (266 أمامي/خادم + 113 API)
- **10 جداول قاعدة بيانات** (Prisma ORM)
- **16 إطار زمني** (من 1 ثانية إلى شهر)

---

## 2. هندسة النظام (System Architecture)

### الهيكل العام ثلاثي الطبقات

```
┌─────────────────────────────────────────────────────────────┐
│                    المتصفح (Browser)                         │
│  React SPA (Vite) · lightweight-charts · WebSocket Client   │
│  src/                                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP (REST)      │ WS (Real-time)
                       ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              خادم API (Express + Prisma)                     │
│  api/src/                                                    │
│  ├── TradingService    │  ──  الأوامر والصفقات               │
│  ├── MatchingEngine    │  ──  تنفيذ أوامر الحد/الوقف          │
│  ├── RuleEngine        │  ──  إدارة المخاطر                  │
│  ├── AuthService       │  ──  المصادقة والتسجيل              │
│  ├── AccountService    │  ──  الحسابات والرصيد               │
│  └── ReportService     │  ──  التقارير والإحصائيات           │
└───────────┬───────────────────────────────────┬──────────────┘
            │ PostgreSQL                         │
            ▼                                    ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│   قاعدة البيانات (DB)        │  │    خادم WebSocket (ws)        │
│   10 جداول · Prisma ORM      │  │   server/                     │
└──────────────────────────────┘  │  ├── Yahoo Finance (REST+WS)  │
                                  │  ├── Binance (WS+REST)        │
                                  │  ├── TwelveData (REST+WS)     │
                                  │  ├── CoinGecko (REST)         │
                                  │  ├── Market Hours             │
                                  │  └── Candle Engine            │
                                  └──────────────────────────────┘
```

### تدفق الاتصال

1. **REST API** (port 3001): المصادقة، إدارة الحسابات، التداول، التقارير
2. **WebSocket** (port 3002): الأسعار الحية، الشموع، حالة السوق
3. **Redis**: تنسيق الحالة بين العمليات، تخزين مؤقت (اختياري مع fallback للذاكرة)

### Docker Services

| الخدمة | الحاوية | المنفذ |
|--------|---------|--------|
| PostgreSQL | `postgres:16-alpine` | 5432 |
| API | `pro-fundx-api` (Node) | 3001 |
| WS Server | `pro-fundx-ws` (Node) | 3002 |
| Nginx | `nginx:alpine` | 80/443 |
| Certbot | `certbot` | - |

---

## 3. الواجهة الأمامية (Frontend)

### 3.1 هيكل المجلدات

```
src/
├── components/
│   ├── chart/          ← مكونات الرسم البياني (ChartToolbar, ChartPanes, ChartOverlays, ConnectionBadge, constants)
│   ├── layout/         ← التخطيط العام (Sidebar, TopBar, LogoutModal, ToastContainer, NotificationsDropdown)
│   ├── trade/          ← واجهة التداول (OrderPanel, PositionsTable, AccountSummary, LivePnl, CloseModal, ModifyModal, HistoryTable, TradeTopBar)
│   ├── ProfessionalChart.tsx   ← المكون الرئيسي للرسم البياني (1064 سطر)
│   ├── MarketWatch.tsx         ← قائمة الأسواق الحية
│   ├── EquityChart.tsx         ← رسم بياني لحقوق الملكية
│   └── Layout.tsx              ← غلاف التخطيط العام
├── pages/
│   ├── admin/          ← لوحة المشرف (7 صفحات)
│   ├── hooks/          ← useTradePage.ts (منطق التداول المركزي)
│   ├── user/           ← صفحات المستخدم (KYC, Profile, Payout, Referral, History)
│   └── *.tsx           ← الصفحات الرئيسية (Trade, Dashboard, Login, Register, etc.)
├── utils/
│   ├── useRealtime.ts          ← hooks الأسعار الحية (396 سطر)
│   ├── wsClient.ts             ← عميل WebSocket (461 سطر)
│   ├── trading.ts              ← دوال التداول (calcPnl, formatPrice, getContractSize)
│   ├── mockData.ts             ← بيانات وهمية للتطوير (318 سطر)
│   ├── indicators.ts           ← المؤشرات الفنية (MA, EMA, RSI, BB, MACD)
│   ├── indicators.worker.ts    ← Web Worker للمؤشرات
│   ├── chartPrice.ts           ← سعر المرجع على الرسم
│   ├── marketData.ts           ← بينات السوق والرموز
│   ├── marketHours.ts          ← ساعات التداول
│   ├── klineCache.ts           ← تخزين الشموع مؤقتًا
│   ├── api.ts                  ← عميل REST API
│   ├── holidays.ts             ← العطل الرسمية
│   ├── logger.ts               ← تسجيل الأخطاء
│   └── cssConstants.ts         ← ثوابت الأنماط
├── styles/
│   ├── trade.module.css        ← أنماط واجهة التداول (978 سطر، CSS Modules)
│   ├── global.css              ← الأنماط العامة
│   ├── chart-area.css          ← منطقة الرسم البياني
│   ├── market-watch.css        ← قائمة الأسواق
│   └── responsive.css          ← التجاوب مع الشاشات
├── contexts/
│   ├── AuthContext.tsx          ← سياق المصادقة
│   └── ToastContext.tsx         ← سياق الإشعارات
└── __tests__/
    ├── 12 ملفات اختبار         ← التداول، المحرك، الشموع، المكونات
    └── setup.ts
```

### 3.2 مكون ProfessionalChart (أكثر المكونات تعقيدًا - 1064 سطر)

#### الميزات الرئيسية

| الميزة | الوصف |
|--------|-------|
| **4 ألواح (Panes)** | الشموع الرئيسي، الحجم، RSI (اختياري)، MACD (اختياري) |
| **10+ سلاسل رسم** | الشموع، الحجم، 7 مؤشرات، خطوط الاتجاه |
| **مزامنة الأطر الزمنية** | `syncTimeScales()` تزامن جميع الألواح مع اللوح الرئيسي |
| **أدوات الرسم** | خط أفقي (H.Line)، خط اتجاه (Trend)، مسح |
| **خطوط الصفقات** | خط دخول (صلب)، SL (أحمر متقطع)، TP (أخضر متقطع) |
| **P&L عائم على الرسم** | شارة تظهر إجمالي الربح/الخسارة وعدد الصفقات |
| **تحديثات سلسة** | rAF-batched للشموع وتقاطع المؤشرات |
| **Worker للمؤشرات** | استخدام Web Worker لحسابات RSI/MACD الثقيلة |
| **دعم RTL** | للغة العربية |

#### تدفق البيانات

```
useRealtimeCandles(symbol, interval)
  │
  ├── onInitial(candles[])  →  applyData(candles)
  │                             ├── series.setData() ← الشموع والحجم
  │                             ├── Indicators (MA, EMA, BB, RSI, MACD)
  │                             ├── series.setMarkers() ← علامات الدخول
  │                             └── syncTimeScales()
  │
  └── onCandle(candle)      →  dataRef update + rAF batching
                                ├── candleSeries.update()
                                ├── volumeSeries.update()
                                └── Indicators update (RSI, MACD)
```

#### إدارة الحالة عبر Refs

```
Refs المستخدمة:
├── chart instances (4)  ← main, volume, rsi, macd
├── series refs (10+)    ← candles, volume, rsi, macd, ma[], ema[], bb[], trend
├── position refs        ← entryPriceLines, slTpLines, markers
├── drawing refs         ← hlinePrices, trendPoints, drawingMode
├── resize refs          ← debounced ResizeObserver (80ms)
└── data refs            ← dataRef, candleDataRef, pendingUpdateRef
```

### 3.3 مكونات التداول (Trade Components)

#### TradeTopBar
- شريط علوي يعرض رمز السهم، السعر الحالي، تغيير النسبة المئوية، الأطر الزمنية (16 إطارًا)
- خيارات ملء الشاشة واختيار التخطيط (4 أوضاع: الرسم فقط / +السوق / +اللوحة / كامل)

#### OrderPanel (لوحة الأوامر)
- إدخال الأوامر: حد/سعر/إيقاف مع تحكم في الحجم (±0.01، أزرار مختصرة)
- آلة حاسبة للمخاطر تحسب الخسارة بناءً على مسافة SL
- عرض السعر الحي مع مؤشر الركود (stale)
- واجهة SL/TP مع زر نسخ السعر الحي
- دعم الحساب العكسي للزوج (USDJPY إلخ)

#### PositionsTable (جدول الصفقات)
- عرض جميع الصفقات المفتوحة مع السعر الحي و P&L
- أزرار: عكس، تعديل SL/TP، إغلاق (فردي/جماعي)
- مكونات `<LivePrice>` و `<LivePnl>` المضمنة

#### AccountSummary (ملخص الحساب)
- الرصيد، حقوق الملكية، P&L العائم، الهامش المستخدم، الهامش الحر
- يستخدم `useSmoothTotalFloatingPnl` لتحديثات سلسة (12 إطارًا في الثانية)

### 3.4 hooks الرئيسية (useRealtime.ts)

| Hook | الوظيفة | آلية التحديث |
|------|---------|-------------|
| `useRealtimePrices` | اشتراك الأسعار لرموز متعددة | `cacheListeners` Set + useSyncExternalStore |
| `useLivePrice` | سعر حي لرمز واحد | `useSyncExternalStore` مع subscribe/getSnapshot |
| `useTotalFloatingPnl` | إجمالي P&L لجميع الصفقات | محسوب من priceCache، memoized |
| `useSmoothTotalFloatingPnl` | P&L سلس مع استيفاء (interpolation) | توليد مشي عشوائي صغير بين التحديثات الحقيقية كل 80ms |
| `useAllMarketPrices` | جميع الأسعار مرة واحدة | تحديثات مجمعة عبر rAF |
| `useRealtimeCandles` | الشموع الحية (تاريخية +实时) | WS fetch + fallback (mock) + تحديث الشمعة الحالية |
| `useMarketStatus` | حالة السوق (مفتوح/مغلق) | WS + polling كل 30 ثانية + حساب محلي |

#### آلية "الاستيفاء السلس" (Smooth Interpolation)

```
سعر حقيقي من WS (كل 2-5 ثوان)  ←  يحافظ على السعر الأساسي الصحيح
         │
         ▼
مشي عشوائي صغير (كل 80ms)  ←  يعطي إحساسًا بالحركة المستمرة
         │
         ▼
تذبذب حسب الرمز: XAU→0.05%, غيره→0.015%
```

### 3.5 عميل WebSocket (wsClient.ts)

```
dataClient (Singleton)
│
├── State Machine: disconnected → connecting → connected
│   └── Reconnect: exponential backoff + jitter (max 20 محاولة)
│
├── Heartbeat: ping كل 30s, pong خلال 15s
│
├── Message Routing:
│   ├── initial    → onInitial[]
│   ├── tick       → onTick[] + priceCache + notifyListeners()
│   ├── candle     → onCandle[]
│   ├── candle_update → onCandle[]
│   ├── ping       → pong response
│   └── pong       → alive flag
│
├── fetchKlines(symbol, interval) → Promise
│   └── timeout 15s → reject
│
├── Subscribe/Unsubscribe:
│   ├── subscribeTicker(symbol, cb) → () => void
│   └── subscribeCandle(symbol, interval, cb) → () => void
│
└── Reconnection:
    ├── clear all listeners
    ├── resubscribe all pairs from subscribedPairs
    └── reconnect all fetchKlines
```

---

## 4. خادم WebSocket للبيانات الحية

### 4.1 الهيكل العام

```
server/
├── index.js                     ← نقطة الدخول (WS + HTTP)
├── lib/
│   ├── engine.js                ← محرك الشموع والحالة المركزية (425 سطر)
│   ├── ws-handlers.js           ← معالجات رسائل WebSocket (238 سطر)
│   └── polling.js               ← جدولة استقصاء الأسعار (148 سطر)
├── data-sources/
│   ├── yahoo.js                 ← Yahoo Finance (REST + WS) (358 سطر)
│   ├── binance.js               ← Binance (WS + REST) (194 سطر)
│   ├── coingecko.js             ← CoinGecko REST (47 سطر)
│   └── twelvedata.js            ← TwelveData (REST + WS) (209 سطر)
├── marketHours.js               ← ساعات التداول (371 سطر)
├── holidays.js                  ← العطل الرسمية (237 سطر)
├── redis.js                     ← عميل Redis مع fallback للذاكرة (234 سطر)
└── __tests__/
    ├── engine.test.js           ← 78 اختبارًا
    └── ws-handlers.test.js      ← 10 اختبارات
```

### 4.2 محرك الشموع (engine.js)

#### الحالة المركزية (Global Mutable State)

```js
const tickBuffers = Map<symbol, Tick[]>      // max 100k tick
const candleStates = Map<symbol, Map<intervalId, Candle>>
const subscribers = Map<symbol, Set<ws>>
const priceCache = Map<symbol, { price, change, time }>
const symbolTimers = Map<symbol, timeout>
const klinesCache = Map<symbol+interval, Candle[]>
const activeIntervals = Map<intervalId, Set<symbol>>
```

#### دورة حياة الشمعة

```
processTick(symbol, price, time)
│
├── 1. دفع إلى tickBuffer (max 100k)
│
├── 2. لكل إطار زمني نشط (أو ALL_INTERVALS):
│   ├── حساب bucket الوقت: time - (time % intervalSeconds)
│   ├── إذا bucket جديد ← بث الشمعة السابقة مكتملة
│   └── إنشاء/تحديث OHLC للشمعة الحالية
│
├── 3. حفظ في candleStates
│
├── 4. broadcast(symbol, { type: 'candle', ... })
│
└── 5. حفظ في Redis (للأطر الشائعة فقط)
```

#### الوظائف المساعدة

| الدالة | الوصف |
|--------|-------|
| `interpolateCandles` | تقسيم شموع عالية إلى منخفضة (مثلاً 5m→1m) |
| `aggregateCandles` | دمج شموع منخفضة إلى عالية (مثلاً 1m→5m) |
| `enhanceCandles` | تطبيع OHLC، ملء القيم الفارغة، تقريب الأرقام |
| `seedTickBuffer` | تهيئة مخزن التيك من الشموع التاريخية |
| `loadInitialState` | استعادة الحالة من Redis + ملف JSON |
| `saveState` | حفظ الحالة كل 60 ثانية |
| `getRecentCandles` | بحث ثنائي في tickBuffer لبناء الشموع |

### 4.3 معالجات WebSocket (ws-handlers.js)

#### استقبال الرسائل

```js
handleSubscribe(ws, { symbols, interval })
│
├── إضافة ws إلى subscribers[symbol] لكل رمز
├── تسجيل interval نشط
├── الاشتراك في مصدر البيانات المناسب:
│   ├── Crypto → Binance WS
│   ├── Forex  → TwelveData WS
│   └── Other  → Yahoo WS
├── fetchInitialKlines() ← سلسلة متعددة المصادر
└── startPolling()

handleUnsubscribe(ws, { symbols, interval })
│
├── إزالة ws من subscribers
├── إيقاف الاستقصاء إذا لا مشتركين
├── إلغاء الاشتراك من مصدر البيانات
└── تنظيف Redis
```

#### استقصاء الشموع الأولية (fetchInitialKlines)

```
fetchInitialKlines(symbol, interval)
│
├── Crypto ? Binance REST klines ← يدعم الأطر الفرعية بالدمج
│
├── Sub-minute non-crypto ?
│   ├── getRecentCandles() أولاً
│   └── Yahoo 1m مع interpolation كخيار احتياطي
│
├── Standard intervals ?
│   ├── Yahoo REST
│   ├── TwelveData (للـ 1m فقط) ← تنازلي
│   ├── interpolation من 5m Yahoo
│   └── tick buffer fallback
│
├── تعزيز وتخزين مؤقت
├── دمج الشمعة الحية مع آخر شمعة
└── تحديث tick buffer من Yahoo 1m
```

### 4.4 جدولة الاستقصاء (polling.js)

```
startPolling(symbol)
│
├── فتح السوق؟
│   ├── لا → جدولة الفحص عند nextOpen
│   └── نعم → ↓
│
├── مصدر آخر محدث مؤخرًا؟
│   ├── Binance <5s → تخطي
│   ├── TwelveData <5s (forex) → تخطي
│   └── Yahoo WS <5s → تخطي
│
├── cascadeFetchQuote()
│   ├── Yahoo REST (10s timeout)
│   └── TwelveData REST fallback
│
├── processTick() + broadcast()
│
├── إعادة الجدولة:
│   ├── Crypto → 2s
│   ├── Forex → 3s
│   └── Indices/Commodity → 5s
│
└── Backoff: فشل → تأخير أسي (max 60s)
```

### 4.5 ساعات التداول والأعياد (marketHours.js + holidays.js)

#### أنواع الأسواق

| النوع | أيام التداول | الساعات (UTC) |
|-------|-------------|---------------|
| **Crypto** | 24/7/365 | دائمًا مفتوح |
| **Forex** | Mon 00:00 → Fri 22:00 | 24 ساعة أيام الأسبوع |
| **Indices US** | Mon-Fri | 13:30-20:00 (شتاء) / 14:30-21:00 (صيف) |
| **Indices EU** | Mon-Fri | 08:00-16:30 (شتاء) / 07:00-15:30 (صيف) |
| **Indices Arab** | Sun-Thu | متغير حسب الدولة |
| **Commodity** | Sun 22:00 → Fri 21:00 | CME Globex |

#### الأعياد المدعومة (14 سوقًا)

US, EU, UK, JP, HK, AU, AR (السعودية، الإمارات، قطر، الكويت، مصر، عمان، البحرين)

حساب عيد الفصح باستخدام خوارزمية Meeus/Jones/Butcher.

---

## 5. خادم API الخلفي (Backend API)

### 5.1 الهيكل

```
api/src/
├── index.ts                ← نقطة الدخول (Express + 4 حلقات خلفية)
├── config/index.ts         ← إعدادات البيئة (Zod validation)
├── middleware/
│   ├── auth.ts             ← JWT authentication + authorization
│   └── errorHandler.ts     ← معالجة الأخطاء الموحدة
├── routes/
│   ├── auth.ts             ← المصادقة (157 سطر، 11 endpoint)
│   ├── accounts.ts         ← الحسابات (56 سطر، 4 endpoints)
│   ├── trading.ts          ← التداول (169 سطر، 10 endpoints)
│   ├── admin.ts            ← لوحة المشرف (349 سطر، 10 endpoints)
│   ├── risk.ts             ← المخاطر
│   ├── reports.ts          ← التقارير
│   └── payments.ts         ← المدفوعات
├── services/
│   ├── auth.ts             ← 186 سطر
│   ├── account.ts          ← 148 سطر
│   ├── trading.ts          ← 465 سطر (أكبر خدمة)
│   ├── MatchingEngine.ts   ← 390 سطر
│   ├── rule.ts             ← 415 سطر
│   ├── report.ts           ← 134 سطر
│   ├── payment.ts          ← المدفوعات
│   └── email.ts            ← البريد الإلكتروني
├── utils/
│   ├── constants.ts        ← 353 سطر (قواعد التمويل، العمولات، السبريد)
│   ├── helpers.ts          ← 95 سطر
│   ├── priceClient.ts      ← 152 سطر (عميل الأسعار)
│   └── ownership.ts        ← 10 سطر
├── types/index.ts          ← 45 سطر (أنواع TypeScript)
└── __tests__/
    ├── 6 ملفات اختبار      ← 113 اختبارًا إجمالاً
    └── ...
```

### 5.2 نقطة الدخول (index.ts)

```
Express App
│
├── Middleware: helmet, cors, morgan, compression, cookie-parser
├── Rate Limiters:
│   ├── auth: 1000/15min
│   ├── trading: 100/min
│   ├── admin: 60/min
│   └── general: 200/min
│
├── Routes:
│   /api/auth         ← 11 endpoint
│   /api/accounts     ← 4 endpoints
│   /api/trading      ← 10 endpoints
│   /api/risk         ← ?
│   /api/reports      ← ?
│   /api/payments     ← ?
│   /api/admin        ← 10 endpoints
│
└── Background Loops:
    ├── Risk Engine     → كل 60 ثانية → checkAllAccounts + checkMarginLevels
    ├── Matching Engine → كل 2 ثانية  → processSLTP + processOrders + trailing/breakeven
    ├── Swap Engine     → كل 1 ساعة   → processSwap
    └── Snapshot        → كل 30 دقيقة → snapshots لجميع الحسابات النشطة
```

### 5.3 خدمة التداول (TradingService - 465 سطر)

```
placeOrder({ symbol, type, side, volume, price?, stopLoss?, takeProfit? })
│
├── التحقق: رمز صحيح، نوع/جانب صحيح، حجم موجب
├── سعر السوق؟ → fetchServerPrice() (لا نثق بسعر العميل)
├── تطبيق spread markup (نصف الفارق لكل اتجاه)
├── التحقق من SL/TP (بيع→SL أعلى، شراء→SL أدنى)
├── RuleEngine.checkOrder() ← التحقق من المخاطر
├── حساب الهامش والعمولة
├── معاملة قاعدة بيانات:
│   ├── إنشاء Order
│   ├── سوق؟ → إنشاء Position (مملوء فورًا)
│   └── حد/إيقاف؟ → Order معلق
└── إرجاع { order, position }

closePosition(id, { volume?, price? })
│
├── دعم الإغلاق الجزئي (تحديد حجم)
├── resolveClosePrice() ← سعر من الخادم أو صريح
├── calculatePnL() مع دعم الأزواج العكسية
├── pro-rata العمولة
├── إنشاء Trade + تحديث الرصيد
└── إرجاع { position, trade, pnl }

modifyPosition(id, { stopLoss, takeProfit })
│
├── فقط للصفقات المفتوحة
├── SL/TP صحيح (شراء→SL أدنى من الدخول)
└── تحديث قاعدة البيانات
```

### 5.4 محرك المطابقة (MatchingEngine - 390 سطر)

```
processSLTP()
│
├── لكل صفقة مفتوحة:
│   ├── جلب السعر الحي (مع تحويل العملات المتقاطعة)
│   ├── حساب P&L العائم + تحديث currentPrice
│   ├── SL? → سعر ≤ SL لصفقة شراء → closePosition
│   └── TP? → سعر ≥ TP لصفقة شراء → closePosition

processOrders()
│
├── لكل أمر معلق (limit/stop):
│   ├── سعر السوق وصل للسعر المطلوب؟
│   │   ├── Buy Limit: سعر ≥ limit ← تنفيذ
│   │   ├── Sell Limit: سعر ≤ limit ← تنفيذ
│   │   ├── Buy Stop: سعر ≥ stop ← تنفيذ
│   │   └── Sell Stop: سعر ≤ stop ← تنفيذ
│   └── نعم → TradingService.placeOrder() كـ Market

processTrailingStops()
│
├── تتبع bestHigh (لصفقات شراء) / bestLow (لصفقات بيع)
├── السعر تحرك لصالحنا بمقدار ≥ trailingStep؟
│   └── نعم → تحديث SL إلى السعر الحالي - step (أو + للبيع)

processBreakEven()
│
├── السعر تحرك ≥ 0.5% لصالحنا؟
│   └── نعم → SL = سعر الدخول

processSwap()
│
├── تطبيق أسعار المبادلة الليلية
├── ثلاثة أضعاف يوم الأربعاء (للفوركس والمعادن)
└── تحديث position.swap + account.balance
```

### 5.5 محرك المخاطر (RuleEngine - 415 سطر)

```
checkOrder(params) ← قبل تنفيذ الأمر
│
├── الحساب نشط؟ ← لا → رفض
├── عدد الصفقات المفتوحة < maxOpenTrades؟ ← لا → رفض
├── حجم الصفقة % من الحساب ≤ maxPositionSize؟ ← لا → رفض
├── حد الخسارة اليومي؟ ← متجاوز → رفض
├── حد الخسارة الإجمالي؟ ← متجاوز → رفض
└── هامش حر كافٍ؟ ← لا → رفض

checkPosition(position) ← أثناء فتح الصفقة
│
├── حساب P&L اليومي (مغلق + عائم)
├── تجاوز حد الخسارة اليومي؟
│   └── نعم → triggerViolation() → إغلاق كل الصفقات + فشل الحساب
├── تجاوز حد الخسارة الإجمالي؟
│   └── نعم → نفس الشيء
└── تحقيق هدف الربح (طور التقييم)؟
    └── نعم → markAccountPassed()

checkMarginLevels()
│
├── equity ≤ 0 ?
│   └── نعم → full stop out + إغلاق كل شيء
├── margin level < 50% ?
│   └── نعم → partial stop out (أكبر خاسر)
├── margin level < 100% ?
│   └── نعم → margin call violation (تحذير فقط)
└── كل شيء طبيعي → لا شيء
```

### 5.6 نقاط النهاية (API Endpoints)

#### المصادقة `/api/auth`

| الطريقة | المسار | Auth | الوصف |
|---------|--------|------|-------|
| POST | /register | - | تسجيل (Zod: email, pass≥8) |
| POST | /login | - | دخول |
| POST | /forgot-password | - | طلب إعادة تعيين |
| POST | /reset-password | - | تنفيذ إعادة التعيين |
| GET | /verify-email/:token | - | تفعيل البريد (redirect) |
| GET | /verify-reset/:token | - | التحقق من رمز التعيين |
| POST | /refresh | - | تجديد JWT |
| POST | /logout | - | خروج |
| GET | /me | ✅ | الملف الشخصي |
| PUT | /me | ✅ | تحديث الملف |
| POST | /change-password | ✅ | تغيير كلمة المرور |

#### التداول `/api/trading`

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| POST | /order | أمر جديد (Zod validation) |
| PUT | /order/:id | تعديل أمر معلق |
| DELETE | /order/:id | إلغاء أمر معلق |
| GET | /positions/:accountId | الصفقات المفتوحة |
| GET | /orders/:accountId | الأوامر المعلقة |
| PUT | /position/:id | تعديل SL/TP |
| POST | /position/:id/close | إغلاق صفقة |
| POST | /positions/:accountId/close-all | إغلاق الكل |
| GET | /history/:accountId | سجل الصفقات (pagination) |
| GET | /stats/:accountId | إحصائيات التداول |

#### الإدارة `/api/admin`

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | /stats | لوحة التحكم |
| GET | /users | قائمة المستخدمين |
| PUT | /users/:id | تحديث مستخدم |
| GET | /accounts | جميع الحسابات |
| PUT | /accounts/:id | تحديث حساب |
| PUT | /payouts/:id | معالجة طلب سحب |
| GET | /payouts | طلبات السحب |
| GET | /violations | آخر 100 مخالفة |
| PUT | /rules/:size/:phase | تعديل قواعد التمويل |
| GET | /payments | المدفوعات |
| PUT | /payments/:id | الموافقة/الرفض على دفعة |

---

## 6. قاعدة البيانات (Database)

### 6.1 نموذج البيانات (Prisma Schema - 302 سطر)

```
User (1) ──── (N) Account
 │                  │
 │                  ├── (N) Position
 │                  │       │
 │                  │       └── (1) Trade (unique positionId)
 │                  │
 │                  ├── (N) Order
 │                  │
 │                  ├── (N) RuleViolation
 │                  │
 │                  └── (N) DailySnapshot (unique accountId+date)
 │
 ├── (N) Payment
 │
 └── (N) PayoutRequest

TradingRuleConfig (قوالب القواعد، مرتبطة بـ accountSize+phase)
```

### 6.2 الحقول الرئيسية

| الجدول | الحقول المهمة |
|--------|--------------|
| **Account** | balance (Decimal), equity, status (active/failed/passed/withdrawn), phase (evaluation_1/evaluation_2/funded), leverage (100), profitTarget, maxDailyLoss, maxOverallLoss, maxPositionSize, maxOpenTrades, minTradingDays, tradingDaysCount |
| **Position** | symbol, side, volume, openPrice, currentPrice, stopLoss, takeProfit, trailingStop/Step, breakEven, swap, commission, profit, margin, status (open/closed), closePrice, closeReason, time (createdAt) |
| **Order** | symbol, type (market/limit/stop), side, volume, price, stopLoss, takeProfit, trailingStop, trailingStep, breakEven, timeInForce, status (pending/filled/cancelled/expired), filledVolume/Price |
| **Trade** | symbol, side, volume, openPrice, closePrice, profit, swap, commission, duration, openTime, closeTime, closeReason |
| **DailySnapshot** | date, balance, equity, dailyPnl, totalPnl, openPositions, margin, freeMargin, marginLevel |
| **TradingRuleConfig** | accountSize, phase, profitTarget, maxDailyLoss, maxOverallLoss, maxPositionSize, maxOpenTrades, leverage, commission, spreadMarkup |

---

## 7. تدفق البيانات (Data Flow)

### 7.1 تدفق الأسعار (Price Flow)

```
مصادر البيانات الخارجية
│
├── Binance WS (crypto, ~1s) ──→ processTick → candleStates → broadcast → client
├── Yahoo WS (non-crypto)  ──→ processTick → candleStates → broadcast → client
├── TwelveData WS (forex)  ──→ processTick → candleStates → broadcast → client
├── Yahoo REST (polling)   ──→ processTick → candleStates → broadcast → client
├── TwelveData REST (1m fallback)
└── CoinGecko REST (crypto backup, 60s)
         │
         ▼
   processTick(symbol, price, time)
         │
         ├── 1. priceCache[symbol] = { price, change, time }
         │
         ├── 2. tickBuffer[symbol].push(tick)
         │
         ├── 3. لكل إطار زمني:
         │        compute OHLC → candleStates[symbol][interval]
         │        bucket تغير؟ → broadcast('candle')
         │
         └── 4. broadcast('tick', { symbol, price, change, time })
                  │
                  ▼
            WebSocket clients
                  │
                  ▼
            dataClient.onTick()
                  │
                  ├── priceCache.set(symbol, tick)
                  ├── notifyListeners()
                  └── onTick callbacks[]
```

### 7.2 تدفق الأوامر (Order Flow)

```
المستخدم → OrderPanel → useTradePage.handlePlaceOrder()
                                    │
                                    ├── التحقق من السعر الحي (لأوامر السوق)
                                    ├── التحقق من الركود (stale)
                                    └── POST /api/trading/order
                                          │
                                          ▼
                                    TradingService.placeOrder()
                                          │
                                          ├── التحقق من الرمز والحجم والنوع
                                          ├── fetchServerPrice()
                                          ├── Spread Markup
                                          ├── RuleEngine.checkOrder()
                                          ├── حساب الهامش والعمولة
                                          ├── معاملة DB: Order + Position
                                          └── إرجاع { order, position }
                                                │
                                                ▼
                                          ✓ فورًا (سوق) أو معلق (حد/إيقاف)
                                           │
                                           ▼
                                    Matching Engine (كل 2 ثانية)
                                          │
                                          ├── processOrders() → تنفيذ الحد/الإيقاف
                                          ├── processSLTP()  → تفعيل SL/TP
                                          ├── processTrailingStops()
                                          └── processBreakEven()
```

### 7.3 تدفق P&L (Profit/Loss Flow)

```
خادم WebSocket
│
├── tick { price, change } ← كل 2-5 ثوان
│       │
│       ▼
├── priceCache.set(symbol, tick)
├── notifyListeners()
│       │
│       ▼
├── useLivePrice(position.symbol) → calcPnl(side, openPrice, livePrice, volume, symbol)
│   ├── LivePnl.tsx ← لكل صفقة على حدة
│   └── AccountSummary.tsx ← الإجمالي عبر useSmoothTotalFloatingPnl
│
└── Matching Engine (API, كل 2s)
    ├── processSLTP() ← يحسب P&L العائم
    ├── يُحدّث position.currentPrice
    └── يتحقق من تفعيل SL/TP
```

---

## 8. مصادر بيانات السوق

### 8.1 مقارنة المصادر

| المصدر | النوع | التغطية | السرعة | الحدود |
|--------|-------|---------|--------|--------|
| **Yahoo Finance** | REST + WS | كل شيء عدا العملات الرقمية | 2-5s polling | غير محدود (مجاني) |
| **Binance** | WS + REST | 17 عملة رقمية | ~1s (WS) | غير محدود (مجاني) |
| **TwelveData** | REST + WS | فوركس + مؤشرات | حسب الخطة | 800 طلب/يوم (مجاني) |
| **CoinGecko** | REST | 17 عملة رقمية (احتياطي) | 60s | غير محدود (مجاني) |

### 8.2 سلسلة الاعتماد (Cascade Logic)

```
للشموع التاريخية (fetchInitialKlines):
  1. Binance REST (للعملات الرقمية فقط)
  2. Yahoo REST (لكل الرموز)
  3. TwelveData REST (للـ1m فقط)
  4. Interpolation من 5m Yahoo
  5. Tick buffer fallback
  6. Mock data (آخر خيار)

للأسعار الحية (polling):
  1. Binance WS (crypto، محدث <5s) → تخطي
  2. TwelveData WS (فوركس، محدث <5s) → تخطي
  3. Yahoo WS (كل الرموز، محدث <5s) → تخطي
  4. Yahoo REST (استقصاء مباشر)
  5. TwelveData REST (احتياطي)

للمؤشرات العربية (MSM30، BAX):
  → لا Yahoo ولا TwelveData ← Mock data 100%
```

### 8.3 تفاصيل كل مصدر

#### Yahoo Finance (`yahoo.js`)
- REST: `query1.finance.yahoo.com/v8/finance/chart`
- WS: `wss://streamer.finance.yahoo.com/`
- User-agent spoofing (10s AbortController timeout)
- WS يدعم بروتوكول JSON فقط (يكتشف protobuf ويتخلى بعد 5 أخطاء)
- Watchdog لإعادة الاتصال

#### Binance (`binance.js`)
- WS: `wss://stream.binance.com:9443/ws/!miniTicker@arr` (جميع الرموز)
- REST: `api.binance.com/api/v3/klines` (500/1000 شمعة)
- يدعم الأطر الفرعية (sub-minute) عبر دمج شموع 1s
- Watchdog: يعيد الاتصال بعد 30s صمت

#### TwelveData (`twelvedata.js`)
- WS: `wss://ws.twelvedata.com/v1/quotes/price?apikey=...`
- REST: `api.twelvedata.com/time_series`
- إعادة الاتصال بتأخير أسي (1.3^retry, max 120s)
- الاشتراك في 8 رموز لكل رسالة (حد TwelveData)
- يتخلى بعد 10 محاولات فاشلة (`TD_MAX_RETRIES`)

#### CoinGecko (`coingecko.js`)
- REST: `api.coingecko.com/api/v3/simple/price`
- 17 عملة رقمية دفعة واحدة
- يتخطى إذا كان Binance محدثًا <10s
- يستدعى كل 60 ثانية من index.js

---

## 9. محرك التداول والمطابقة

### 9.1 أنواع الأوامر

| النوع | الوصف | التنفيذ |
|-------|-------|---------|
| **Market** | سوقي (فوري) | يملأ فورًا بسعر السوق الحالي |
| **Limit** | حد (بسعر محدد) | معلق حتى يصل السعر للسعر المطلوب |
| **Stop** | وقف (تفعيل عند السعر) | معلق، عند التفعيل يصبح سوقي |

### 9.2 عقود التداول (Contract Sizes)

| الفئة | حجم العقد (لكل لوت) |
|-------|-------------------|
| **Forex** | 100,000 |
| **XAUUSD** | 100 |
| **XAGUSD** | 5,000 |
| **USOIL / UKOIL** | 1,000 |
| **SPX** | 50 |
| **BTC / ETH** | 1 |
| **Natural Gas** | 10,000 |

### 9.3 هيكل العمولات والسبريد

| الفئة | العمولة (لكل لوت) | السبريد (pips) |
|-------|------------------|----------------|
| **Forex** | $3.50 | 0.2 |
| **Metals** | $3.50 | 0.3 |
| **Crypto** | $0 | 0 |
| **Indices** | $1.50 | 0.5 |
| **Oil** | $1.50 | 0.3 |

### 9.4 أسعار المبادلة (Swap)

| الفئة | Long (شراء) | Short (بيع) |
|-------|------------|-------------|
| **Forex** | -5 | -5 |
| **Metals** | -8 | -6 |
| **Crypto** | -20 | -20 |
| **Indices** | -3 | -3 |
| **Oil** | -5 | -5 |

- ثلاثة أضعاف يوم الأربعاء (للفوركس والمعادن)

### 9.5 مؤشرات التمويل (Funding Rules)

| حجم الحساب | سعر التقييم | سعر فوري (ممول) | تقسيم الأرباح |
|-----------|-------------|-----------------|--------------|
| $5,000 | $49 | $99 | 80/20 |
| $10,000 | $79 | $179 | |
| $25,000 | $149 | $349 | |
| $50,000 | $249 | $599 | |
| $100,000 | $449 | $999 | |
| $200,000 | $799 | $1,799 | |

#### أهداف التقييم

| الطور | هدف الربح | حد الخسارة اليومي | حد الخسارة الإجمالي |
|-------|----------|-------------------|-------------------|
| **Evaluation 1** | 8% | 6% | 10% |
| **Evaluation 2** | 5% | 6% | 10% |
| **Funded** | لا يوجد | 6% | 10% |

للحسابات الصغيرة (5k/10k): حد يومي 4%، حد إجمالي 8%.

---

## 10. محرك إدارة المخاطر

### 10.1 قائمة التحقق قبل الأمر (checkOrder)

```
✓ الحساب نشط
✓ عدد الصفقات المفتوحة < الحد الأقصى
✓ حجم الصفقة % من الحساب ≤ الحد الأقصى
✓ حد الخسارة اليومي غير متجاوز
✓ حد الخسارة الإجمالي غير متجاوز
✓ هامش حر كافٍ
```

### 10.2 المراقبة المستمرة

```
كل 60 ثانية → checkAllAccounts()
├── حسابات تجاوزت الخسارة الإجمالية → فشل + إغلاق الكل
└── حسابات حققت هدف الربح (في التقييم) → نجاح + ترقية للطور التالي

كل 60 ثانية → checkMarginLevels()
├── حقوق الملكية ≤ 0 → إغلاق كامل + فشل
├── مستوى الهامش < 50% → إغلاق جزئي (أكبر صفقة خاسرة)
└── مستوى الهامش < 100% → تحذير (margin call)

كل 2 ثانية → Matching Engine
├── processOrders() → تنفيذ الحد/الإيقاف
├── processSLTP() → تفعيل SL/TP
├── processTrailingStops() → تحديث الوقف المتحرك
└── processBreakEven() → نقل الوقف لنقطة الدخول
```

### 10.3 أنواع المخالفات

| المخالفة | الإجراء |
|----------|---------|
| تجاوز الخسارة اليومية | فشل الحساب + إغلاق كل الصفقات |
| تجاوز الخسارة الإجمالية | فشل الحساب + إغلاق كل الصفقات |
| Margin Call (هامش <100%) | تسجيل مخالفة + تحذير |
| Stop Out جزئي (هامش <50%) | إغلاق أكبر صفقة خاسرة |
| Stop Out كامل (هامش ≤ 0) | فشل + إغلاق الكل |

---

## 11. استراتيجية الاختبارات (Testing Strategy)

### 11.1 نظرة عامة

| المجموعة | الملفات | الاختبارات | البيئة |
|----------|---------|-----------|--------|
| **Frontend (Vitest + happy-dom)** | 13 | 266 | jsdom (happy-dom) |
| **API (Vitest, Node)** | 6 | 113 | Node |
| **الإجمالي** | **19** | **379** | - |

### 11.2 تفاصيل الاختبارات الأمامية (13 ملف، 266 اختبار)

| الملف | الاختبارات | ما يختبره |
|------|-----------|-----------|
| `tradingEngine.test.ts` | 54 | formatPrice (حدود)، getContractSize (جميع الرموز)، calcPnl (جميع الفئات)، tradingApi (تعاملات HTTP) |
| `trading.test.ts` | 27 | formatPrice، getContractSize، calcPnl (الوظائف الأساسية) |
| `timeframes.test.tsx` | 33 | الشموع الوهمية (OHLC صحيح، حجم، تغطية) |
| `OrderPanel.test.tsx` | 15 | واجهة الأوامر (تقديم، أحداث) |
| `TradeTopBar.test.tsx` | 13 | شريط التداول العلوي |
| `OrdersTable.test.tsx` | 7 | جدول الأوامر المعلقة |
| `PositionsTable.test.tsx` | 9 | جدول الصفقات |
| `HistoryTable.test.tsx` | 6 | سجل التداول |
| `Trade.test.tsx` | 6 | صفحة التداول |
| `useRealtimeCandles.test.ts` | 5 | شموع حية (cache، mock، market مغلق، race condition) |
| `chartPrice.test.ts` | 3 | سعر المرجع على الرسم |
| أخرى | 2 | (بارrels) |
| **Server tests** | 88 | engine (78) + ws-handlers (10) |

### 11.3 تفاصيل اختبارات API (6 ملفات، 113 اختبار)

| الملف | الاختبارات | ما يختبره |
|------|-----------|-----------|
| `trading.test.ts` | 31 | TradingService: placeOrder (صلاحية، سوق، حد/إيقاف)، closePosition (كلي/جزئي)، modify، cancel، statistics |
| `helpers.test.ts` | 38 | generateLogin/Password، contractSize، category، calculatePnL، calculateMargin، isMarketOpen، formatDecimal، pagination |
| `constants.test.ts` | 20 | قيم الثوابت (أسعار الحسابات، القواعد، العمولات، السبريد، المبادلة) |
| `matching.test.ts` | 10 | MatchingEngine: processOrders (حد شراء/بيع، إيقاف شراء/بيع)، processTrailingStops، processBreakEven |
| `rule.test.ts` | 11 | RuleEngine: checkOrder (صلاحية)، calculateDailyPnL، checkAllAccounts (فشل/نجاح)، checkMarginLevels (stop out) |
| `priceClient.test.ts` | 3 | PriceSnapshotClient: fetchPrices، cache، fallback، stale |

### 11.4 تقنيات الاختبار

- **Hoisted Mocks**: `vi.hoisted()` لـ Prisma (تجنب مشكلة رفع المتغيرات)
- **Mock Prisma**: `const prisma = {}` ثم إعادة تعيين لكل اختبار `beforeEach`
- **Mock WebSocket**: `vi.mock('../lib/ws-handlers.js')` لاختبارات WS
- **Mock Market Hours**: `vi.mock('../marketHours.js')`
- **testing-library/react**: لاختبار المكونات
- **happy-dom**: بيئة DOM خفيفة للاختبارات

---

## 12. الأداء والتحسينات

### 12.1 تحسينات الواجهة الأمامية

| التقنية | الموقع | التفاصيل |
|---------|--------|----------|
| **lazy loading** | `App.tsx` | React.lazy لكل الصفحات + Suspense |
| **memo** | ProfessionalChart، OrderPanel، LivePnl، إلخ | تجنب إعادة التصيير غير الضروري |
| **useRef** | ProfessionalChart (30+ refs) | تجنب تغيير الحالة لإدارة الكائنات |
| **rAF batching** | تحديث الشموع، تقاطع المؤشرات | دمج التحديثات في إطار واحد |
| **Web Worker** | indicators.worker.ts | RSI و MACD خارج الخيط الرئيسي |
| **CSS Modules** | trade.module.css | تجنب تعارض الأنماط |
| **debounced ResizeObserver** | ProfessionalChart | 80ms تأخير لتجنب إعادة الحساب المتكرر |
| **useCallback + useMemo** | جميع hooks | منع إعادة إنشاء الدوال والكائنات |
| **priceCache Listeners** | useRealtime.ts | إشعارات انتقائية (تجنب بث الكل) |

### 12.2 تحسينات الخادم

| التقنية | التفاصيل |
|---------|----------|
| **tickBuffer (max 100k)** | منع تسرب الذاكرة في مخازن التيك |
| **priceCache cleanup (كل 10 دقائق)** | إزالة الأسعار الأقدم من 5 دقائق |
| **klinesCache expiry (2h)** | انتهاء صلاحية الشموع المخزنة مؤقتًا |
| **Exponential backoff** | في polling و TwelveData WS reconnect |
| **Source freshness check** | تجنب الطلبات غير الضرورية (Binance <5s, Yahoo WS <5s) |
| **saveState كل 60s** | استمرارية الحالة عبر إعادة التشغيل |
| **morgan (logging)** | تسجيل الطلبات في بيئة الإنتاج |
| **Rate limiters** | 100/دقيقة للتداول، 60/دقيقة للإدارة |

### 12.3 معالجة الحواف (Edge Cases)

| الحالة | المعالجة |
|--------|---------|
| **السوق مغلق** | توليد بيانات وهمية + استقصاء كل 30s لفتح السوق |
| **WS timeout (2s)** | استخدام بيانات وهمية (mock) كخيار احتياطي |
| **NaN في المؤشرات** | استبدال بـ 0 (MA) أو 50 (RSI) |
| **تغيير الرمز أثناء التحميل** | التحقق من keyRef.current قبل التحديث |
| **صفقات بدون سعر حي** | استخدام openPrice أو currentPrice |
| **تجاوز tickBuffer (100k)** | اقتطاع (truncate) أقدم التيكات |
| **فشل جلب السعر** | استخدام آخر سعر معروف (stale cache) |
| **غير متزامن (race condition) في WS** | lateInitialCache للرسائل التي تصل مبكرًا |
| **الأطر الفرعية (sub-minute)** | Interpolation من 1m Yahoo أو دمج 1s Binance |

---

## 13. الوضع الحالي والخطوات القادمة

### 13.1 الوضع الحالي

#### ✅ تم الإنجاز
- **هيكل ثلاثي الطبقات** كامل (Frontend + API + WS Server)
- **91 رمز تداول** عبر 7 فئات (رئيسي، عرضي، نادر، معادن، طاقة، مؤشرات، عملات رقمية)
- **محرك شموع متكامل** مع 16 إطارًا زمنيًا
- **محرك مطابقة** مع تنفيذ الحد/الإيقاف/السوق، الوقف المتحرك، ونقطة التعادل
- **محرك مخاطر** مع مراقبة الخسارة اليومية/الإجمالية والهامش
- **دعم أسواق عربية** (6 مؤشرات خليجية + 2 إضافيين: عمان، البحرين)
- **نظام حساب التمويل** (Evaluation 1 → Evaluation 2 → Funded)
- **379 اختبارًا** جميعها ناجحة
- **TypeScript صارم** مع `strict: true` و `noUnusedLocals` و `verbatimModuleSyntax`
- **بناء ناجح**: `tsc -b && vite build` بدون أخطاء
- **خطوط الدخول/SL/TP** على الرسم البياني
- **تحديث P&L سلس** مع استيفاء (interpolation كل 80ms)
- **واجهة عربية** مع دعم RTL
- **مصادر بيانات مجانية** بالكامل (Yahoo, Binance, TwelveData, CoinGecko)

#### 🔄 قيد التطوير
- **تحسين عرض الصفقات** (أعمدة ومعلومات إضافية)
- **تطوير خوارزميات التداول** (مؤشرات متقدمة أو إشارات)

### 13.2 المقاييس الفنية

| المقياس | القيمة |
|---------|--------|
| إجمالي سطور الكود (تقديري) | ~15,000+ |
| عدد الملفات المصدرية | 70+ |
| عدد المكونات | 35+ |
| عدد اختبارات TypeScript | 6 ملفات تكوين |
| عدد جداول Prisma | 10 |
| عدد نقاط API النهائية | ~42 |
| عدد رموز التداول | 91 |
| عدد الأطر الزمنية | 16 |

### 13.3 الهيكل التنظيمي للملفات

```
fundedPro/
├── api/           → 30+ ملف (خادم Express + Prisma)
├── server/        → 12 ملف (خادم WebSocket + مصادر بيانات)
├── shared/        → 4 ملفات (أنواع، ثوابت، رموز)
├── src/           → 60+ ملف (واجهة React)
├── docker-compose.yml
├── nginx.conf
└── package.json   → 30+ أمر نصي
```

### 13.4 توصيات مستقبلية

1. **مصادر بيانات تجارية** - إضافة TwelveData مدفوع (API key نشط بالفعل) لتحسين جودة البيانات
2. **Redis في الإنتاج** - حاليًا يستخدم fallback للذاكرة، تفعيل Redis الحقيقي للتنسيق بين مثيلات متعددة
3. **WebSocket محسن** - إعادة كتابة ws-client بخدمة Service Worker للاتصال حتى عند تبديل الصفحات
4. **تطبيق جوال** - React Native أو PWA
5. **مؤشرات مخصصة** - إضافة المزيد من المؤشرات (Ichimoku, Fibonacci, Volume Profile)
6. **نسخ احتياطي للبيانات** - أتمتة نسخ PostgreSQL
7. **CI/CD** - GitHub Actions للاختبار والنشر التلقائي
8. **لوحة تحكم متقدمة** - رسوم بيانية إضافية للإحصائيات (منحنى حقوق الملكية، توزيع المخاطر)
9. **تكامل مع وسطاء حقيقيين** - API لوسطاء مثل Interactive Brokers (لم يعد OANDA)
10. **توسيع الأسواق العربية** - إضافة المزيد من المؤشرات والأسهم العربية

---

*آخر تحديث: يوليو 2026*

*إجمالي الاختبارات: 379 (266 أمامي/خادم + 113 API) - جميعها ناجحة*
*TypeScript: 0 أخطاء*
*Build: ناجح*
