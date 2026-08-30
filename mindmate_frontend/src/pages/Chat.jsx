import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

function Chat() {
  const [activeMenu, setActiveMenu] = useState('chat'); 
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [patientInfo, setPatientInfo] = useState({ name: 'Loading...', email: '' });

  // Clinic States
  const [doctors, setDoctors] = useState([]);
  const [docLoading, setDocLoading] = useState(true);
  const [myAppointments, setMyAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [bookingDate, setBookingDate] = useState(null);
  const [bookingSlot, setBookingSlot] = useState('');
  const [bookingSubmitLoading, setBookingSubmitLoading] = useState(false);

  const [showPayModal, setShowPayModal] = useState(false);
  const [activeAppForPay, setActiveAppForPay] = useState(null);
  const [cardForm, setCardForm] = useState({ cardNumber: '', expiry: '', cvv: '' });
  const [payLoading, setPayLoading] = useState(false);
  
  // Password States
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [passLoading, setPassLoading] = useState(false);

  // 🔔 Notification States
  const [activeNotification, setActiveNotification] = useState(null); 
  const lastCheckedMessagesCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);

  const TOKEN = localStorage.getItem('token'); 
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  const fetchMyAppointments = async () => {
    if (!TOKEN) return;
    setAppointmentsLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const { data } = await axios.get('http://localhost:5000/api/appointments/my', config);
      setMyAppointments(data);
    } catch (error) { console.error("Error fetching appointments:", error.message); }
    finally { setAppointmentsLoading(false); }
  };

  //  Background Listener for Doctor Messages
  useEffect(() => {
    if (!TOKEN) return;

    const checkIncomingDoctorMessages = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
        const { data } = await axios.get('http://localhost:5000/api/messages/history/all', config).catch(async () => {
          if (doctors.length > 0) {
            const firstDocId = doctors[0].userId || doctors[0]._id;
            return await axios.get(`http://localhost:5000/api/messages/history/${firstDocId}`, config);
          }
          return { data: [] };
        });

        if (Array.isArray(data) && data.length > 0) {
          const doctorMessages = data.filter(m => m.senderId !== (patientInfo.id || 'user'));
          
          if (doctorMessages.length > lastCheckedMessagesCountRef.current) {
            const latestMsg = doctorMessages[doctorMessages.length - 1];
            
            if (activeMenu !== 'doctor_chat' && !isFirstLoadRef.current) {
              setActiveNotification({
                senderName: latestMsg.senderName || "Your Assigned Doctor",
                text: latestMsg.messageText || latestMsg.message || "Sent you a message...",
                timestamp: new Date(latestMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });

              setTimeout(() => { setActiveNotification(null); }, 6000);
            }
          }
          lastCheckedMessagesCountRef.current = doctorMessages.length;
        }
        isFirstLoadRef.current = false;
      } catch (err) {
        console.log("Background notification sync silent log.");
      }
    };

    const pollTimer = setInterval(checkIncomingDoctorMessages, 4000);
    return () => clearInterval(pollTimer);
  }, [TOKEN, activeMenu, doctors, patientInfo]);

  useEffect(() => {
    if (!TOKEN) { window.location.href = '/login'; return; }

    try {
      const base64Url = TOKEN.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      const core = payload.user || payload.patient || payload;
      const dynamicName = core.name || core.username || core.fullName || core.email?.split('@')[0] || "MindMate User";
      const dynamicEmail = core.email || core.userEmail || "user@mindmate.com";

      setPatientInfo({
        id: core.id || core._id,
        name: dynamicName,
        email: dynamicEmail
      });
    } catch (error) {
      console.error("Token decode error:", error.message);
    }

    const fetchChatHistory = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
        const { data } = await axios.get('http://localhost:5000/api/chat/history', config);
        const formattedMessages = data.map(chat => ({ 
          text: chat.message, 
          sender: chat.sender === 'User' ? 'user' : 'ai',
          sentiment: chat.sentiment || chat.detectedMood || null 
        }));
        setMessages(formattedMessages);
      } catch (error) { console.error("Error history:", error.message); }
    };

    const fetchAvailableDoctors = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
        const { data } = await axios.get('http://localhost:5000/api/users/doctors', config);
        setDoctors(data);
      } catch (error) { console.error("Error doctors:", error.message); }
      finally { setDocLoading(false); }
    };

    fetchChatHistory(); fetchAvailableDoctors(); fetchMyAppointments();
  }, [TOKEN]);

  useEffect(() => { if (activeMenu === 'my_appointments') fetchMyAppointments(); }, [activeMenu]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault(); if (!input.trim() || loading) return;
    const userMessage = input.trim(); setInput(''); setLoading(true);
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const { data } = await axios.post('http://localhost:5000/api/chat/message', { message: userMessage }, config);
      setMessages(prev => [...prev, { 
        text: data.bot_reply, 
        sender: 'ai',
        sentiment: data.sentiment || data.detectedMood || data.mood || "Normal / Stable"
      }]);
    } catch (error) { setMessages(prev => [...prev, { text: "AI Service Offline.", sender: 'ai' }]); }
    finally { setLoading(false); }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault(); if (!bookingDate || !bookingSlot) return;
    setBookingSubmitLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const formattedDate = bookingDate.toISOString().split('T')[0];
      await axios.post('http://localhost:5000/api/appointments', { 
        doctorId: selectedDoc.userId || selectedDoc._id, 
        date: formattedDate, 
        timeSlot: bookingSlot,
        patientId: patientInfo.id
      }, config);

      alert(`Appointment booked successfully!`);
      setShowModal(false); setBookingDate(null); setBookingSlot('');
      fetchMyAppointments(); setActiveMenu('my_appointments');
    } catch (error) { alert("Booking Error"); }
    finally { setBookingSubmitLoading(false); }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault(); setPassLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.put(`http://localhost:5000/api/appointments/${activeAppForPay._id}/pay`, cardForm, config);
      alert("💳 Payment Authorized Successfully!!");
      setShowPayModal(false); setCardForm({ cardNumber: '', expiry: '', cvv: '' });
      await fetchMyAppointments();
    } catch (error) { alert("Payment Failed"); }
    finally { setPassLoading(false); }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault(); setPassLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.put('http://localhost:5000/api/users/update-password', passwordForm, config);
      alert("Password Updated Successfully!");
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (error) { alert(error.response?.data?.message || "Password Update Failed"); }
    finally { setPassLoading(false); }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden relative">
      
      {/*  LIVE NOTIFICATION POPUP */}
      {activeNotification && (
        <div className="fixed top-5 right-5 z-50 bg-white/95 border border-blue-200 backdrop-blur-md text-slate-800 px-5 py-4 rounded-2xl shadow-xl flex items-start gap-4 max-w-sm animate-slideIn">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-black text-sm flex items-center justify-center shadow-xs">💬</div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <h4 className="text-xs font-bold text-blue-700 truncate">{activeNotification.senderName}</h4>
              <span className="text-[9px] text-slate-400 font-mono">{activeNotification.timestamp}</span>
            </div>
            <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-snug">"{activeNotification.text}"</p>
            <button onClick={() => { setActiveMenu('doctor_chat'); setActiveNotification(null); }} className="mt-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline tracking-wider uppercase block">Open Messaging Desk </button>
          </div>
          <button onClick={() => setActiveNotification(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
        </div>
      )}

      {/*  LEFT SIDEBAR (PRESERVED STRUCTURE WITH ELEVATED HOVER STATES) */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shadow-[2px_0_12px_rgba(0,0,0,0.02)] h-full flex-shrink-0">
        <div>
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-blue-500/25 ring-4 ring-blue-50"></div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900">MindMate</h2>
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Patient Portal</p>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            {[
              { id: 'chat', label: 'Chat with AI Bot', icon: '' },
              { id: 'doctor_chat', label: 'Live Chat with Doctor', icon: '' },
              { id: 'booking', label: 'Book Consultant', icon: '' },
              { id: 'my_appointments', label: 'My Appointments', icon: '' },
              { id: 'settings', label: 'Account Settings', icon: '' }
            ].map(tab => {
              const isActive = activeMenu === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMenu(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-xs transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20 translate-x-1'
                      : 'text-slate-600 hover:bg-blue-50/60 hover:text-blue-700 hover:translate-x-1'
                  }`}
                >
                  <span className={`text-sm transition-transform duration-200 group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200/80 flex items-center justify-center text-sm font-bold text-blue-700 shadow-inner">{patientInfo.name.charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{patientInfo.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{patientInfo.email}</p>
            </div>
          </div>
          <button onClick={() => setShowLogoutModal(true)} className="w-full py-2.5 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-200/60 hover:border-transparent font-bold rounded-xl text-[11px] transition-all duration-200 shadow-xs active:scale-[0.98]">
            Logout Session
          </button>
        </div>
      </aside>

      {/*  MAIN VIEW CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] min-w-0">
        
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-4.5 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-xs z-10">
          <div>
            <h1 className="text-base font-extrabold text-slate-800 tracking-tight">
              {activeMenu === 'chat' ? 'MindMate AI Clinical Assistant' : activeMenu === 'doctor_chat' ? 'Doctor Messaging Desk' : activeMenu === 'booking' ? 'Booking Counsaltants' : activeMenu === 'my_appointments' ? 'My Appointments' : 'Security Settings'}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Privacy-First & Encrypted Mental Health Portal</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-blue-50/80 border border-blue-200/70 text-blue-700 text-xs font-bold rounded-full flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              Offline AI Engine Ready
            </span>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 1. AI CHAT TAB  */}
        {activeMenu === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-b from-slate-50/50 to-white">
            <div className="flex-1 overflow-y-auto px-4 py-8 md:px-16 lg:px-28 space-y-6">
              {messages.length === 0 && (
                <div className="text-center p-8 mt-12 max-w-md mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 shadow-inner">🌿</div>
                  <h3 className="text-sm font-extrabold text-slate-800">MindMate Safe Space</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    This workspace is confidential and processed entirely offline. Share whatever is on your mind.
                  </p>
                </div>
              )}

              {messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={index} className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-blue-500/20 mb-1 flex-shrink-0">
                        🤖
                      </div>
                    )}
                    <div className={`max-w-[75%] rounded-3xl p-5 shadow-xs transition-all duration-200 hover:shadow-md ${
                      isUser 
                        ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-blue-600/10' 
                        : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs'
                    }`}>
                      {!isUser && (
                        <div className="flex items-center gap-2 mb-2 pb-2.5 border-b border-slate-100">
                          <span className={`text-[11px] font-bold px-3 py-0.5 rounded-full border shadow-2xs ${
                            msg.sentiment?.includes('Crisis') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            msg.sentiment?.includes('Depression') ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            msg.sentiment?.includes('Anxiety') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            Detected Mood: {msg.sentiment || "Normal / Stable"}
                          </span>
                        </div>
                      )}
                      <p className={`text-[13.5px] leading-relaxed whitespace-pre-wrap ${isUser ? 'text-blue-50' : 'text-slate-700'}`}>{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <footer className="p-5 bg-white border-t border-slate-200/80 md:px-16 lg:px-28">
              <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto items-center">
                <input 
                  type="text" 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="Type a message or share your feelings..." 
                  className="flex-1 bg-slate-50/80 border border-slate-200/90 rounded-2xl px-5 py-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner" 
                />
                <button 
                  type="submit" 
                  disabled={loading || !input.trim()} 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white font-bold px-7 py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-all duration-200 shadow-md shadow-blue-600/20 active:scale-95 flex items-center gap-2 flex-shrink-0"
                >
                  {loading ? 'Thinking...' : 'Send'} 
                </button>
              </form>
            </footer>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. DOCTOR LIVE CHAT TAB */}
        {activeMenu === 'doctor_chat' && (
          (() => {
            const myBookedDoctors = myAppointments
              .filter(app => app.status === 'Approved' || app.status === 'Paid')
              .map(app => {
                const docObj = app.doctorId || app.doctorDetails || {};
                return {
                  _id: docObj._id || app.doctorId,
                  userId: docObj.userId || docObj._id || app.doctorId,
                  name: docObj.name || app.doctorDetails?.name || "Consultant Doctor",
                  email: docObj.email || app.doctorDetails?.email || "doctor@mindmate.com"
                };
              })
              .filter((doc, index, self) => index === self.findIndex((d) => d._id === doc._id));  
            
            return (
              <ClinicalChatSection 
                coreDoctors={myBookedDoctors} 
                patientInfo={patientInfo} 
                TOKEN={TOKEN} 
              />
            );
          })()
        )}

        {/* ========================================================================= */}
        {/* 3. BOOKING TAB  */}

        {activeMenu === 'booking' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <h2 className="text-lg font-black text-slate-800">Verified Clinical Practitioners</h2>
                <p className="text-xs text-slate-500 mt-0.5"></p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map((doc) => (
                  <div key={doc._id} className="bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 transition-all duration-200 group">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                            {doc.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">{doc.name}</h3>
                            <p className="text-[11px] text-blue-600 font-semibold">{doc.specialization}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between my-3 px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[11px] font-medium text-slate-500">Session Fee</span>
                        <span className="text-xs font-black text-slate-800">Rs. {doc.fee}</span>
                      </div>

                      {doc.bio && (
                        <p className="text-xs text-slate-500 bg-slate-50/50 p-3.5 rounded-2xl italic leading-relaxed border border-slate-100/60">
                          "{doc.bio}"
                        </p>
                      )}
                    </div>

                    <button 
                      onClick={() => { setSelectedDoc(doc); setShowModal(true); }} 
                      className="w-full mt-5 py-3 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-200 shadow-xs hover:shadow-md hover:shadow-blue-600/20 active:scale-98"
                    >
                      Book Appointment →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. MY APPOINTMENTS TAB */}

        {activeMenu === 'my_appointments' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="mb-6">
                <h2 className="text-lg font-black text-slate-800">Consultation List</h2>
                <p className="text-xs text-slate-500 mt-0.5"></p>
              </div>

              {appointmentsLoading ? (
                <p className="text-xs text-slate-400 text-center py-12">Loading scheduled consultations...</p>
              ) : myAppointments.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
                  <div className="text-2xl mb-2"></div>
                  <p className="text-xs font-bold text-slate-700">No scheduled consultations found</p>
                  <p className="text-[11px] text-slate-400 mt-1">Book an appointment with a registered practitioner to start.</p>
                </div>
              ) : (
                myAppointments.map((app) => (
                  <div key={app._id} className="bg-white border border-slate-200/80 rounded-3xl p-5.5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-xs hover:shadow-md hover:border-blue-200 transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
                        
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">{app.doctorDetails?.name || app.doctorId?.name || 'Clinical Practitioner'}</h3>
                        <p className="text-xs text-blue-600 font-semibold">{app.doctorDetails?.specialization || 'Mental Health Specialist'}</p>
                        
                        <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs">
                          <span className="px-2.5 py-1 bg-slate-50 rounded-lg text-slate-600 border border-slate-100"> {app.date}</span>
                          <span className="px-2.5 py-1 bg-slate-50 rounded-lg text-slate-600 border border-slate-100"> {app.timeSlot}</span>
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-100"> Rs. {app.doctorDetails?.fee || app.doctorId?.fee || "2500"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-end">
                      <span className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border shadow-2xs ${
                        app.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        app.status === 'Approved' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 
                        app.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        ● {app.status}
                      </span>
                      {app.status === 'Approved' && (
                        <button onClick={() => { setActiveAppForPay(app); setShowPayModal(true); }} className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95">
                          Proceed to Pay 💳
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. SETTINGS TAB */}

        {activeMenu === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
            <div className="bg-white border border-slate-200/80 w-full max-w-md rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-extrabold text-slate-800">Security Credentials</h2>
                <p className="text-xs text-slate-500 mt-0.5"></p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Current Password</label>
                  <input type="password" required placeholder="••••••••" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-slate-800 transition-all shadow-inner" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">New Password</label>
                  <input type="password" required placeholder="Minimum 6 characters" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-slate-800 transition-all shadow-inner" />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={passLoading} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-md shadow-blue-600/20 active:scale-98">
                    {passLoading ? "Updating Security..." : "Save New Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Booking Confirmation Modal */}
      {showModal && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <h2 className="text-sm font-extrabold text-slate-800">Confirm Booking with {selectedDoc.name}</h2>
            <div className="relative z-50">
              <DatePicker selected={bookingDate} onChange={(date) => setBookingDate(date)} dateFormat="yyyy-MM-dd" minDate={new Date()} placeholderText="Click to select date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800" />
            </div>
            <select required value={bookingSlot} onChange={(e) => setBookingSlot(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800">
              <option value="">-- Choose session time --</option>
              {selectedDoc.slots ? selectedDoc.slots.split(',').map((slot, idx) => ( <option key={idx} value={slot.trim()}>{slot.trim()}</option> )) : <option value="Session 1">Session 1</option>}
            </select>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">Cancel</button>
              <button onClick={handleBookingSubmit} disabled={bookingSubmitLoading} className="w-1/2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 transition-all">{bookingSubmitLoading ? "Processing..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Modal */}
      {showPayModal && activeAppForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">MindMate Secure Gateway</h2>
                <p className="text-[10px] text-slate-500">256-Bit SSL Encrypted Channel</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex justify-between items-center">
                <span className="text-xs text-slate-600">Consultation Charge:</span>
                <span className="text-base font-black text-blue-700">Rs. {activeAppForPay?.doctorDetails?.fee || "2500"}.00</span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Card Number</label>
                <input type="text" required placeholder="4111 2222 3333 4444" value={cardForm.cardNumber} onChange={(e) => setCardForm({...cardForm, cardNumber: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Expiration</label>
                  <input type="text" required placeholder="MM/YY" value={cardForm.expiry} onChange={(e) => setCardForm({...cardForm, expiry: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-center text-slate-800" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">CVV</label>
                  <input type="password" required maxLength="3" placeholder="•••" value={cardForm.cvv} onChange={(e) => setCardForm({...cardForm, cvv: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-center text-slate-800" />
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowPayModal(false)} className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">Cancel</button>
                <button type="submit" className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all"> Pay</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-500 text-xl shadow-inner">🚪</div>
              <div><h3 className="text-sm font-extrabold text-slate-800">Confirm Logout</h3><p className="text-xs text-slate-500">End your current session on MindMate?</p></div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowLogoutModal(false)} className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">Cancel</button>
              <button type="button" onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition-all">Logout</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// =========================================================================
// CLINICAL MESSAGING PORTAL 
function ClinicalChatSection({ coreDoctors, patientInfo, TOKEN }) {
  const [activeChannel, setActiveChannel] = useState(null);
  const [chatLog, setChatLog] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const chatBottomRef = useRef(null);

  const fetchActiveChatLog = async () => {
    if (!TOKEN || !activeChannel) return;
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const targetId = activeChannel.userId || activeChannel._id;
      const { data } = await axios.get(`http://localhost:5000/api/messages/history/${targetId}`, config);
      setChatLog(data);
    } catch (err) { console.error("Error shifting chat data files:", err.message); }
  };

  useEffect(() => {
    fetchActiveChatLog();
    const ticker = setInterval(fetchActiveChatLog, 3000);
    return () => clearInterval(ticker);
  }, [activeChannel]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatLog]);

  const fireMessage = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || !activeChannel) return;
    const bodyStr = textInput.trim();
    setTextInput('');

    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const destinationId = activeChannel.userId || activeChannel._id;
      
      const { data } = await axios.post('http://localhost:5000/api/messages/send', {
        receiverId: destinationId,
        message: bodyStr
      }, config);

      setChatLog(prev => [...prev, data.newMessage || data]);
    } catch (err) { console.error("Dispatch failure:", err.message); }
  };

  const filteredDoctors = coreDoctors.filter(d => d.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex-1 flex min-h-0 bg-white border border-slate-200/80 m-6 rounded-3xl overflow-hidden shadow-xs">
      <div className="w-80 bg-slate-50/50 border-r border-slate-200/80 flex flex-col">
        <div className="p-4 border-b border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Approved Doctors</span>
          <input type="text" placeholder="Search doctor name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-all shadow-2xs" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredDoctors.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-10 italic">No approved doctor consultations found.</p>
          ) : (
            filteredDoctors.map((doc, idx) => {
              const isSelected = activeChannel && (activeChannel._id === doc._id);
              return (
                <button key={idx} onClick={() => setActiveChannel(doc)} className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${isSelected ? 'bg-blue-50/80 border border-blue-200/80 shadow-xs' : 'hover:bg-slate-100/70 border border-transparent'}`}>
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-inner">{doc.name?.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{doc.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{doc.email}</p>
                  </div>
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase">Doc</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#F8FAFC]">
        {activeChannel ? (
          <>
            <div className="px-6 py-4 border-b border-slate-200/80 bg-white flex justify-between items-center shadow-xs">
              <div>
                <h3 className="text-xs font-extrabold text-slate-800">{activeChannel.name}</h3>
                <p className="text-[10px] text-slate-400">{activeChannel.email}</p>
              </div>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70 px-3 py-0.5 rounded-full">● Live Sync</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatLog.map((msg, i) => {
                const isMe = msg.senderId === patientInfo.id || msg.senderId === 'user';
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                    <div className={`max-w-[70%] px-4.5 py-3.5 rounded-2xl shadow-xs ${isMe ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'}`}>
                      <p className="text-xs leading-relaxed">{msg.message || msg.messageText}</p>
                      <span className={`text-[8px] block text-right mt-1 font-mono ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={fireMessage} className="p-4 border-t border-slate-200/80 bg-white flex gap-3 items-center">
              <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder={`Write secure message to ${activeChannel.name}...`} className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner" />
              <button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95">Send </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-xs font-medium">Select an approved doctor from the list to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;