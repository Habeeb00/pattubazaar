
import { useState, useEffect, useMemo } from 'react'
import bannerImg from './assets/banner.png'
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
    // Auth State
    const [currentUser, setCurrentUser] = useState<{ email: string; venue: string; role: string } | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isBookingLive, setIsBookingLive] = useState(false)
    const [totalSeconds, setTotalSeconds] = useState(0)

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
            } else {
                setTotalSeconds(0)
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
            }
        }
    }

    // Show Auth Modal if not authenticated
    if (!isAuthenticated) {
        return <AuthModal onLogin={handleLogin} />
    }

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col relative">
            {/* Background Clouds Animation */}
            <div className="absolute top-20 left-10 w-32 h-32 cloud z-0"></div>
            <div className="absolute top-40 right-20 w-48 h-48 cloud z-0" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-20 left-1/3 w-40 h-40 cloud z-0" style={{ animationDelay: '4s' }}></div>

            {/* Banner Image - Top Left Corner */}
            <div className="absolute top-0 left-0 z-50 p-4">
                <img src={bannerImg} alt="Venue Theme Song" className="w-32 sm:w-48 h-auto object-contain drop-shadow-lg transform -rotate-2 hover:rotate-0 transition-transform duration-300" />
            </div>

            {/* Compact Header */}
            <div className="relative z-10 px-3 sm:px-6 py-2 sm:py-3 border-b border-white/10 bg-white/5 backdrop-blur-sm pl-28 sm:pl-36">
                <div className="flex justify-between items-center max-w-7xl mx-auto">
                    <div className="text-white text-xs sm:text-sm font-medium font-display tracking-widest">
                        {isAdmin ? (
                            <span className="flex items-center gap-1 sm:gap-2">
                                <span className="bg-pink-600 text-white px-2 py-1 rounded text-xs font-bold">ADMIN</span>
                                <span className="hidden sm:inline opacity-80">{currentUser?.venue} ({currentUser?.email})</span>
                                <span className="sm:hidden">{currentUser?.venue}</span>
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                <span className="bg-blue-500/20 border border-blue-400/50 text-blue-100 px-2 py-1 rounded text-xs font-bold">USER</span>
                                <span className="hidden sm:inline font-bold">{currentUser?.venue}</span>
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 sm:gap-3 items-center">
                        <button
                            onClick={handleLogout}
                            className="px-4 py-1 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-colors font-display tracking-wider"
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
                <div className="hidden lg:flex flex-col gap-6 w-80 items-center justify-center order-1 z-10">
                    <div className="w-full bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-xl transform hover:scale-[1.02] transition-transform duration-300 border border-white/40">
                        {/* Booking Countdown Content matching Capacity Card style */}
                        <div className="flex flex-col items-center justify-center gap-2">
                            {isBookingLive ? (
                                <>
                                    <span className="text-red-600 font-display font-black text-7xl drop-shadow-sm animate-pulse">
                                        LIVE
                                    </span>
                                    <span className="text-xs font-bold text-gray-500 uppercase leading-tight tracking-widest px-3 py-1">
                                        Booking Open
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className={`font-display font-black text-7xl drop-shadow-sm ${totalSeconds <= 3 && totalSeconds > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                        {totalSeconds}
                                    </span>
                                    <span className={`text-xs font-bold uppercase leading-tight tracking-widest px-3 py-1 ${totalSeconds <= 3 && totalSeconds > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                        Booking Starts In
                                    </span>
                                </>
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
                    <div className="lg:hidden w-full max-w-[600px] mb-2 px-2 z-30">
                        <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-xl border border-white/40 flex flex-col items-center justify-center gap-2">
                            {/* Admin Controls */}
                            {isAdmin && (
                                <div className="flex gap-2 mb-2">
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

                            <div className="flex flex-col items-center">
                                {isBookingLive ? (
                                    <>
                                        <span className="text-4xl sm:text-5xl font-black text-red-600 leading-none tracking-wider animate-pulse font-display drop-shadow-sm">LIVE</span>
                                        <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase leading-tight tracking-widest px-2 py-1 mt-1">Booking Open</span>
                                    </>
                                ) : (
                                    <>
                                        <span className={`text-4xl sm:text-5xl font-display font-black leading-none drop-shadow-sm ${totalSeconds <= 3 && totalSeconds > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                            {totalSeconds}
                                        </span>
                                        <span className={`text-[10px] sm:text-xs font-bold uppercase leading-tight tracking-widest px-2 py-1 mt-1 ${totalSeconds <= 3 && totalSeconds > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                            Booking Starts In
                                        </span>
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
                        <div className="relative z-20 billboard-frame p-6 shadow-2xl flex flex-col gap-2 scale-90 sm:scale-100 origin-top lg:scale-100 transition-transform duration-300">
                            {/* Inner Bezel with Grid */}
                            <div className="billboard-grid p-2 shadow-inner">
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
                            <div className="w-full py-2 flex items-center justify-center text-[10px] text-[#FF007F] font-black tracking-[0.3em] uppercase border-t border-white/5 font-display drop-shadow-[0_0_5px_rgba(255,0,127,0.8)]">
                                Venue Theme Song
                            </div>
                        </div>

                        {/* DESKTOP ONLY: Stand/Pole - Updated to black */}
                        <div className="hidden lg:block w-32 h-[200px] -mt-6 bg-black border-x-4 border-black z-10 shadow-2xl"></div>
                    </div>

                    {/* MOBILE ONLY: Pole & Split Stats */}
                    <div className="lg:hidden relative w-full flex justify-center -mt-12 sm:-mt-8 pb-8 overflow-visible z-10 transition-all">
                        {/* The Pole - Black Style */}
                        <div className="absolute top-0 w-24 sm:w-32 h-[300px] bg-black border-x-4 border-black z-0 shadow-2xl"></div>

                        {/* Stats Container - Replaced with Glass cards */}
                        <div className="relative z-10 flex w-full max-w-[500px] justify-between px-4 mt-8 gap-2">

                            {/* Left: Capacity */}
                            <div className="bg-white/90 backdrop-blur-sm p-4 w-32 sm:w-36 flex flex-col items-center justify-center text-center gap-1 transform rotate-[-2deg] rounded-xl shadow-xl border border-white/40">
                                <span className="text-gray-900 font-black font-display text-2xl sm:text-3xl drop-shadow-sm">
                                    {Math.round((bookedSlots.size / 100) * 100)}%
                                </span>
                                <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase leading-tight px-2 py-1 rounded">
                                    Capacity<br />Reached
                                </span>
                            </div>

                            {/* Right: Booked/Available */}
                            <div className="bg-white/90 backdrop-blur-sm p-4 w-32 sm:w-36 flex flex-col items-center justify-center text-center gap-2 transform rotate-[2deg] rounded-xl shadow-xl border border-white/40">
                                <div className="flex flex-col">
                                    <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Booked</span>
                                    <span className="text-pink-500 font-bold text-lg sm:text-xl font-display">{bookedSlots.size}</span>
                                </div>
                                <div className="w-full h-px bg-gray-200"></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase">Available</span>
                                    <span className="text-emerald-400 font-bold text-lg sm:text-xl font-display">{100 - bookedSlots.size}</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* DESKTOP ONLY: Right Side (Stats) */}
                <div className="hidden lg:flex flex-col gap-6 w-80 items-center justify-center order-3 z-10">
                    {/* Capacity */}
                    <div className="bg-white/90 backdrop-blur-sm p-6 w-full flex flex-col items-center justify-center text-center gap-2 transform rotate-1 hover:rotate-0 transition-transform duration-300 rounded-xl shadow-xl border border-white/40">
                        <span className="text-gray-900 font-display font-black text-7xl drop-shadow-sm">
                            {Math.round((bookedSlots.size / 100) * 100)}%
                        </span>
                        <span className="text-xs font-bold text-gray-500 uppercase leading-tight tracking-widest px-3 py-1">
                            Capacity Reached
                        </span>
                        <div className="mt-4 w-full h-3 bg-black/20 rounded-full overflow-hidden border border-white/10">
                            <div
                                className="h-full bg-[#FF007F] shadow-[0_0_10px_rgba(255,0,127,0.5)] transition-all duration-500"
                                style={{ width: `${(bookedSlots.size / 100) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Booked/Available */}
                    <div className="bg-white/90 backdrop-blur-sm p-6 w-full flex flex-col items-center justify-center text-center gap-4 transform -rotate-1 hover:rotate-0 transition-transform duration-300 rounded-xl shadow-xl border border-white/40">
                        <div className="flex justify-between w-full items-center">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Booked Slots</span>
                            <span className="text-pink-500 font-bold text-3xl font-display">{bookedSlots.size}</span>
                        </div>
                        <div className="w-full h-px bg-gray-200"></div>
                        <div className="flex justify-between w-full items-center">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Available</span>
                            <span className="text-emerald-400 font-bold text-3xl font-display">{100 - bookedSlots.size}</span>
                        </div>
                        <div className="w-full h-px bg-gray-200"></div>
                        <div className="flex justify-between w-full items-center">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Selected</span>
                            <div className="flex flex-col items-end">
                                <span className="text-gray-900 font-bold text-2xl font-display">{selectedPlots.length}</span>
                                {sizeLabel && <span className="text-[10px] text-gray-400 font-medium font-mono">{sizeLabel}</span>}
                            </div>
                        </div>

                        {selectedPlots.length > 0 && (
                            <>
                                <div className="w-full h-px bg-white/10"></div>
                                <div className="flex gap-2 w-full pt-2">
                                    <button
                                        onClick={() => setSelectedPlots([])}
                                        className="flex-1 px-3 py-2 bg-white/10 text-white text-xs font-bold rounded-full hover:bg-white/20 transition-colors uppercase border border-white/20"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={() => handleStartPurchase(selectedPlots)}
                                        disabled={!isBookingLive}
                                        className="flex-1 btn-primary text-xs"
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
            <Analytics />
        </div>
    )
}

export default App
