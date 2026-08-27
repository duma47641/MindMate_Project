import React, { useState, useEffect } from 'react';

const Login = () => {
    // 🟢 Welcome Auto Banner State (Shows for 3s on initial page load)
    const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);

    // Modal Controls
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null); // Article Reader Modal State

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');

    // Dynamic Mental Health Articles State (Fetched from Backend)
    const [articles, setArticles] = useState([]);
    const [articlesLoading, setArticlesLoading] = useState(true);
        // 🟢 Carousel State for Single Centered Card
    const [currentArticleIndex, setCurrentArticleIndex] = useState(0);

    // ⏱️ Auto Slide every 3 seconds
    useEffect(() => {
        if (articles.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentArticleIndex((prevIndex) => (prevIndex + 1) % articles.length);
        }, 3000);

        return () => clearInterval(interval);
    }, [articles]);

    // ◀️ Manual Previous Button Handler
    const handlePrevArticle = () => {
        setCurrentArticleIndex((prevIndex) => 
            prevIndex === 0 ? articles.length - 1 : prevIndex - 1
        );
    };

    // ▶️ Manual Next Button Handler
    const handleNextArticle = () => {
        setCurrentArticleIndex((prevIndex) => (prevIndex + 1) % articles.length);
    };

    // ⏱️ Auto-dismiss Welcome Banner after 3 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowWelcomeBanner(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    // 🔄 Backend API එකෙන් Articles Dynamic Load කරගැනීම
    useEffect(() => {
        const fetchArticles = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/articles');
                const data = await response.json();
                if (response.ok && Array.isArray(data) && data.length > 0) {
                    setArticles(data);
                } else {
                    setArticles([
                        {
                            _id: '1',
                            tag: "Stress & Coping",
                            title: "Navigating Chronic Workplace Stress: Cognitive Behavioral Strategies",
                            author: "Dr. Anura Senanayake, Consultant Psychiatrist",
                            readTime: "4 min read",
                            summary: "Understand how cognitive reframing and targeted micro-breaks significantly reduce cortisol levels in high-pressure environments.",
                            content: "Chronic stress alters neural pathways in the brain, keeping the amygdala in a persistent fight-or-flight state. By applying Cognitive Behavioral Therapy (CBT) techniques such as identifying automatic negative thoughts (ANTs) and deliberate deep diaphragmatic breathing, patients can deactivate hyperactive stress triggers and restore emotional equilibrium."
                        },
                        {
                            _id: '2',
                            tag: "Clinical Depression",
                            title: "Early Indicators of Clinical Depression vs. Situational Sadness",
                            author: "Dr. K. Jayawardena, Senior Clinical Psychologist",
                            readTime: "6 min read",
                            summary: "Differentiating between transient emotional dips and neurochemical imbalances requiring evidence-based psychiatric support.",
                            content: "While situational sadness is an adaptive response to grief or setbacks, clinical depressive episodes are marked by pervasive anhedonia (inability to feel pleasure), disrupted circadian rhythms, and persistent feelings of worthlessness lasting beyond two weeks. Clinical screening and timely psychological interventions are critical to preventing relapse."
                        },
                        {
                            _id: '3',
                            tag: "Mindfulness & Sleep",
                            title: "The Architecture of Rest: How Mindfulness Rewires Sleep Architecture",
                            author: "MindMate Clinical Research Unit",
                            readTime: "5 min read",
                            summary: "Examining the biological link between pre-sleep rumination and non-REM sleep cycles with actionable sleep hygiene tips.",
                            content: "Pre-sleep anxiety increases brain wave frequencies, blocking the onset of deep delta wave sleep. Structured mindfulness practices—such as body scan meditation and progressive muscle relaxation—help down-regulate sympathetic nervous system activity, facilitating rapid transition into restorative REM stages."
                        }
                    ]);
                }
            } catch (err) {
                console.error("Error fetching live articles:", err);
            } finally {
                setArticlesLoading(false);
            }
        };

        fetchArticles();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.role);
                localStorage.setItem('username', data.name);

                if (data.role === 'Admin') {
                    window.location.href = '/admin-dashboard';
                } else if (data.role === 'Doctor') {
                    window.location.href = '/doctor-dashboard';
                } else if (data.role === 'Staff') {
                    window.location.href = '/staff-dashboard';
                } else {
                    window.location.href = '/chat';
                }
            } else {
                setError(data.message || 'Invalid email or password');
            }
        } catch (err) {
            setError('Server connection error. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col relative">
            
            {/* 🟢 0. CENTERED WELCOME POPUP BANNER (Disappears after 3s) */}
            {showWelcomeBanner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none animate-in fade-in zoom-in duration-300">
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-teal-500/40 p-6 sm:p-8 rounded-3xl shadow-2xl text-center max-w-lg w-full pointer-events-auto relative transform transition-all">
                        
                        {/* Manual Close (X) button */}
                        <button 
                            onClick={() => setShowWelcomeBanner(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="w-14 h-14 bg-gradient-to-tr from-teal-500 to-cyan-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-teal-500/20 mb-4 animate-bounce">
                            <span className="text-2xl"></span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[11px] font-semibold mb-2">
                            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                            Healthcare AI Network
                        </div>

                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">MindMate</span>
                        </h2>
                        
                        <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">
                            Online Mental Health & Clinical Care Platform
                        </p>

                        {/* Progress Bar showing 3-second countdown indicator */}
                        <div className="w-full bg-slate-800 h-1 rounded-full mt-5 overflow-hidden">
                            <div className="bg-gradient-to-r from-teal-400 to-cyan-400 h-full w-full animate-[pulse_1.5s_ease-in-out_infinite]"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. TOP HEADER & HOTLINE BAR */}
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
                            <span className="hidden md:inline">Colombo • Kandy  Medical Centers</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="hover:text-teal-600 cursor-pointer"></span>
                            <span className="text-slate-300"></span>
                            <span className="hover:text-teal-600 cursor-pointer"> </span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center py-3.5">
                        <div className="flex items-center gap-3">
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

                        {/* Navigation Links */}
                        <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
                            <a href="#services" className="hover:text-teal-600 transition-colors">Clinical Services</a>
                            <a href="#articles" className="text-teal-700 font-bold border-b-2 border-teal-600 pb-0.5 hover:text-teal-800 transition-colors">Articles & Insights</a>
                            <a href="#about" className="hover:text-teal-600 transition-colors">  </a>
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="bg-[#0b132b] hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                            >
                                <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Singin
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. HERO SECTION */}
            <section className="relative bg-[#060d1f] py-20 lg:py-32 overflow-hidden">
                <div 
                    className="absolute inset-y-0 right-0 w-full lg:w-3/5 bg-no-repeat bg-cover bg-center opacity-85 transition-all duration-700 pointer-events-none"
                    style={{ 
                        backgroundImage: `url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80')` 
                    }}
                ></div>

                <div className="absolute inset-0 bg-gradient-to-r from-[#060d1f] via-[#060d1f]/90 lg:via-[#060d1f]/75 to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#060d1f] via-transparent to-transparent pointer-events-none"></div>
                <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl text-white space-y-6">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
                            Sri Lanka's Pioneer AI-Driven Mental Health Network
                        </div>
                        
                        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
                            ADVANCED CLINICAL PSYCHOLOGY & <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">EMOTIONAL CARE</span>
                        </h1>
                        
                        <p className="text-slate-200 text-base sm:text-lg leading-relaxed drop-shadow-md">
                            Seamlessly bridging automated AI self-reflection screening with certified clinical psychologists, 
                            counselors, and institutional hospital workflows.
                        </p>

                        <div className="pt-2 flex flex-wrap gap-4">
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold px-6 py-3 rounded-lg text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                            >
                                <span>Sign In to Healthcare Console</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                            <a 
                                href="#articles"
                                className="bg-slate-900/80 hover:bg-slate-800 text-teal-300 border border-slate-700 font-semibold px-6 py-3 rounded-lg text-sm transition-all flex items-center gap-2 backdrop-blur-sm"
                            >
                                Browse Mental Health Articles ↓
                            </a>
                        </div>

                        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800 max-w-xl">
                            <div>
                                <p className="text-3xl font-bold text-teal-400">24/7</p>
                                <p className="text-xs text-slate-300 mt-1">AI Screening</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-cyan-400">100%</p>
                                <p className="text-xs text-slate-300 mt-1">Confidential</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-emerald-400">Verified</p>
                                <p className="text-xs text-slate-300 mt-1">Practitioners</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. CENTERED LIGHT BLUE CAROUSEL ARTICLE SECTION */}
            <section id="articles" className="py-20 bg-white border-b border-slate-200 scroll-mt-14">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* Section Header */}
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <span className="text-xs font-bold uppercase tracking-widest text-sky-600 bg-sky-50 border border-sky-200 px-3.5 py-1 rounded-full">
                            Educational Resources & Publications
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
                            Mental Health Insights & Research
                        </h2>
                        <p className="text-slate-500 text-sm mt-2">
                            Curated psychiatric articles, therapeutic guides, and research-backed self-care strategies.
                        </p>
                    </div>

                    {articlesLoading ? (
                        <p className="text-xs text-slate-400 text-center py-12">Fetching latest clinical publications...</p>
                    ) : articles.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-12">No articles published yet.</p>
                    ) : (
                        <div className="max-w-xl mx-auto flex flex-col items-center">
                            
                            {/* 🌊 Centered Light Blue Gradient Card */}
                            <div 
                                key={articles[currentArticleIndex]?._id || currentArticleIndex}
                                className="w-full bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-3xl p-8 shadow-2xl text-white border border-white/20 relative min-h-[300px] flex flex-col justify-between transition-all duration-500 animate-in fade-in zoom-in-95"
                            >
                                <div>
                                    {/* Tag & Read Time */}
                                    <div className="flex items-center justify-between text-xs mb-4">
                                        <span className="font-bold text-sky-900 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
                                            {articles[currentArticleIndex]?.tag}
                                        </span>
                                        <span className="text-white/80 font-semibold bg-black/10 px-2.5 py-0.5 rounded-md">
                                            {articles[currentArticleIndex]?.readTime || '5 min read'}
                                        </span>
                                    </div>

                                    {/* Article Title */}
                                    <h3 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight mb-3">
                                        {articles[currentArticleIndex]?.title}
                                    </h3>

                                    {/* Summary */}
                                    <p className="text-xs sm:text-sm text-white/95 leading-relaxed">
                                        {articles[currentArticleIndex]?.summary}
                                    </p>
                                </div>

                                {/* Card Footer with Action */}
                                <div className="pt-6 mt-6 border-t border-white/20 flex items-center justify-between">
                                    <span className="text-xs text-white/90 font-medium truncate max-w-[200px]">
                                        {articles[currentArticleIndex]?.author}
                                    </span>
                                    <button 
                                        onClick={() => setSelectedArticle(articles[currentArticleIndex])}
                                        className="bg-white hover:bg-sky-50 text-sky-700 font-bold px-4 py-2 rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                        Read Article →
                                    </button>
                                </div>
                            </div>

                            {/* 🔘 Bottom Carousel Navigation Arrows & Indicators */}
                            <div className="flex items-center justify-between w-full mt-6 px-2">
                                
                                {/* Indicators (Dots) */}
                                <div className="flex items-center gap-1.5">
                                    {articles.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentArticleIndex(idx)}
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                idx === currentArticleIndex ? 'w-6 bg-sky-500' : 'w-2 bg-slate-300'
                                            }`}
                                        />
                                    ))}
                                </div>

                                {/* Arrow Buttons (Asiri Health Style) */}
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={handlePrevArticle}
                                        className="w-9 h-9 rounded-full bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-600 flex items-center justify-center transition-all shadow-sm border border-slate-200 cursor-pointer active:scale-95"
                                        title="Previous Article"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    
                                    <button 
                                        onClick={handleNextArticle}
                                        className="w-9 h-9 rounded-full bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-600 flex items-center justify-center transition-all shadow-sm border border-slate-200 cursor-pointer active:scale-95"
                                        title="Next Article"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>

                            </div>

                        </div>
                    )}

                </div>
            </section>

            {/* 4. VIBRANT LIGHT BLUE CLINICAL SERVICES GRID */}
            <section id="services" className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <h3 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-1.5">
                            Caring For Your Mental Wellbeing
                        </h3>
                        <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                            Convenient Digital Health Infrastructure
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* Card 1: AI Screening */}
                        <div className="bg-gradient-to-br from-cyan-500 to-teal-600 p-6 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-white/20">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white mb-4 text-xl border border-white/30 shadow-sm">
                                
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2 tracking-tight">
                                AI Mental Screening
                            </h4>
                            <p className="text-xs text-white/90 leading-relaxed">
                                Automated sentiment tracking and continuous algorithmic self-reflection logging.
                            </p>
                        </div>

                        {/* Card 2: Practitioner Channeling */}
                        <div className="bg-gradient-to-br from-sky-500 to-blue-600 p-6 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-white/20">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white mb-4 text-xl border border-white/30 shadow-sm">
                                
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2 tracking-tight">
                                Practitioner Channeling
                            </h4>
                            <p className="text-xs text-white/90 leading-relaxed">
                                Schedule consultations with licensed psychologists via interactive calendars.
                            </p>
                        </div>

                        {/* Card 3: Visual Mood Analytics */}
                        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-6 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-white/20">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white mb-4 text-xl border border-white/30 shadow-sm">
                                
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2 tracking-tight">
                                Visual Mood Analytics
                            </h4>
                            <p className="text-xs text-white/90 leading-relaxed">
                                Longitudinal charts mapping emotional patterns for targeted clinical decisions.
                            </p>
                        </div>

                        {/* Card 4: Live Consultation Chat */}
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-white/20">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white mb-4 text-xl border border-white/30 shadow-sm">
                                
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2 tracking-tight">
                                Live Consultation Chat
                            </h4>
                            <p className="text-xs text-white/90 leading-relaxed">
                                Low-latency secure real-time messaging with instant background notifications.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* 5. FOOTER */}
            <footer id="about" className="mt-auto bg-[#070d1e] text-slate-400 text-xs border-t border-slate-800 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-3 md:col-span-2">
                        <span className="text-lg font-bold text-white tracking-wide">MINDMATE HEALTHCARE NETWORK</span>
                        <p className="text-slate-400 max-w-md leading-relaxed">
                            Compliant with clinical research ethics protocols and safe practitioner-patient digital workflows.
                        </p>
                        <p className="text-teal-400 font-bold">24/7 Clinical Emergency Hotline: 1313</p>
                    </div>

                    <div>
                        <h5 className="text-white font-bold mb-3 uppercase tracking-wider">Clinical Centers</h5>
                        <ul className="space-y-2">
                            <li>MindMate Central: +94 11 452 4400</li>
                            <li>MindMate Kandy: +94 81 452 8800</li>
                            
                        </ul>
                    </div>

                    <div>
                        <h5 className="text-white font-bold mb-3 uppercase tracking-wider">Compliance & Legal</h5>
                        <ul className="space-y-2">
                            <li className="hover:text-white cursor-pointer">Research Ethics Agreement</li>
                            <li className="hover:text-white cursor-pointer">Patient Confidentiality Matrix</li>
                            <li className="hover:text-white cursor-pointer">Terms of Clinical Operations</li>
                        </ul>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-900 text-center text-slate-500">
                    © 2026 MindMate Healthcare Group PLC. All Rights Reserved.
                </div>
            </footer>

            {/* 6. ARTICLE FULL-READER MODAL */}
            {selectedArticle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        onClick={() => setSelectedArticle(null)}
                        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
                    ></div>
                    <div className="relative bg-white w-full max-w-2xl p-8 rounded-2xl shadow-2xl border border-slate-100 text-slate-900 z-10 max-h-[85vh] overflow-y-auto">
                        <button 
                            onClick={() => setSelectedArticle(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="flex items-center gap-2 text-xs text-teal-700 font-bold uppercase tracking-wider mb-2">
                            <span>{selectedArticle.tag}</span> • <span>{selectedArticle.readTime || '5 min read'}</span>
                        </div>
                        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">{selectedArticle.title}</h2>
                        <p className="text-xs text-slate-500 pb-4 border-b border-slate-100">{selectedArticle.author}</p>

                        <div className="mt-6 text-sm text-slate-700 leading-relaxed space-y-4">
                            <p>{selectedArticle.content}</p>
                            <div className="p-4 bg-teal-50 border-l-4 border-teal-500 rounded text-xs text-teal-900 font-medium">
                                💡 Clinical Note: If you or someone you know is experiencing persistent mental health challenges, please use our 24/7 AI screening bot or connect directly with our registered specialists via Portal Access.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 7. CLINICAL PORTAL SIGN IN MODAL POPUP */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        onClick={() => setIsModalOpen(false)}
                        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
                    ></div>

                    <div className="relative bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl border border-slate-100 text-slate-900 z-10 animate-in fade-in zoom-in duration-200">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight"> Sign In</h2>
                            <p className="text-xs text-slate-500 mt-1"> </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
                                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="name@example.com"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold py-3 px-4 rounded-lg text-sm transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>Sign In to Healthcare Console</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </form>

                        <p className="text-xs text-center text-slate-500 mt-6 pt-5 border-t border-slate-100">
                            Don't have an account?{' '}
                            <a href="/signup" className="text-teal-600 font-bold hover:underline">
                                Sign Up
                            </a>
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Login;