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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome</h2>
                    <p className="text-gray-500">Please select your venue and login</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-6">
                    {/* Venue Selection */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                            Select Venue
                        </label>
                        <select
                            value={selectedVenue}
                            onChange={(e) => setSelectedVenue(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-700"
                            required
                        >
                            <option value="" disabled>-- Choose your venue --</option>
                            {AUTHORIZED_USERS.map((user) => (
                                <option key={user.venue} value={user.venue}>
                                    {user.venue}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Email Input */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                            Email Access Code
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your authorized email"
                            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-700"
                            required
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100 text-center animate-pulse">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 mt-2"
                    >
                        ENTER EVENT
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-400">
                    Restricted Access
                </div>
            </div>
        </div>
    );
};
