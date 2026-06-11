import React, { useState } from 'react';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // 🟢 යූසර් ආයෙමත් කොටුවක් ඇතුළේ ටයිප් කරන්න පටන් ගත්ත ගමන් රතු පාට පරණ Error එක ඔටෝම මැකී යයි!
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // 💡 බැක්එන්ඩ් එකේ Login API එකට කෝල් කිරීම
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (response.ok) {
                // 🔐 Token එක සහ Role එක බ්‍රවුසර් එකේ සේဝ် කරගැනීම
                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.role);
                localStorage.setItem('username', data.name); // 👈 බැක්එන්ඩ් එකෙන් එන නම (data.name) මෙතනට ලින්ක් කළා මචං

                // 🔀 Role එක අනුව අදාළ පේජ් එකට රීඩිරෙක්ට් කිරීම
                if (data.role === 'Admin') {
                    window.location.href = '/admin-dashboard';
                } else if (data.role === 'Doctor') {
                    window.location.href = '/doctor-dashboard';
                } else if (data.role === 'Staff') {
                    window.location.href = '/staff-dashboard';
                } else {
                    window.location.href = '/chat'; // Patient නම් කෙලින්ම AI චැට් එකට
                }
            } else {
                setError(data.message || 'Invalid email or password');
            }
        } catch (err) {
            setError('Server connection error. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-[#0b132b] flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-[#1c2541] rounded-2xl p-8 shadow-2xl border border-[#3a506b]/30">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-[#5bc0be]">Welcome Back</h2>
                    <p className="text-gray-400 mt-2">Log in to your Secure MindMate Account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 bg-[#0b132b] border border-[#3a506b] rounded-lg text-white focus:outline-none focus:border-[#5bc0be] transition-colors"
                            placeholder="name@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 bg-[#0b132b] border border-[#3a506b] rounded-lg text-white focus:outline-none focus:border-[#5bc0be] transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    {/* ❌ Error එකක් තිබ්බොත් විතරක් රතු පාටින් පේන කොටස */}
                    {error && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}

                    <button
                        type="submit"
                        className="w-full py-3 bg-[#5bc0be] text-[#0b132b] font-bold rounded-lg hover:bg-[#46a1a0] transition-colors shadow-lg"
                    >
                        Log In
                    </button>
                </form>

                <p className="text-sm text-center text-gray-400 mt-6">
                    Don't have an account? <a href="/signup" className="text-[#5bc0be] hover:underline">Sign Up</a>
                </p>
            </div>
        </div>
    );
};

export default Login;