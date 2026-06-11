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
                setMessage('Registration successful! ...');
                setFormData({ name: '', email: '', password: '', role: 'Patient' });

                // ⏱️ ⏱️ [AUTO REDIRECT LOGIC] - තත්පර 2.5කින් ඔටෝම ලොගින් පේජ් එකට හැරවීම:
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
        <div className="min-h-screen bg-[#0b132b] flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-[#1c2541] rounded-2xl p-8 shadow-2xl border border-[#3a506b]/30">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-[#5bc0be]">Join MindMate</h2>
                    <p className="text-gray-400 mt-2">Create your account for personalized mental support</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 bg-[#0b132b] border border-[#3a506b] rounded-lg text-white focus:outline-none focus:border-[#5bc0be] transition-colors"
                            placeholder="Enter your username"
                        />
                    </div>

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

                    {error && <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}
                    {message && <div className="text-emerald-400 text-sm bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">{message}</div>}

                    <button
                        type="submit"
                        className="w-full py-3 bg-[#5bc0be] text-[#0b132b] font-bold rounded-lg hover:bg-[#46a1a0] transition-colors shadow-lg"
                    >
                        Sign Up
                    </button>
                </form>

                <p className="text-sm text-center text-gray-400 mt-6">
                    Already have an account? <a href="/login" className="text-[#5bc0be] hover:underline">Log In</a>
                </p>
            </div>
        </div>
    );
};

export default Signup;