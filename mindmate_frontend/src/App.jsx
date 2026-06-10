import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

document.title = "MindMate | AI Mental Health Support";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 🔑 ඊයේ අපි Thunder Client එකෙන් ගත්ත ලොග් වෙච්ච යූසර්ගේ Token එක මෙතනට දාන්න මචං!
  // (Frontend එකේ Login පේජ් එක හදනකම් අපි මේක Hardcode කරලා ටෙස්ට් කරමු)
  const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMjgwYjExZGM2ZTAzM2MwMDIxYjAxMCIsInJvbGUiOiJQYXRpZW50IiwiaWF0IjoxNzgxMDA5MjM2LCJleHAiOjE3ODM2MDEyMzZ9.KnQbJn0YHk1Soa7MQzyEuXM8MXFXRnBnQ6sYwU4adeA"; 

  const messagesEndRef = useRef(null);

  // 🔄 චැට් එක පහළටම ස්ක්‍රෝල් කරන ෆන්ක්ෂන් එක
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 📂 පියවර 1: ඩේටාබේස් එකේ තියෙන පැරණි චැට් හිස්ට්‍රි එක ලෝඩ් කිරීම
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
        const { data } = await axios.get('http://localhost:5000/api/chat/history', config);
        
        // ඩේටාබේස් එකෙන් එන මැසේජ් ටික UI එකට ගැලපෙන විදිහට Map කරගැනීම
        const formattedMessages = data.map(chat => ({
          text: chat.message,
          sender: chat.sender === 'User' ? 'user' : 'ai',
          sentiment: chat.sentiment,
          score: chat.confidenceScore
        }));
        setMessages(formattedMessages);
      } catch (error) {
        console.error("Error fetching chat history:", error.message);
      }
    };

    if (TOKEN !== "YOUR_JWT_TOKEN_HERE") {
      fetchChatHistory();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✉️ පියවර 2: AI එකට මැසේජ් එකක් යැවීම
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // 1. යූසර් ලියපු මැසේජ් එක සැනින් ස්ක්‍රීන් එකට දානවා
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);

    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      
      // 2. Node.js Backend එකට මැසේජ් එක යැවීම
      const { data } = await axios.post('http://localhost:5000/api/chat/message', { message: userMessage }, config);

      // 3. AI එකෙන් ආපු පිළිතුරයි, Sentiment විස්තරයි UI එකට එකතු කිරීම
      setMessages(prev => [...prev, { 
        text: data.bot_reply, 
        sender: 'ai',
        sentiment: data.sentiment,
        score: data.confidence_score
      }]);

    } catch (error) {
      console.error("Chat Error:", error.message);
      setMessages(prev => [...prev, { text: "⚠️ AI Service is offline or Server Error. Please try again.", sender: 'ai' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      {/* 🌐 Top Navbar */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-teal-500/20">
            🧠
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-teal-400">MindMate AI</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Secure Clinical Assistant
            </p>
          </div>
        </div>
      </header>

      {/* 💬 Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-24 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <h2 className="text-2xl font-bold text-slate-300 mb-2">Welcome to MindMate</h2>
            <p className="text-slate-500 max-w-md">I am here to listen and support you in a safe, judgment-free space. How are you feeling today?</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl p-4 shadow-md transition-all duration-200 ${
              msg.sender === 'user' 
                ? 'bg-teal-600 text-slate-50 rounded-br-none' 
                : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
            }`}>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              
              {/* 📊 AI Sentiment Analytics Badge */}
              {msg.sender === 'ai' && msg.sentiment && (
                <div className="mt-3 pt-2 border-t border-slate-800 flex flex-wrap gap-2 items-center text-xs text-slate-400">
                  <span className={`px-2 py-0.5 rounded-md font-semibold ${
                    msg.sentiment === 'Normal' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    msg.sentiment === 'Anxiety' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    msg.sentiment === 'Depression' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    Detected Sentiment: {msg.sentiment}
                  </span>
                  {msg.score > 0 && (
                    <span className="text-[11px] text-slate-500">
                      Confidence: {(msg.score * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-none p-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ⌨️ Input Area */}
      <footer className="p-4 bg-slate-900/40 border-t border-slate-900 md:px-24">
        <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share what's on your mind..."
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-teal-500 text-slate-100 disabled:opacity-50 placeholder-slate-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-6 rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-teal-500 flex items-center justify-center"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}

export default App;