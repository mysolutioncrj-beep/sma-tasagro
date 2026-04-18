# Agro MLM — Product Requirements Document

## Original Problem Statement
Create an MLM software (originally requested PHP+MySQL, implemented in React+FastAPI+MongoDB per platform constraints) with:
- Binary MLM plan + integrated e-commerce
- Membership: ₹10,000 Product Kit (18 agro products) → ₹1,000/month cashback × 24 months
- Direct Referral Income: 5% per member, L-R binary
- Level Income: 24 levels with tiered %
- Team Sales Income: 10% of team profit
- Milestone rewards: 25 direct recruits = ₹5,000 bonus + ₹1,000/mo × 10 months (up to ₹100Cr tier)
- E-commerce: orders, offers (BOGO/festive), product/category management
- Admin panel for full control
- User panel for wallet, tree view, earnings, shop, withdrawals

## User Choices
- Stack: React + FastAPI + MongoDB (PHP not supported on Emergent)
- Auth: JWT email/password with bcrypt + httpOnly cookies
- Payment: Mock/instant for MVP (Razorpay is phase 2)
- Scope: Full — MLM + E-commerce + Admin
- Design: Black + Gold premium luxury (Cabinet Grotesk / Manrope fonts)

## User Personas
1. **Member / Distributor** — joins with a sponsor code, buys the kit, tracks earnings, recruits, shops
2. **Admin** — manages users, products, offers, orders, kit approvals, withdrawals, payouts
3. **Customer (prospect)** — browses landing page, registers

## Architecture
- Backend (`/app/backend/server.py`): FastAPI single-file, Motor async MongoDB, bcrypt + PyJWT
- Frontend (`/app/frontend/src/`): React 19, React Router, Tailwind, shadcn/ui, sonner toasts
- DB: MongoDB `agro_mlm_db` with collections: users, kit_orders, orders, products, categories, offers, wallet_transactions, cashback_schedule, milestone_salary_schedule, withdrawals, login_attempts, password_reset_tokens

## Commission Rate Maps (implemented)
- **Direct Referral Bonus** (paid up 24 sponsor levels on every kit purchase):
  L1=5%, L2=2%, L3=2%, L4-9=1%, L10-16=0.5%, L17=0%, L18-24=0.25%
- **Team Level Profit** (paid on order profit up 24 levels):
  L1-4=10%, L5=5%, L6=3%, L7=2%, L8-10=1%, L11-24=0.5%
- **Milestone Tiers** (business targets): 11 tiers from ₹2.5L (₹5K bonus + ₹1K×10mo) up to ₹100Cr (₹3.2Cr bonus + ₹5L×40mo)

## Implemented (as of 2026-02)
### Auth
- Register with optional sponsor_code → BFS placement (L/R spillover)
- Unique referral code auto-generated per user (e.g. USR8ZOFW, ADMIN001)
- JWT access (2h) + refresh (7d) httpOnly cookies
- Login brute-force lock (5 fails → 15min)
- Admin auto-seeded on startup (`admin@agromlm.com` / `Admin@12345`)

### User flows
- `/` Landing (hero, plan explainer, 3 income tables, 11-tier milestone table)
- `/register` with sponsor code + auto-login
- `/login`
- `/dashboard` (KPIs: wallet, earnings, directs, team, team_business, milestone_tier, next cashback + recent transactions + quick actions + "Buy Kit" banner)
- `/tree` Binary genealogy (5-level grid, iterative render)
- `/team` Direct referrals list
- `/income` Earnings ledger with tab filters (direct / team_level / cashback / milestone / salary)
- `/shop` Product grid with category filter + festive offer banner
- `/cart` localStorage cart → checkout → order → team profit commissions
- `/orders` Order history
- `/withdraw` Request withdrawal, track status
- `/buy-kit` Mock payment → auto-activate, schedule 24 cashbacks, distribute direct bonus

### Admin panel (`/admin`, 9 tabs)
- Overview (revenue, users, pending stats)
- Users (list)
- Kit Orders (history)
- Withdrawals (approve/reject with refund-on-reject)
- Products CRUD
- Categories CRUD
- Offers CRUD
- Orders (all)
- Payouts (run-due-cashback, run-all-cashback, run-salary)

### E-commerce seed data
- 4 categories (Organic Fertilizers, Bio Pesticides, Seeds & Saplings, Growth Enhancers)
- 8 sample agro products with images
- 1 festive BOGO banner

## Testing
- **Backend**: 38/38 tests passed (auth, MLM, commissions, admin, CRUD, role guard)
- **Frontend**: All major UI flows verified
- **Commissions verified**: admin received ₹500 on L1 kit purchase, 10% team-level profit on orders, 24×₹1,000 cashback payout working

## Backlog (next priorities)
### P0
- Real payment gateway (Razorpay or Stripe) replacing mock
- KYC / bank details page for withdrawal approval workflow
- Email verification + forgot-password flow (UI only — backend exists for tokens)

### P1
- Genealogy search & zoom/pan (d3) for deep trees
- Offer auto-apply at checkout (BOGO line detection)
- Profile page (edit name/phone/address)
- Product detail pages with reviews
- Rank progress widget with visual timeline
- Cron job for automatic monthly cashback (currently admin-triggered)

### P2
- PWA / mobile app wrapping
- Multilingual (Hindi)
- Bank account auto-payout via Razorpay Payouts API
- Leaderboards
- Referral QR code generator
- Export PDF statements
