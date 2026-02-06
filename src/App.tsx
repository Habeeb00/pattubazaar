
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
    const [isBookingLive, setIsBookingLive] = useState(false)
    const [totalSeconds, setTotalSeconds] = useState(0)

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
            const isLive = diff <= 0 && (!bookingClosesAt || now < bookingClosesAt)

            setIsBookingLive(isLive)

            if (diff > 0) {
                const totalSec = Math.floor(diff / 1000)
                setTotalSeconds(totalSec)

                // Tick Tock Effect for last 3 seconds
                if (totalSec <= 3 && totalSec > 0) {
                    // Create a brief beep using AudioContext or Audio element if possible, or just rely on visual pulse
                    // Since we can't easily add assets, we'll use a simple visual cue state implicitly by using totalSec
                    // But user asked for "tick tick timer". Visual pulse is good.
                    // Trying a simple beep using data URI
                    try {
                        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const oscillator = audioCtx.createOscillator();
                        const gainNode = audioCtx.createGain();
                        oscillator.connect(gainNode);
                        gainNode.connect(audioCtx.destination);
                        oscillator.type = 'sine';
                        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
                        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                        oscillator.start();
                        oscillator.stop(audioCtx.currentTime + 0.1);
                    } catch (e) {
                        // Ignore audio errors
                    }
                }

                setTimeRemaining({
                    hours: Math.floor(diff / (1000 * 60 * 60)),
                    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((diff % (1000 * 60)) / 1000)
                })
            } else {
                setTotalSeconds(0)
                setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 })
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [bookingOpensAt, bookingClosesAt])

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
                console.log('Booking update:', payload)
                const newRecord = payload.new as any
                const oldRecord = payload.old as any

                if (payload.eventType === 'INSERT') {
                    setBookings(prev => [...prev, newRecord])
                } else if (payload.eventType === 'DELETE') {
                    setBookings(prev => prev.filter(b => b.id !== oldRecord.id))
                }
            })
            .subscribe()

        // 3. Subscribe to settings
        const settingsSub = supabase
            .channel('public:event_settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_settings' }, (payload) => {
                const newData = payload.new as any
                if (newData) {
                    if (newData.booking_opens_at) setBookingOpensAt(new Date(newData.booking_opens_at))
                    if (newData.booking_closes_at) setBookingClosesAt(new Date(newData.booking_closes_at))
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
            <div className="relative z-10 px-3 sm:px-6 py-2 sm:py-3 bg-white shadow-sm border-b border-gray-200">
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                    <div className="text-gray-700 text-xs sm:text-sm font-medium">
                        {isAdmin ? (
                            <span className="flex items-center gap-1 sm:gap-2">
                                <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold">ADMIN</span>
                                <span className="hidden sm:inline">{currentUser?.venue} ({currentUser?.email})</span>
                                <span className="sm:hidden">{currentUser?.venue}</span>
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">USER</span>
                                <span className="hidden sm:inline">{currentUser?.venue}</span>
                                <span className="text-gray-400 hidden sm:inline">•</span>
                                <span className="text-xs">{userBookedSlots.size}/1 {userBookedSong && <span className="text-blue-600 font-bold">({userBookedSong})</span>}</span>
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 sm:gap-3 items-center">
                        <button
                            onClick={handleLogout}
                            className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gray-700 hover:bg-gray-800 rounded-lg transition-colors"
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

            {/* Main Content - Centered Layout for both Mobile & Desktop */}
            <div className="flex-1 w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col lg:flex-row items-center lg:items-center gap-4 md:gap-6 lg:gap-12 overflow-y-auto lg:overflow-hidden justify-center h-full min-h-0">

                {/* DESKTOP ONLY: Left Side (Countdown) */}
                <div className="hidden lg:flex flex-col gap-6 w-80 items-center justify-center order-1">
                    <div className="w-full bg-white rounded-xl shadow-xl p-6 border-4 border-gray-100 transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                        <div className="text-center mb-4 border-b-2 border-gray-100 pb-2">
                            <span className="text-xl font-bold text-gray-800 tracking-tight uppercase">Booking Starts In</span>
                        </div>

                        <div className="flex justify-center gap-2 mb-4">
                            {isBookingLive ? (
                                <div className="flex flex-col items-center animate-pulse">
                                    <span className="text-4xl font-black text-emerald-600 tracking-wider">LIVE</span>
                                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Booking Open</span>
                                </div>
                            ) : (
                                <div className={`flex flex-col items-center bg-gray-50 rounded-lg p-4 border border-gray-200 min-w-[120px] transition-all duration-200 ${totalSeconds <= 3 && totalSeconds > 0 ? 'scale-110 bg-red-50 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : ''}`}>
                                    <span className={`text-5xl font-mono font-bold leading-none ${totalSeconds <= 3 && totalSeconds > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {totalSeconds}
                                    </span>
                                    <span className={`text-xs font-bold mt-1 tracking-widest ${totalSeconds <= 3 && totalSeconds > 0 ? 'text-red-500' : 'text-gray-500'}`}>SECONDS</span>
                                </div>
                            )}
                        </div>

                        {/* Admin Controls */}
                        {isAdmin && (
                            <div className="flex justify-center gap-2 mt-2 pt-2 border-t border-gray-100">
                                <button
                                    onClick={async () => {
                                        const startAt = new Date(Date.now() + 15000)
                                        const { error } = await supabase.from('event_settings').update({ booking_opens_at: startAt.toISOString(), booking_closes_at: null }).eq('id', 1)
                                        if (!error) { setBookingOpensAt(startAt); setBookingClosesAt(null) }
                                    }}
                                    className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700"
                                >
                                    START (15s)
                                </button>
                                <button
                                    onClick={async () => {
                                        const closeAt = new Date()
                                        const { error } = await supabase.from('event_settings').update({ booking_closes_at: closeAt.toISOString() }).eq('id', 1)
                                        if (!error) { setBookingClosesAt(closeAt) }
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700"
                                >
                                    STOP
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* CENTER: Billboard & Mobile Layout */}
                <div className="flex flex-col items-center order-2 w-full lg:w-auto">

                    {/* MOBILE ONLY: Top Countdown */}
                    <div className="lg:hidden w-full max-w-[600px] mb-2 px-2">
                        <div className="bg-white rounded-xl shadow-lg p-2 sm:p-4 flex items-center justify-between border-b-4 border-gray-200">
                            <span className="text-sm sm:text-xl font-bold text-gray-800 tracking-tight">booking starts in</span>
                            {/* Admin Controls embedded here for desktop/mobile accessibility if needed, or specific admin panel logic could go here */}
                            {isAdmin && (
                                <div className="hidden sm:flex gap-2">
                                    <button
                                        onClick={async () => {
                                            const startAt = new Date(Date.now() + 15000)
                                            const { error } = await supabase.from('event_settings').update({ booking_opens_at: startAt.toISOString(), booking_closes_at: null }).eq('id', 1)
                                            if (!error) { setBookingOpensAt(startAt); setBookingClosesAt(null) }
                                        }}
                                        className="px-2 py-1 bg-green-600 text-white text-[10px] sm:text-xs font-bold rounded"
                                    >
                                        START (15s)
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const closeAt = new Date()
                                            const { error } = await supabase.from('event_settings').update({ booking_closes_at: closeAt.toISOString() }).eq('id', 1)
                                            if (!error) { setBookingClosesAt(closeAt) }
                                        }}
                                        className="px-2 py-1 bg-red-600 text-white text-[10px] sm:text-xs font-bold rounded"
                                    >
                                        STOP
                                    </button>
                                </div>
                            )}
                            <div className="flex flex-col items-center bg-gray-100 rounded-lg p-1 px-2 sm:p-2 border border-gray-200">
                                {isBookingLive ? (
                                    <span className="text-lg sm:text-2xl font-black text-emerald-600 leading-none tracking-wider animate-pulse">LIVE</span>
                                ) : (
                                    <>
                                        <span className={`text-lg sm:text-2xl font-mono font-bold leading-none ${totalSeconds <= 3 && totalSeconds > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                            {totalSeconds}
                                        </span>
                                        <span className={`text-[9px] sm:text-[10px] font-bold mt-0.5 sm:mt-1 ${totalSeconds <= 3 && totalSeconds > 0 ? 'text-red-500' : 'text-gray-500'}`}>SEC</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Toolbar - Above Billboard */}
                    {selectedPlots.length > 0 && (
                        <div className="lg:hidden mb-2 sm:mb-6 md:mb-8 w-full max-w-[700px] flex justify-center z-30 relative px-3 sm:px-0">
                            <GridToolbar
                                selectionCount={selectedPlots.length}
                                sizeLabel={sizeLabel}
                                onClear={() => setSelectedPlots([])}
                                onPurchase={() => handleStartPurchase(selectedPlots)}
                                disabled={!isBookingLive}
                            />
                        </div>
                    )}

                    {/* Billboard Structure */}
                    <div className="relative flex flex-col items-center z-20 pt-10">
                        {/* The Board Frame */}
                        <div className="relative z-20 bg-gray-800 p-2 sm:p-4 shadow-2xl rounded-sm flex flex-col gap-2 scale-90 sm:scale-100 origin-top lg:scale-100 transition-transform duration-300">
                            {/* Inner Bezel with Grid */}
                            <div className="bg-gray-900 p-2 border-4 border-gray-700/50 shadow-inner">
                                <BillboardGrid
                                    ads={ads}
                                    selectedPlots={selectedPlots}
                                    setSelectedPlots={setSelectedPlots}
                                    purchasedPlotIds={purchasedPlotIds}
                                    isAdmin={isAdmin}
                                    onDeleteAd={handleDeleteAd}
                                />
                            </div>

                            {/* Integrated Bottom Plaque */}
                            <div className="w-full py-2 bg-gray-800 flex items-center justify-center text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase border-t border-gray-700/50">
                                Pattu Bazaar
                            </div>
                        </div>

                        {/* DESKTOP ONLY: Stand/Pole */}
                        <div className="hidden lg:block w-40 h-[200px] mt-[-2px] bg-gradient-to-r from-gray-700 to-gray-600 border-x-4 border-gray-800 shadow-2xl z-10"></div>
                    </div>

                    {/* MOBILE ONLY: Pole & Split Stats */}
                    <div className="lg:hidden relative w-full flex justify-center mt-[-30px] sm:mt-[-2px] pb-8 overflow-visible z-10 transition-all">
                        {/* The Pole */}
                        <div className="absolute top-0 w-24 sm:w-32 h-[300px] bg-gradient-to-r from-gray-300 to-gray-400 border-x-2 border-gray-400/50 z-0"></div>

                        {/* Stats Container */}
                        <div className="relative z-10 flex w-full max-w-[500px] justify-between px-4 mt-8 gap-2">

                            {/* Left: Capacity */}
                            <div className="bg-gray-200/90 backdrop-blur-sm p-2 sm:p-4 rounded-lg shadow-xl border-2 border-white/50 w-28 sm:w-32 flex flex-col items-center justify-center text-center gap-1 transform rotate-[-2deg]">
                                <span className="text-emerald-500 font-bold text-lg sm:text-2xl drop-shadow-sm">
                                    {Math.round((bookedSlots.size / 100) * 100)}%
                                </span>
                                <span className="text-[9px] sm:text-[10px] font-bold text-gray-600 uppercase leading-tight bg-white/50 px-2 py-1 rounded">
                                    Capacity<br />Reached
                                </span>
                            </div>

                            {/* Right: Booked/Available */}
                            <div className="bg-gray-200/90 backdrop-blur-sm p-2 sm:p-4 rounded-lg shadow-xl border-2 border-white/50 w-28 sm:w-32 flex flex-col items-center justify-center text-center gap-2 transform rotate-[2deg]">
                                <div className="flex flex-col">
                                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-600 uppercase">Booked</span>
                                    <span className="text-rose-500 font-bold text-sm sm:text-lg">{bookedSlots.size}</span>
                                </div>
                                <div className="w-full h-px bg-gray-300"></div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-600 uppercase">Available</span>
                                    <span className="text-emerald-500 font-bold text-sm sm:text-lg">{100 - bookedSlots.size}</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* DESKTOP ONLY: Right Side (Stats) */}
                <div className="hidden lg:flex flex-col gap-6 w-80 items-center justify-center order-3">
                    {/* Capacity */}
                    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-xl shadow-xl border-4 border-gray-100 w-full flex flex-col items-center justify-center text-center gap-2 transform rotate-1 hover:rotate-0 transition-transform duration-300">
                        <span className="text-emerald-500 font-bold text-5xl drop-shadow-sm">
                            {Math.round((bookedSlots.size / 100) * 100)}%
                        </span>
                        <span className="text-sm font-bold text-gray-500 uppercase leading-tight bg-gray-50 px-3 py-1 rounded">
                            Capacity Reached
                        </span>
                        <div className="mt-2 w-full h-3 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                                style={{ width: `${(bookedSlots.size / 100) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Booked/Available */}
                    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-xl shadow-xl border-4 border-gray-100 w-full flex flex-col items-center justify-center text-center gap-4 transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                        <div className="flex justify-between w-full items-center">
                            <span className="text-sm font-bold text-gray-500 uppercase">Booked Slots</span>
                            <span className="text-rose-500 font-bold text-2xl">{bookedSlots.size}</span>
                        </div>
                        <div className="w-full h-px bg-gray-200"></div>
                        <div className="flex justify-between w-full items-center">
                            <span className="text-sm font-bold text-gray-500 uppercase">Available</span>
                            <span className="text-emerald-500 font-bold text-2xl">{100 - bookedSlots.size}</span>
                        </div>
                        <div className="w-full h-px bg-gray-200"></div>
                        <div className="flex justify-between w-full items-center">
                            <span className="text-sm font-bold text-gray-500 uppercase">Selected</span>
                            <div className="flex flex-col items-end">
                                <span className="text-blue-500 font-bold text-2xl">{selectedPlots.length}</span>
                                {sizeLabel && <span className="text-[10px] text-gray-400 font-medium">{sizeLabel}</span>}
                            </div>
                        </div>

                        {selectedPlots.length > 0 && (
                            <>
                                <div className="w-full h-px bg-gray-200"></div>
                                <div className="flex gap-2 w-full pt-2">
                                    <button
                                        onClick={() => setSelectedPlots([])}
                                        className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded hover:bg-gray-200 transition-colors uppercase"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={() => handleStartPurchase(selectedPlots)}
                                        disabled={!isBookingLive}
                                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase shadow-lg shadow-blue-200 disabled:shadow-none"
                                    >
                                        Book
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

            </div>
            {/* Tooltip Portal Root */}
            <div id="tooltip-root"></div>
        </div>
    )
}

export default App
