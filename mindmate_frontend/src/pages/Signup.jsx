import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 ඔටෝම පේජ් මාරු කරන්න මේක ගත්තා මචං

const Signup = () => {
    const navigate = useNavigate(); // 👈 useNavigate එක Initialize කිරීම
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Patient'
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (response.ok) {
                setMessage('Registration successful! Redirecting to login portal...');
                setFormData({ name: '', email: '', password: '', role: 'Patient' });

                // ⏱️ ⏱️ [AUTO REDIRECT LOGIC] - තත්පර 3කින් ඔටෝම ලොගින් පේජ් එකට හැරවීම:
                setTimeout(() => {
                    navigate('/login'); // 👈 ලොගින් පේජ් එකේ පාරට (Route) යැවීම
                }, 3000); 

            } else {
                setError(data.message || 'Registration failed');
            }
        } catch (err) {
            setError('Server connection error. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-between">
            
            {/* 1. TOP HEADER & HOTLINE BAR (MATCHING LOGIN THEME) */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <div className="flex justify-between items-center py-2 text-xs border-b border-slate-100 text-slate-500">
                        <div className="flex items-center gap-6">
                            <span className="flex items-center gap-1.5 font-semibold text-teal-700">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                24/7 Clinical Hotline: 1313
                            </span>
                            <span className="hidden md:inline">Colombo • Kandy • Galle Medical Centers</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="hover:text-teal-600 cursor-pointer">Online Reports</span>
                            <span className="text-slate-300">|</span>
                            <span className="hover:text-teal-600 cursor-pointer">Channeling Matrix</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center py-3.5">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/login')}>
                            <div className="bg-gradient-to-r from-teal-600 to-cyan-700 p-2 rounded-xl text-white shadow-md flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <div>
                                <span className="text-2xl font-black tracking-tight text-slate-900">MIND<span className="text-teal-600">MATE</span></span>
                                <span className="block text-[10px] tracking-widest text-slate-400 font-bold uppercase -mt-1">Clinical Healthcare Network</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => navigate('/login')}
                                className="bg-[#0b132b] hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                            >
                                <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                                Back to Sign In
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. SIGNUP HERO SECTION WITH CLINICAL BACKGROUND & THEMED CARD */}
            <main className="relative bg-[#060d1f] py-16 lg:py-24 overflow-hidden flex-1 flex items-center justify-center">
                
                {/* 🏥 Faded Hospital / Clinical Background Image */}
                <div 
                    className="absolute inset-y-0 right-0 w-full lg:w-3/5 bg-no-repeat bg-cover bg-center opacity-40 transition-all duration-700 pointer-events-none"
                    style={{ 
                        backgroundImage: `url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80')` 
                    }}
                ></div>

                {/* 🎨 Deep Blue / Teal Gradients */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#060d1f] via-[#060d1f]/95 lg:via-[#060d1f]/80 to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#060d1f] via-transparent to-transparent pointer-events-none"></div>
                <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative max-w-md w-full mx-4 z-10">
                    
                    {/* Themed White Glassmorphic Card (Matches Login Modal Theme) */}
                    <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-slate-100 text-slate-900 animate-in fade-in zoom-in duration-300">
                        
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-bold mb-2">
                                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
                                New Patient & Clinical Registration
                            </div>
                            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Join MindMate</h2>
                            <p className="text-xs text-slate-500 mt-1">Create your profile for personalized mental healthcare & AI screening</p>
                        </div>

                        {/* Error Alert Box */}
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
                                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Success Message Alert Box */}
                        {message && (
                            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-emerald-700 text-xs animate-pulse">
                                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{message}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    Full Username / Alias
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 transition-all"
                                    placeholder="e.g. Sahi Weerasingha"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    Account Password
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold py-3 px-4 rounded-lg text-sm transition-all shadow flex items-center justify-center gap-2 cursor-pointer shadow-teal-600/20"
                            >
                                <span>Create MindMate Account</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </form>

                        <p className="text-xs text-center text-slate-500 mt-6 pt-5 border-t border-slate-100">
                            Already have an account?{' '}
                            <a href="/login" className="text-teal-600 font-bold hover:underline">
                                Log In
                            </a>
                        </p>

                    </div>
                </div>
            </main>

            {/* 3. CORPORATE FOOTER */}
            <footer className="bg-[#070d1e] text-slate-400 text-xs border-t border-slate-800 py-6 text-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <span>© 2026 MindMate Healthcare Group PLC. All Rights Reserved.</span>
                    <span className="text-teal-400 font-semibold">24/7 Clinical Emergency Hotline: 1313</span>
                </div>
            </footer>

        </div>
    );
};

export default Signup;