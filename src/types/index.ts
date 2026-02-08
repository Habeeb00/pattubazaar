// Core types for the billboard application

export interface Ad {
    id: string
    plots: string[] // Array of plot IDs like "0-0", "0-1", etc.
    imageUrl: string
    message: string
    link?: string
    venueId?: string
    venueName?: string
    createdAt?: string
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

export interface Song {
    id: string
    spotify_id: string
    title: string
    artist: string
    cover_url: string
    preview_url: string | null
    track_index: number
    is_claimed: boolean
    claimed_by: string | null
    claimed_at: string | null
}
