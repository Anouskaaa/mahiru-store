# Mahiru Store - Subscription Management Dashboard

A dashboard for managing family plan subscription reselling business. Sell Spotify, Apple Music, Canva Pro, and more via family plan invites.

> 💰 Currency: Indonesian Rupiah (IDR)

## Features

- **Dashboard Overview** - Revenue stats, upcoming renewals, overdue payments
- **Customer Management** - Track customers with Telegram/WhatsApp integration
- **Services Catalog** - Manage subscription offerings with pricing
- **Subscription Tracking** - Track family plan slots and invite links
- **Payment Tracking** - Monitor revenue, pending, and overdue payments
- **Telegram Bot** - Customers can check status via Telegram
- **REST API** - Connect other integrations (bots, automations)

## Tech Stack

- **Frontend**: Next.js 14 (React, TypeScript)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Telegram Bot**: node-telegram-bot-api

## Getting Started

### 1. Clone and Install

```bash
cd Shuuush
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `supabase/schema.sql`
3. Copy your project URL and keys from Settings > API

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
API_SECRET_KEY=your-secure-random-string
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Set Up Telegram Bot (Optional)

1. Message @BotFather on Telegram
2. Create a new bot and get your token
3. Add the token to `.env.local`
4. Run the bot:
   ```bash
   npm run bot
   ```

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── customers/
│   │   ├── services/
│   │   ├── subscriptions/
│   │   ├── payments/
│   │   ├── telegram/
│   │   └── dashboard/
│   ├── customers/        # Customer page
│   ├── services/         # Services page
│   ├── subscriptions/    # Subscriptions page
│   ├── payments/         # Payments page
│   └── settings/         # Settings page
├── components/
│   ├── sidebar.tsx       # Navigation sidebar
│   ├── dashboard-context.tsx
│   └── ui/               # UI components
├── lib/
│   ├── supabase.ts      # Supabase client
│   └── api.ts           # API helpers
├── types/
│   └── index.ts         # TypeScript types
└── telegram-bot.ts      # Telegram bot
```

## API Endpoints

### Services
- `GET /api/services` - List all services
- `POST /api/services` - Create service
- `GET /api/services/:id` - Get service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer details
- `GET /api/customers/telegram/:telegramId` - Find by Telegram

### Subscriptions
- `GET /api/subscriptions` - List subscriptions
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions/:id` - Get subscription with slots
- `POST /api/subscriptions/:subId/slots` - Assign slot
- `GET /api/subscriptions/upcoming-renewals` - Get renewals

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment
- `GET /api/payments/summary` - Payment stats
- `GET /api/payments/overdue` - Overdue payments

### Telegram Integration
- `GET /api/telegram/status/:telegramId` - Customer status
- `POST /api/telegram/request-link` - Request invite link
- `GET /api/telegram/renewal/:telegramId` - Renewal dates

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics

## Telegram Bot Commands

- `/start` - Welcome message
- `/status` - Check subscription status
- `/link [service]` - Request invite link
- `/renewal` - Check upcoming renewals
- `/help` - Show commands

## Deployment

### VPS with PM2

```bash
# Build
npm run build

# Start with PM2
pm2 start npm --name "mahiru-store" -- start

# Auto-start on reboot
pm2 startup
pm2 save
```

### Supabase Free Tier Limits

| Resource | Limit | Your Usage |
|----------|-------|------------|
| Database | 500 MB | ~1000 customers |
| API Requests | 500K/month | ~100/day |
| Storage | 1 GB | Invite images |

## License

MIT