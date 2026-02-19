import React, { useState } from "react";
import bannerImg from "../assets/banner.png";

// Hardcoded authorized users
// In a real app, this would be in a database
export const AUTHORIZED_USERS = [
  { venue: "ADMIN", email: "admin@thh.com", role: "admin" },
  {
    venue: "Adi Shankara Institute of Engineering and Technology",
    email: "ankitasyam2005@gmail.com",
    role: "user",
  },
  {
    venue: "Asian School of Business, Trivandrum",
    email: "madhava@asbindia.org.in",
    role: "user",
  },
  {
    venue: "Bharata Mata College Autonomous,Thrikkakara",
    email: "nahnamusthafa@gmail.com",
    role: "user",
  },
  {
    venue: "College Of Engineering Attingal",
    email: "kvsudha38@gmail.com",
    role: "user",
  },
  {
    venue: "College of Engineering Kallooppara",
    email: "work.godlykm@gmail.com",
    role: "user",
  },
  {
    venue: "College of Engineering Karunagappally",
    email: "babhijith58@gmail.com",
    role: "user",
  },
  {
    venue: "College of engineering Munnar",
    email: "fathimasharaajmi@gmail.com",
    role: "user",
  },
  {
    venue: "College of engineering trikaripur",
    email: "Unnikrishnannamboodirien@gmail.com",
    role: "user",
  },
  {
    venue: "Government Engineering college Idukki",
    email: "parvathyprasad001@gmail.com",
    role: "user",
  },
  {
    venue: "ICCS College of engineering and management",
    email: "nppavithra798@gmail.com",
    role: "user",
  },
  {
    venue: "IEDC-College of Engineering Pathanapuram",
    email: "sreeshps@gmail.com",
    role: "user",
  },
  {
    venue: "Lourdes Matha College of Science and technology",
    email: "akshay.krishna@lmcst.ac.in",
    role: "user",
  },
  {
    venue: "Mar Baselios College of Engineering and Technology(Autonomous)",
    email: "iedcmbcet@mbcet.ac.in",
    role: "user",
  },
  {
    venue: "Muthoot Institute of Technology and Science",
    email: "binetasaju@gmail.com",
    role: "user",
  },
  {
    venue: "Sahrdaya College of Engineering and Technology",
    email: "jual224750@sahrdaya.ac.in",
    role: "user",
  },
  {
    venue: "School of engineering, CUSAT",
    email: "devikasubhashclg@gmail.com",
    role: "user",
  },
  {
    venue: "SNM Institute of Management and Technology",
    email: "febajosy681@gmail.com",
    role: "user",
  },
  {
    venue: "Sree Buddha College of Engineering, Pattoor",
    email: "kunjipramod2020@gmail.com",
    role: "user",
  },
  {
    venue: "St.Joseph's College (Autonomous),Devagiri ",
    email: "aldonathomas0@gmail.com",
    role: "user",
  },
  {
    venue: "Toc H Institute of Science and Technology",
    email: "fathimasherinfaisal.mc@gmail.com",
    role: "user",
  },
  {
    venue: "Viswajyothi college of engineering and technology",
    email: "prk18042005@gmail.com",
    role: "user",
  },
];

interface AuthModalProps {
  onLogin: (user: { email: string; venue: string; role: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
  const [selectedVenue, setSelectedVenue] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // validation
    const user = AUTHORIZED_USERS.find(
      (u) =>
        u.venue === selectedVenue &&
        u.email.toLowerCase() === email.toLowerCase().trim(),
    );

    if (user) {
      onLogin(user);
    } else {
      setError("Invalid venue or email combination. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#4169E1] backdrop-blur-md">
      <div className="bg-white/90 backdrop-blur-sm p-8 w-full max-w-md relative overflow-hidden rounded-xl shadow-2xl border border-white/40 transform -rotate-1 hover:rotate-0 transition-transform duration-300">
        <div className="flex justify-center mb-8">
          <img
            src={bannerImg}
            alt="Venue Theme Song"
            className="w-48 h-auto object-contain drop-shadow-md"
          />
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
              <option value="" disabled className="text-gray-400">
                -- Choose your venue --
              </option>
              {AUTHORIZED_USERS.map((user) => (
                <option
                  key={user.venue}
                  value={user.venue}
                  className="text-gray-900"
                >
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
          Restricted Access • Venue Theme Song
        </div>
      </div>
    </div>
  );
};
