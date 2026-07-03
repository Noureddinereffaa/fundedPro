# FundedPro - Professional Prop Trading Platform

A complete, production-ready proprietary trading platform with real-time charting, risk management, and admin panel. Built to compete with FTMO, MyFundedFX, The5ers, E8 Funding.

## Features

### 🎯 Core Trading
- **Real-time Charting** - TradingView Lightweight Charts with 13 timeframes (1s to 1M)
- **85+ Markets** - Forex majors/crosses/exotics, Metals, Energy, Indices, Crypto
- **Order Types** - Market, Limit, Stop with SL/TP
- **Position Management** - Modify, close, partial close
- **WebSocket Data** - Sub-second updates via local data server

### 👤 User Features
- **Authentication** - JWT with refresh tokens, email verification, password reset
- **Dashboard** - Account overview, live price ticker, equity curve
- **Trading Interface** - Full trading panel with live prices
- **KYC Verification** - Document upload flow
- **MT5 Credentials** - Secure credential management
- **Trading History** - Filterable trade log with stats
- **Payout Requests** - 80% profit split, automated calculation
- **Referral Program** - 10% commission, tracking dashboard

### 🛡️ Risk Management (Rule Engine)
- Daily Loss Limit (default 6%)
- Overall Loss Limit (default 10%)
- Profit Targets (Phase 1: 8%, Phase 2: 5%)
- Max Open Trades (5 eval, 10 funded)
- Max Lot Size per position
- Min Trading Days (5 eval)
- News/Weekend restrictions (configurable)
- Real-time violation tracking

### ⚙️ Admin Panel
- Dashboard with revenue/users/accounts stats
- User management (KYC, roles)
- Account management (phase, status, balance)
- Payout processing (approve/reject)
- Rule violations log
- Trading rules configuration per size/phase

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router, Tailwind-like CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Real-time | WebSocket (ws library) + Yahoo/Binance feeds |
| Charts | TradingView Lightweight Charts |
| Auth | JWT (15m access / 7d refresh) + HttpOnly cookies |
| Payments | Stripe Checkout + Webhooks |
| Email | Nodemailer (SMTP) |

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- npm/yarn

### Development

```bash
# 1. Clone and install
cd fundedPro
npm install
cd api && npm install && cd ..

# 2. Configure environment
cp api/.env.example api/.env
# Edit api/.env with your DATABASE_URL, JWT secrets, etc.

# 3. Setup database
cd api
npx prisma db push
npm run db:seed
cd ..

# 4. Start all services (3 terminals)
# Terminal 1: WebSocket data server
node server/index.js

# Terminal 2: Backend API
cd api && npm run dev

# Terminal 3: Frontend
npm run dev

# Access at http://localhost:5173
```

### Docker Production

```bash
# 1. Create production env
cp api/.env.example api/.env.production
# Edit with production secrets

# 2. Build and start
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 3. Run migrations
docker-compose exec api npx prisma migrate deploy
```

## Project Structure

```
fundedPro/
├── api/                      # Backend API
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.ts           # Default rules
│   ├── src/
│   │   ├── config/           # Env validation
│   │   ├── middleware/       # Auth, error handling
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── types/            # TypeScript types
│   │   ├── utils/            # Constants, helpers
│   │   └── index.ts          # Express app
│   └── package.json
├── src/                      # Frontend
│   ├── components/           # Reusable UI
│   ├── contexts/             # Auth, Toast
│   ├── pages/                # Route pages
│   │   ├── admin/            # Admin panel
│   │   └── user/             # User pages
│   ├── utils/                # API client, market data, WS hooks
│   ├── App.tsx               # Routes
│   └── main.tsx
├── server/                   # WebSocket data server
│   └── index.js              # Tick buffer + Candle engine
├── docker-compose.yml
├── nginx.conf
└── README.md
```

## API Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/verify-email/:token
GET    /api/auth/me
PUT    /api/auth/me
POST   /api/auth/change-password
```

### Accounts
```
GET    /api/accounts
POST   /api/accounts/purchase
GET    /api/accounts/:id
GET    /api/accounts/:id/snapshots
```

### Trading
```
POST   /api/trading/order
PUT    /api/trading/order/:id
DELETE /api/trading/order/:id
GET    /api/trading/positions/:accountId
PUT    /api/trading/position/:id
POST   /api/trading/position/:id/close
GET    /api/trading/history/:accountId
GET    /api/trading/stats/:accountId
```

### Risk
```
GET    /api/risk/status/:accountId
```

### Reports
```
GET    /api/reports/daily/:accountId
GET    /api/reports/equity/:accountId
GET    /api/reports/stats/:accountId
GET    /api/reports/symbols/:accountId
```

### Payments
```
POST   /api/payments/checkout
POST   /api/payments/payout
GET    /api/payments/history
GET    /api/payments/payouts
POST   /api/payments/webhook
```

### Admin
```
GET    /api/admin/stats
GET    /api/admin/users
PUT    /api/admin/users/:id
GET    /api/admin/accounts
PUT    /api/admin/accounts/:id
GET    /api/admin/payouts
PUT    /api/admin/payouts/:id
GET    /api/admin/violations
PUT    /api/admin/rules/:accountSize/:phase
```

## Default Trading Rules

| Phase | Profit Target | Daily Loss | Overall Loss | Max Trades | Min Days |
|-------|---------------|------------|--------------|------------|----------|
| Eval 1 | 8% | 6% | 10% | 5 | 5 |
| Eval 2 | 5% | 6% | 10% | 5 | 5 |
| Funded | - | 6% | 10% | 10 | 0 |

## Environment Variables

### Backend (api/.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/fundedpro
JWT_SECRET=your-256-bit-secret
JWT_REFRESH_SECRET=your-256-bit-refresh-secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
CLIENT_URL=http://localhost:5173
API_URL=http://localhost:3001
PORT=3001
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3002
```

## Data Sources (Free)

| Market | Source |
|--------|--------|
| Crypto | Binance WebSocket (live) |
| Forex/Metals/Indices | Yahoo Finance (3s polling) + interpolation |
| All | TwelveData (optional, requires API key) |

The WebSocket server polls Yahoo every 3 seconds, builds tick buffers, and generates candles for all 13 intervals locally.

## Deployment Checklist

- [ ] Set strong JWT secrets (256-bit)
- [ ] Configure PostgreSQL with SSL
- [ ] Set up Stripe webhooks
- [ ] Configure SMTP for emails
- [ ] Generate SSL certificates for Nginx
- [ ] Set up database backups
- [ ] Configure monitoring (PM2, logs)
- [ ] Set up CI/CD pipeline

## License

MIT License - feel free to use for your own prop trading firm.

## Support

For issues and feature requests, please open a GitHub issue.