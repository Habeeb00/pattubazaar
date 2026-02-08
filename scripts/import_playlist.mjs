import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env.local from the project root
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '..', '.env.local')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

// Load songs data from JSON file
const songsDataPath = path.join(process.cwd(), 'scripts', 'songs-data.json')
const songsData = JSON.parse(fs.readFileSync(songsDataPath, 'utf-8'))

if (!Array.isArray(songsData) || songsData.length === 0) {
    console.error('Invalid songs data file.')
    process.exit(1)
}

// Prepare rows for insertion
const rows = songsData.map(song => ({
    spotify_id: song.spotify_id,
    title: song.title,
    artist: song.artist,
    cover_url: '', // Keep empty since we're using local images
    preview_url: null,
    track_index: song.track_index
}))

const { error } = await supabase
    .from('songs')
    .upsert(rows, { onConflict: 'spotify_id' })

if (error) {
    console.error('Failed to upsert songs:', error)
    process.exit(1)
}

console.log(`✓ Imported ${rows.length} songs into database`)
console.log(`✓ Songs ordered by track_index for consistent grid display`)
