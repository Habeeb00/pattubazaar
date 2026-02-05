
import { useState, useEffect, useMemo } from 'react'
import { BillboardGrid } from './components/BillboardGrid'
import { GridToolbar } from './components/GridToolbar'
import { AuthModal } from './components/AuthModal'
import { supabase } from './lib/supabase'
import type { Ad } from './types'


// Pre-fill all 100 slots with album covers (but not booked yet)
// These are just preview images - users can book any slot
const INITIAL_ADS: Ad[] = Array.from({ length: 100 }, (_, i) => ({
    id: `preview-${i}`,
    plots: [`${Math.floor(i / 10)}-${i % 10}`],
    imageUrl: `https://picsum.photos/seed/${i}/400/400`,
    message: `Song ${i + 1}`,
    venueName: `Artist ${String.fromCharCode(65 + (i % 26))}`,
    link: undefined,
}))

function App() {
    const [timeRemaining, setTimeRemaining] = useState({
        hours: 0,
        minutes: 0,
        seconds: 0
    })

    // Auth State
    const [currentUser, setCurrentUser] = useState<{ email: string; venue: string; role: string } | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    const [selectedPlots, setSelectedPlots] = useState<string[]>([])
    const [ads] = useState<Ad[]>(INITIAL_ADS)

    // Supabase Bookings State
    // Supabase Bookings State
    const [bookings, setBookings] = useState<any[]>([])
    const [bookingOpensAt, setBookingOpensAt] = useState<Date | null>(null)
    const [bookingClosesAt, setBookingClosesAt] = useState<Date | null>(null)
    const [bookedImage, setBookedImage] = useState<string | null>(null)

    // Derived state from Supabase data
    const bookedSlots = useMemo(() => new Set(bookings.map(b => b.plot_id)), [bookings])
    const userBookedSlots = useMemo(() => {
        if (!currentUser) return new Set<string>()
        return new Set(bookings.filter(b => b.user_email === currentUser.email).map(b => b.plot_id))
    }, [bookings, currentUser])

    const userBookedSong = useMemo(() => {
        if (!currentUser) return null
        const booking = bookings.find(b => b.user_email === currentUser.email)
        return booking?.song_name || null
    }, [bookings, currentUser])

    // Derived admin state based on logged in user role
    const isAdmin = currentUser?.role === 'admin'

    // Only count actually booked slots, not preview images
    const purchasedPlotIds = bookedSlots

    const sizeLabel = useMemo(() => {
        if (!selectedPlots.length) return "";
        const rows = selectedPlots.map((p) => Number(p.split("-")[0]));
        const cols = selectedPlots.map((p) => Number(p.split("-")[1]));
        const minR = Math.min(...rows);
        const maxR = Math.max(...rows);
        const minC = Math.min(...cols);
        const maxC = Math.max(...cols);
        const h = maxR - minR + 1;
        const w = maxC - minC + 1;
        return `${w} × ${h}`;
    }, [selectedPlots]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!bookingOpensAt) return

            const now = new Date()
            const diff = bookingOpensAt.getTime() - now.getTime()

            if (diff > 0) {
                setTimeRemaining({
                    hours: Math.floor(diff / (1000 * 60 * 60)),
                    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((diff % (1000 * 60)) / 1000)
                })
            } else {
                setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 })
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [bookingOpensAt])

    // Fetch Bookings & Realtime Subscription
    useEffect(() => {
        // 1. Fetch initial data
        const fetchData = async () => {
            // Bookings
            const { data: bookingsData } = await supabase.from('bookings').select('*')
            if (bookingsData) setBookings(bookingsData)

            // Settings
            const { data: settingsData } = await supabase.from('event_settings').select('*').single()
            if (settingsData?.booking_opens_at) {
                setBookingOpensAt(new Date(settingsData.booking_opens_at))
            }
            if (settingsData?.booking_closes_at) {
                setBookingClosesAt(new Date(settingsData.booking_closes_at))
            }
        }

        fetchData()

        // 2. Subscribe to bookings
        const bookingSub = supabase
            .channel('public:bookings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setBookings(prev => [...prev, payload.new])
                } else if (payload.eventType === 'DELETE') {
                    setBookings(prev => prev.filter(b => b.id !== payload.old.id))
                }
            })
            .subscribe()

        // 3. Subscribe to settings
        const settingsSub = supabase
            .channel('public:event_settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_settings' }, (payload) => {
                if (payload.new) {
                    if (payload.new.booking_opens_at) setBookingOpensAt(new Date(payload.new.booking_opens_at))
                    if (payload.new.booking_closes_at) setBookingClosesAt(new Date(payload.new.booking_closes_at))
                    else setBookingClosesAt(null) // Handle reopening if closes_at becomes null
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(bookingSub)
            supabase.removeChannel(settingsSub)
        }
    }, [])

    const handleLogin = (user: { email: string; venue: string; role: string }) => {
        setCurrentUser(user)
        setIsAuthenticated(true)
    }

    const handleLogout = () => {
        setCurrentUser(null)
        setIsAuthenticated(false)
        setSelectedPlots([])
    }

    const handleDeleteAd = async (adId: string) => {
        if (!isAdmin) return // Only admin can unbook

        // Find the ad to get its plot ID
        const ad = ads.find(a => a.id === adId)
        if (!ad) return

        if (window.confirm('Unbook this slot?')) {
            // Find bookings to delete
            for (const plotId of ad.plots) {
                // Find booking ID
                const booking = bookings.find(b => b.plot_id === plotId)
                if (booking) {
                    const { error } = await supabase
                        .from('bookings')
                        .delete()
                        .eq('id', booking.id)

                    if (error) {
                        alert('Error unbooking slot')
                        console.error(error)
                    } else {
                        console.log('Deleted booking for', plotId)
                        alert('Slot unbooked successfully!')
                    }
                }
            }
        }
    }

    const handleStartPurchase = async (plots: string[]) => {
        // Check if booking is open
        const now = new Date()

        // 1. Not started yet?
        if (bookingOpensAt && now < bookingOpensAt) {
            alert('Wait for the countdown to finish!')
            return
        }

        // 2. Closed?
        if (bookingClosesAt && now > bookingClosesAt) {
            alert('Booking is closed!')
            return
        }

        if (plots.length === 0) return
        if (plots.length > 1) {
            alert('Please select only one slot')
            return
        }

        // Check if slot is already booked
        if (purchasedPlotIds.has(plots[0])) {
            alert('This slot is already booked!')
            return
        }

        // User can only book 1 slot total, Admin can book unlimited
        if (!isAdmin && userBookedSlots.size >= 1) {
            alert('Users can only book 1 slot. Switch to Admin mode to book more slots.')
            return
        }

        // Simple confirmation - book the selected slot
        if (window.confirm('Book this slot?')) {
            if (!currentUser) return

            const plotId = plots[0]
            const selectedAd = ads.find(a => a.plots.includes(plotId))
            const songName = selectedAd?.message || 'Unknown Song'

            // Insert into Supabase
            const { error } = await supabase
                .from('bookings')
                .insert({
                    plot_id: plotId,
                    user_email: currentUser.email,
                    venue_name: currentUser.venue,
                    song_name: songName
                })

            if (error) {
                // Check for duplicate key error (Postgres 23505)
                if (error.code === '23505') {
                    alert('⚠️ Too slow! Someone else just booked this slot.\n\nThe content has been updated.')
                } else {
                    alert('Failed to book slot. Please try again.')
                    console.error(error)
                }
            } else {
                setSelectedPlots([])
                setBookedImage(selectedAd?.imageUrl || null)
                // alert('Slot booked successfully! 🎉') // Replaced by modal
            }
        }
    }

    // Show Auth Modal if not authenticated
    if (!isAuthenticated) {
        return <AuthModal onLogin={handleLogin} />
    }

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Compact Header */}
            <div className="relative z-10 px-6 py-3 bg-white shadow-sm border-b border-gray-200">
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                    <div className="text-gray-700 text-sm font-medium">
                        {isAdmin ? (
                            <span className="flex items-center gap-2">
                                <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold">ADMIN</span>
                                <span>{currentUser?.venue} ({currentUser?.email})</span>
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">USER</span>
                                <span>{currentUser?.venue}</span>
                                <span className="text-gray-400">•</span>
                                <span>{userBookedSlots.size}/1 Booked {userBookedSong && <span className="text-blue-600 font-bold">({userBookedSong})</span>}</span>
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3 items-center">
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            LOGOUT
                        </button>
                    </div>
                </div>
            </div>

            {/* Success Modal - Big Image */}
            {bookedImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative max-w-4xl max-h-[90vh] p-2 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl shadow-2xl scale-100 animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setBookedImage(null)}
                            className="absolute -top-4 -right-4 bg-white text-black w-10 h-10 rounded-full font-bold shadow-lg hover:scale-110 transition-transform z-10"
                        >
                            ✕
                        </button>
                        <img src={bookedImage} alt="Booked Song" className="w-full h-full object-contain rounded-lg border-4 border-black" />
                        <div className="absolute bottom-8 left-0 right-0 text-center">
                            <span className="bg-black/80 text-white px-6 py-3 rounded-full text-2xl font-bold tracking-widest border border-white/20 shadow-xl">
                                SLOT BOOKED!
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content - Grid Layout */}
            <div className="flex-1 w-full max-w-[1600px] mx-auto p-6 grid grid-cols-[1fr_320px] gap-8 overflow-auto">

                {/* Left Side: Billboard + Toolbar (Centered) */}
                <div className="flex flex-col items-center justify-center min-h-0">
                    {/* Toolbar - Above Billboard */}
                    <div className="mb-8 w-full max-w-[700px] flex justify-center z-30 relative">
                        <GridToolbar
                            selectionCount={selectedPlots.length}
                            sizeLabel={sizeLabel}
                            onClear={() => setSelectedPlots([])}
                            onPurchase={() => handleStartPurchase(selectedPlots)}
                        />
                    </div>

                    {/* Billboard Structure */}
                    <div className="relative flex flex-col items-center">
                        {/* The Board Frame */}
                        <div className="relative z-10 bg-gray-800 p-4 shadow-2xl rounded-sm flex flex-col gap-2">
                            {/* Inner Bezel with Grid */}
                            <div className="bg-gray-900 p-2 border-4 border-gray-700/50 shadow-inner">
                                <BillboardGrid
                                    ads={ads}
                                    selectedPlots={selectedPlots}
                                    setSelectedPlots={setSelectedPlots}
                                    purchasedPlotIds={purchasedPlotIds}
                                    isAdmin={isAdmin}
                                    onDeleteAd={handleDeleteAd}
                                    onStartPurchase={handleStartPurchase}
                                />
                            </div>

                            {/* Integrated Bottom Plaque */}
                            <div className="w-full py-2 bg-gray-800 flex items-center justify-center text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase border-t border-gray-700/50">
                                Pattu Bazaar • Est 2026
                            </div>
                        </div>
                    </div>
                </div>
                {/* Right Side: Statistics & Countdown (Fixed + Centered Vertically) */}
                <div className="flex flex-col justify-center gap-6 h-full">
                    {/* Countdown Card */}
                    <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-xl border border-white/50">
                        <h3 className="text-gray-500 text-xs font-bold tracking-wider mb-4 uppercase text-center">
                            {bookingClosesAt && new Date() > bookingClosesAt ? "Booking Closed" : (timeRemaining.seconds > 0 || timeRemaining.minutes > 0 || timeRemaining.hours > 0 ? "Event Starts In" : "Booking Open!")}
                        </h3>
                        {/* Admin Controls */}
                        {isAdmin && (
                            <div className="flex justify-center gap-2 mb-4">
                                <button
                                    onClick={async () => {
                                        const startAt = new Date(Date.now() + 15000)
                                        const { error } = await supabase
                                            .from('event_settings')
                                            .update({
                                                booking_opens_at: startAt.toISOString(),
                                                booking_closes_at: null
                                            })
                                            .eq('id', 1)

                                        if (error) {
                                            console.error(error)
                                            alert('Failed to start timer! Check Supabase table "event_settings"')
                                        } else {
                                            // Immediately update local state for instant feedback
                                            setBookingOpensAt(startAt)
                                            setBookingClosesAt(null)
                                        }
                                    }}
                                    className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 transition shadow-sm"
                                >
                                    START (15s)
                                </button>
                                <button
                                    onClick={async () => {
                                        const closeAt = new Date()
                                        const { error } = await supabase
                                            .from('event_settings')
                                            .update({ booking_closes_at: closeAt.toISOString() })
                                            .eq('id', 1)

                                        if (error) {
                                            console.error(error)
                                            alert('Failed to stop booking!')
                                        } else {
                                            // Immediately update local state
                                            setBookingClosesAt(closeAt)
                                        }
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition shadow-sm"
                                >
                                    STOP
                                </button>
                            </div>
                        )}
                        <div className="flex justify-between gap-2">
                            <div className="flex flex-col items-center">
                                <div className="text-3xl font-bold text-gray-800 font-mono bg-gray-100 rounded-lg p-2 min-w-[60px] text-center border border-gray-200">
                                    {String(timeRemaining.hours).padStart(2, '0')}
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold mt-1">HRS</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-300 self-start mt-2">:</div>
                            <div className="flex flex-col items-center">
                                <div className="text-3xl font-bold text-gray-800 font-mono bg-gray-100 rounded-lg p-2 min-w-[60px] text-center border border-gray-200">
                                    {String(timeRemaining.minutes).padStart(2, '0')}
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold mt-1">MIN</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-300 self-start mt-2">:</div>
                            <div className="flex flex-col items-center">
                                <div className="text-3xl font-bold text-gray-800 font-mono bg-gray-100 rounded-lg p-2 min-w-[60px] text-center border border-gray-200">
                                    {String(timeRemaining.seconds).padStart(2, '0')}
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold mt-1">SEC</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-xl border border-white/50 flex flex-col gap-4">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                            <span className="text-gray-500 text-xs font-bold uppercase">Booked Slots</span>
                            <span className="text-2xl font-bold text-rose-500">{bookedSlots.size}</span>
                        </div>

                        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                            <span className="text-gray-500 text-xs font-bold uppercase">Available</span>
                            <span className="text-2xl font-bold text-emerald-500">{100 - bookedSlots.size}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-xs font-bold uppercase">Selected</span>
                            <span className="text-2xl font-bold text-blue-500">{selectedPlots.length}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                                style={{ width: `${(bookedSlots.size / 100) * 100}%` }}
                            />
                        </div>
                        <div className="text-center text-[10px] text-gray-400 font-medium">
                            {Math.round((bookedSlots.size / 100) * 100)}% Capacity Reached
                        </div>
                    </div>
                </div>

            </div>
            {/* Tooltip Portal Root */}
            <div id="tooltip-root"></div>
        </div>
    )
}

export default App
