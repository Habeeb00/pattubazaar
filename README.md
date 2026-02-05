# 🎧 Song Lock-In Platform

A real-time, event-based platform where hackathon venues race to claim one of 100 curated songs. Each song can be booked once and becomes permanently tied to that venue for the event.

## 🚀 Features

- ⏱️ **Time-gated claiming** - Opens at specific event time
- 🎵 **100 curated songs** - From Spotify
- 🔒 **Atomic claims** - No race conditions
- ⚡ **Real-time updates** - See songs disappear as they're claimed
- 🎨 **Premium UI** - Glassmorphism, animations, and glow effects
- 🏆 **Fair competition** - One song per venue, enforced server-side

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Backend**: Supabase (Auth, Postgres, Realtime, RPC)
- **External**: Spotify API

## 📦 Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Add your Supabase credentials to .env
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🏃 Running the App

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📋 Next Steps

1. Set up Supabase project
2. Create database tables (see PLAN.md)
3. Implement RPC functions
4. Add authentication
5. Connect real-time subscriptions
6. Import song data from Spotify

## 📖 Documentation

See [PLAN.md](./PLAN.md) for detailed architecture and implementation plan.

## 🎯 Philosophy

**Live. Fair. Fast. Memorable.**

---

Built for hackathon events to create excitement, urgency, and a shared playlist experience. 🎉
