import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Song {
    id: string
    spotify_id: string
    title: string
    artist: string
    cover_url: string
    preview_url: string | null
    is_claimed: boolean
    claimed_by: string | null
    claimed_at: string | null
}

export interface Venue {
    id: string
    name: string
    city: string | null
    has_claimed: boolean
}

export interface EventState {
    id: number
    is_open: boolean
    opens_at: string | null
    closes_at: string | null
}
