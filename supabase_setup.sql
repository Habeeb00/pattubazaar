-- Create a table to store bookings
create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  plot_id text not null unique,
  user_email text not null,
  venue_name text not null,
  song_name text not null
);

-- Create a table to store songs from Spotify playlist
create table public.songs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  spotify_id text not null unique,
  title text not null,
  artist text not null,
  cover_url text not null,
  preview_url text,
  track_index int not null unique,
  is_claimed boolean default false,
  claimed_by uuid,
  claimed_at timestamptz
);

-- event settings for countdown
create table public.event_settings (
  id int primary key,
  booking_opens_at timestamp with time zone,
  booking_closes_at timestamp with time zone
);

-- Insert default row
insert into public.event_settings (id, booking_opens_at)
values (1, now() + interval '1 hour')
on conflict (id) do nothing;

-- Set up Row Level Security (RLS) if you want to restrict access
-- For this simple demo, we might just enable read/write for everyone or authenticated users
alter table public.bookings enable row level security;
alter table public.songs enable row level security;
alter table public.event_settings enable row level security;

-- Allow anyone to read bookings (so the grid updates)
create policy "Public bookings are viewable by everyone"
  on bookings for select
  using ( true );

create policy "Public songs are viewable by everyone"
  on songs for select
  using ( true );

create policy "Public settings are viewable by everyone"
  on event_settings for select
  using ( true );

-- Allow any authenticated user (or anon for now since we handle auth in app) to insert
-- Since we are doing "soft" auth in the app, we can allow anon inserts but validate in app?
-- Ideally, we'd use Supabase Auth, but we are using custom auth. 
-- So we will allow public inserts for this "trust based" system.
create policy "Anyone can insert bookings"
  on bookings for insert
  with check ( true );

create policy "Anyone can update settings"
  on event_settings for update
  using ( true );

-- Allow users to delete? Only admins ideally.
-- For now, let's allow all delete, and filter in UI.
create policy "Anyone can delete bookings"
  on bookings for delete
  using ( true );
