import React, { useState } from 'react';

// Hardcoded authorized users
// In a real app, this would be in a database
export const AUTHORIZED_USERS = [
    { venue: "ADMIN", email: "admin@pattubazaar.com", role: "admin" },
    { venue: "Entrance Hall", email: "entrance@pattubazaar.com", role: "user" },
    { venue: "Food Court", email: "food@pattubazaar.com", role: "user" },
    { venue: "VIP Lounge", email: "vip@pattubazaar.com", role: "user" },
    { venue: "Parking Zone", email: "parking@pattubazaar.com", role: "user" }
];

interface AuthModalProps {
    onLogin: (user: { email: string; venue: string; role: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
    const [selectedVenue, setSelectedVenue] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // validation
        const user = AUTHORIZED_USERS.find(
            u => u.venue === selectedVenue && u.email.toLowerCase() === email.toLowerCase().trim()
        );

        if (user) {
            onLogin(user);
        } else {
            setError('Invalid venue or email combination. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#4169E1] backdrop-blur-md">
            <div className="bg-white/90 backdrop-blur-sm p-8 w-full max-w-md relative overflow-hidden rounded-xl shadow-2xl border border-white/40 transform -rotate-1 hover:rotate-0 transition-transform duration-300">

                <div className="text-center mb-8">
                    <h2 className="text-4xl font-black text-gray-900 mb-2 font-display uppercase tracking-wider">Welcome</h2>
                    <p className="text-gray-500 font-medium tracking-wide">Pattu Bazaar Event Access</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-6">
                    {/* Venue Selection */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-gray-500 uppercase tracking-widest font-display">
                            Select Venue
                        </label>
                        <select
                            value={selectedVenue}
                            onChange={(e) => setSelectedVenue(e.target.value)}
                            className="w-full p-3 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-pink-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                            required
                        >
                            <option value="" disabled className="text-gray-400">-- Choose your venue --</option>
                            {AUTHORIZED_USERS.map((user) => (
                                <option key={user.venue} value={user.venue} className="text-gray-900">
                                    {user.venue}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Email Input */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-gray-500 uppercase tracking-widest font-display">
                            Email Access Code
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your authorized email"
                            className="w-full p-3 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:border-pink-500 transition-all font-medium text-gray-900 placeholder-gray-400"
                            required
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg border border-red-200 text-center animate-pulse">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full btn-primary text-base py-4 mt-2 shadow-lg"
                    >
                        ENTER EVENT
                    </button>
                </form>

                <div className="mt-6 text-center text-[10px] text-gray-400 uppercase tracking-[0.2em] font-display">
                    Restricted Access • Pattu Bazaar 2026
                </div>
            </div>
        </div>
    );
};
