# 🎧 Song Lock-In Platform --- PLAN.md

> Time-gated platform for hackathon venues to claim exactly one unique
> song from a curated list.\
> Built for live events to create excitement, urgency, and a shared
> playlist experience.

------------------------------------------------------------------------

## 1) One-line summary

A real-time, event-based platform where hackathon venues log in during a
fixed window and race to claim one of 100 curated songs; each song can
be booked once and becomes permanently tied to that venue for the event.

------------------------------------------------------------------------

## 2) Core concept

During the event:

-   The platform opens at a specific time.
-   100 song cards appear.
-   Each venue can claim **only one**.
-   Each song can be claimed **only once**.
-   Claims are atomic and enforced server-side.
-   UI updates live via realtime subscriptions.
-   Final state = a fully curated event playlist wall.

Primary goals:

-   Zero race conditions.
-   Clear visual states.
-   Fun, competitive interaction.
-   Works live on big screens.
-   Simple admin controls.

------------------------------------------------------------------------

## 3) Tech stack

Client:

-   React + TypeScript + Vite
-   Tailwind CSS
-   Framer Motion (animations)
-   Toast system for feedback

Backend:

-   Supabase Auth
-   Supabase Postgres
-   Supabase Realtime
-   Supabase RPC (PL/pgSQL)
-   Supabase scheduled jobs / cron

External:

-   Spotify metadata ingestion (pre-event admin tooling)

------------------------------------------------------------------------

## 4) Architecture

Client UI → Supabase Auth → Supabase DB → RPC (claim_song) → Realtime
broadcast.

Design principles:

-   DB is the source of truth.
-   No client-side locking.
-   All enforcement inside RPC.
-   Time-gated at DB level.
-   Realtime drives UI state.

------------------------------------------------------------------------

## 5) User roles

### Venue

-   Log in
-   Wait for countdown
-   Claim exactly one song
-   View live updates
-   See final playlist

### Admin

-   Upload song list
-   Open / close claiming window
-   Reset for new events
-   Export playlist
-   View logs

------------------------------------------------------------------------

## 6) Data model

### 🎵 songs

``` sql
create table songs (
  id uuid primary key default gen_random_uuid(),
  spotify_id text unique not null,
  title text not null,
  artist text not null,
  cover_url text not null,
  preview_url text,
  is_claimed boolean default false,
  claimed_by uuid,
  claimed_at timestamptz
);
```

### 🏢 venues

``` sql
create table venues (
  id uuid primary key references auth.users(id),
  name text not null,
  city text,
  has_claimed boolean default false
);
```

### ⏱️ event_state

``` sql
create table event_state (
  id int primary key,
  is_open boolean default false,
  opens_at timestamptz,
  closes_at timestamptz
);
```

------------------------------------------------------------------------

## 7) Atomic claim RPC

``` sql
create or replace function claim_song(
  song_id_to_claim uuid,
  venue_id uuid
)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1 from event_state
     where id = 1 and is_open = true
  ) then
    raise exception 'Claiming is not open yet';
  end if;

  perform 1 from venues
   where id = venue_id and has_claimed = true;

  if found then
    raise exception 'Venue already claimed a song';
  end if;

  update songs
     set is_claimed = true,
         claimed_by = venue_id,
         claimed_at = now()
   where id = song_id_to_claim
     and is_claimed = false;

  if not found then
    raise exception 'Song already claimed';
  end if;

  update venues
     set has_claimed = true
   where id = venue_id;
end;
$$;
```

------------------------------------------------------------------------

## 8) UI & experience

-   Album-card grid layout.
-   Locked songs grayscale.
-   Available glow.
-   Claimed show venue badge.
-   Countdown timer.
-   Celebration animation.

------------------------------------------------------------------------

## 9) Security & abuse prevention

-   Auth required.
-   One claim per venue enforced in DB.
-   Time window enforced in RPC.
-   Rate limit RPC calls.
-   Logs for suspicious activity.

------------------------------------------------------------------------

## 10) Deployment checklist

-   Supabase project created
-   Tables + RPCs deployed
-   Realtime enabled
-   Admin email configured
-   Spotify credentials added
-   OAuth redirects updated
-   Dry-run event

------------------------------------------------------------------------

## 11) Roadmap

Sprint 0: DB + RPC + admin importer\
Sprint 1: Logs + rate limiting + tests\
Sprint 2: Multi-event + analytics\
Sprint 3: Polish + accessibility

------------------------------------------------------------------------

## 12) Immediate next steps

1.  Create DB migrations.
2.  Build admin importer.
3.  Add countdown UI.
4.  Implement realtime.
5.  Add e2e tests.

------------------------------------------------------------------------

## 13) Philosophy

Live. Fair. Fast. Memorable.
