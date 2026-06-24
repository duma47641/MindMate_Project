import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

function Chat() {
  const [activeMenu, setActiveMenu] = useState('chat'); // 'chat', 'doctor_chat', 'booking', 'my_appointments', 'settings'
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

  // 🔔 [Notification States]: ලයිව් පොපැප් එක ට්‍රැක් කරන ස්ටේට්ස් බං
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

  // 🔔 [Global Background Listener]: පේෂන්ට් වෙන කොහේ හිටියත් දොස්තරගෙන් එන මැසේජ් අල්ලන සුපිරි ලෝජික් එක බං
  useEffect(() => {
    if (!TOKEN) return;

    const checkIncomingDoctorMessages = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
        // බැක්එන්ඩ් එකෙන් පේෂන්ට්ට ආපු හැම මැසේජ් එකක්ම ගන්නවා බං
        const { data } = await axios.get('http://localhost:5000/api/messages/history/all', config).catch(async () => {
          // Fallback Endpoint: ඉහත endpoint එක නැත්නම් දැනට ඉන්න දොස්තරලගෙන් එන ඒවා ස්කෑන් කරනවා ක්‍රෑෂ් නොවී
          if (doctors.length > 0) {
            const firstDocId = doctors[0].userId || doctors[0]._id;
            return await axios.get(`http://localhost:5000/api/messages/history/${firstDocId}`, config);
          }
          return { data: [] };
        });

        if (Array.isArray(data) && data.length > 0) {
          // දොස්තර එවපු කියවපු නැති අලුත්ම මැසේජ් එක විතරක් ෆිල්ටර් කරලා ගන්නවා
          const doctorMessages = data.filter(m => m.senderId !== (patientInfo.id || 'user'));
          
          if (doctorMessages.length > lastCheckedMessagesCountRef.current) {
            const latestMsg = doctorMessages[doctorMessages.length - 1];
            
            // 💡 පේෂන්ට් දැනටමත් Live Chat ටැබ් එක ඇතුළේ නැත්නම් විතරක් පොපැප් එක මතු කරනවා මචං!
            if (activeMenu !== 'doctor_chat' && !isFirstLoadRef.current) {
              setActiveNotification({
                senderName: latestMsg.senderName || "Your Assigned Doctor",
                text: latestMsg.messageText || latestMsg.message || "Sent you a message...",
                timestamp: new Date(latestMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });

              // තත්පර 6කින් පොපැප් එක ඔටෝම ස්ක්‍රීන් එකෙන් අයින් වෙන්න සෙට් කරනවා බං
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

    // තත්පර 4න් 4ට පසුබිමෙන් සර්වර් එක චෙක් කරනවා බං
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
        const formattedMessages = data.map(chat => ({ text: chat.message, sender: chat.sender === 'User' ? 'user' : 'ai' }));
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
      setMessages(prev => [...prev, { text: data.bot_reply, sender: 'ai' }]);
    } catch (error) { setMessages(prev => [...prev, { text: " AI Service Offline.", sender: 'ai' }]); }
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
      alert("💳 Payment Authorized Successfully! 🎉");
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
      alert("🔒 Password Updated Successfully! 🎉");
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (error) { alert(error.response?.data?.message || "Password Update Failed"); }
    finally { setPassLoading(false); }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative">
      
      {/* ==================== 🔔 [LIVE ALERT POPUP NOTIFICATION] ==================== */}
      {activeNotification && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900/90 border-2 border-teal-500/40 backdrop-blur-md text-slate-100 px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-4 max-w-sm animate-slideIn">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 font-black text-sm flex items-center justify-center shadow-inner">💬</div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline"><h4 className="text-xs font-bold text-teal-400 truncate">{activeNotification.senderName}</h4><span className="text-[9px] text-slate-500 font-mono">{activeNotification.timestamp}</span></div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-snug">"{activeNotification.text}"</p>
            <button onClick={() => { setActiveMenu('doctor_chat'); setActiveNotification(null); }} className="mt-2 text-[10px] font-bold text-teal-400 hover:underline tracking-wider uppercase block">Open Messaging Desk 🚀</button>
          </div>
          <button onClick={() => setActiveNotification(null)} className="text-slate-500 hover:text-slate-200 text-xs">✕</button>
        </div>
      )}

      {/* 📂 LEFT SIDEBAR */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shadow-2xl h-full flex-shrink-0">
        <div>
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold text-slate-950 text-lg shadow-lg">🧠</div>
            <div><h2 className="text-sm font-bold tracking-wide text-teal-400">MindMate Client</h2><p className="text-[10px] text-slate-400">Patient Workspace</p></div>
          </div>
          <nav className="p-4 space-y-2">
            <button onClick={() => setActiveMenu('chat')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'chat' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>💬 Chat with AI Bot</button>
            <button onClick={() => setActiveMenu('doctor_chat')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'doctor_chat' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>💬 Live Chat with Doctor</button>
            <button onClick={() => setActiveMenu('booking')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'booking' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>📅 Book Practitioner</button>
            <button onClick={() => setActiveMenu('my_appointments')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'my_appointments' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>📋 My Appointments</button>
            <button onClick={() => setActiveMenu('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'settings' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>⚙️ Account Settings</button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-sm font-bold text-teal-400">{patientInfo.name.charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{patientInfo.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{patientInfo.email}</p>
            </div>
          </div>
          <button onClick={() => setShowLogoutModal(true)} className="w-full py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold rounded-xl text-[11px] transition-all">Logout Session</button>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 min-w-0">
        <header className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md">
          <h1 className="text-lg font-bold tracking-wide text-teal-400">
            {activeMenu === 'chat' ? 'MindMate AI Assistance' : activeMenu === 'doctor_chat' ? 'Medical Officer Messaging Desk' : activeMenu === 'booking' ? 'Clinical Practitioner Directory' : activeMenu === 'my_appointments' ? 'My Scheduled Consultations' : 'Security Settings'}
          </h1>
        </header>

        {/* 1. AI CHAT TAB */}
        {activeMenu === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-16 lg:px-24 space-y-6">
              {messages.length === 0 && ( <div className="text-center p-6 mt-20 text-slate-500 text-sm">Safe space activated. Share your mind...</div> )}
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl p-4 shadow-md ${msg.sender === 'user' ? 'bg-teal-600 text-slate-50 rounded-br-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'}`}><p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p></div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <footer className="p-4 bg-slate-900/40 border-t border-slate-900/60 md:px-16 lg:px-24"><form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto"><input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Share what's on your mind..." className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 text-slate-100" /><button type="submit" className="bg-teal-500 text-slate-950 font-bold px-6 rounded-xl text-xs uppercase">Send</button></form></footer>
          </div>
        )}

        {/* 2. 💬 DOCTOR LIVE CHAT TAB SUB-COMPONENT */}
        {activeMenu === 'doctor_chat' && <ClinicalChatSection coreDoctors={doctors} patientInfo={patientInfo} TOKEN={TOKEN} />}

        {/* 3. BOOKING TAB */}
        {activeMenu === 'booking' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {doctors.map((doc) => (
                <div key={doc._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex justify-between items-start mb-2"><h3 className="text-md font-bold text-slate-200">{doc.name}</h3><span className="text-xs bg-teal-500/10 text-teal-400 px-2 py-1 rounded-lg font-bold">Rs. {doc.fee}</span></div>
                    <p className="text-xs text-teal-400 font-semibold mb-3">{doc.specialization}</p>
                    {doc.bio && <p className="text-xs text-slate-400 bg-slate-950/40 p-3 rounded-xl italic mb-4">"{doc.bio}"</p>}
                  </div>
                  <button onClick={() => { setSelectedDoc(doc); setShowModal(true); }} className="w-full mt-6 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs uppercase shadow-md">Book Appointment</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. MY APPOINTMENTS TAB */}
        {activeMenu === 'my_appointments' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-4">
              {myAppointments.map((app) => (
                <div key={app._id} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-lg">👨‍⚕️</div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">{app.doctorDetails?.name || app.doctorId?.name || 'Clinical Practitioner'}</h3>
                      <p className="text-xs text-teal-400 mt-0.5">{app.doctorDetails?.specialization || 'Mental Health Specialist'}</p>
                      <div className="flex flex-wrap gap-x-4 mt-2 text-xs text-slate-500">
                        <div>📅 {app.date}</div><div>⏰ {app.timeSlot}</div>
                        <div className="text-emerald-400 font-medium">💵 Fee: Rs. {app.doctorDetails?.fee || app.doctorId?.fee || "2500"}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-end">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${app.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : app.status === 'Approved' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : app.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{app.status}</span>
                    {app.status === 'Approved' && (
                      <button onClick={() => { setActiveAppForPay(app); setShowPayModal(true); }} className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md animate-pulse">Proceed to Pay LKR.{app.doctorDetails?.fee || "2500"} 💳</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. ⚙️ SETTINGS TAB */}
        {activeMenu === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-6">
              <div><h2 className="text-md font-bold text-slate-200">Update Security Password</h2><p className="text-xs text-slate-500 mt-1">Keep your personal profile protected.</p></div>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Password</label><input type="password" required placeholder="••••••••" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-slate-200 transition-colors" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Password</label><input type="password" required placeholder="Minimum 6 characters" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-slate-200 transition-colors" /></div>
                <div className="pt-2"><button type="submit" className="w-full py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider">Save New Password</button></div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Booking Confirmation Modal */}
      {showModal && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-teal-400">Confirm Booking with {selectedDoc.name}</h2>
            <div className="relative z-50"><DatePicker selected={bookingDate} onChange={(date) => setBookingDate(date)} dateFormat="yyyy-MM-dd" minDate={new Date()} placeholderText="Click to pick a date" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200" /></div>
            <select required value={bookingSlot} onChange={(e) => setBookingSlot(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200"><option value="">-- Choose session --</option>{selectedDoc.slots ? selectedDoc.slots.split(',').map((slot, idx) => ( <option key={idx} value={slot.trim()}>{slot.trim()}</option> )) : <option value="Session 1">Session 1</option>}</select>
            <div className="flex gap-3"><button type="button" onClick={() => setShowModal(false)} className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">Cancel</button><button onClick={handleBookingSubmit} disabled={bookingSubmitLoading} className="w-1/2 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs">{bookingSubmitLoading ? "..." : "Confirm"}</button></div>
          </div>
        </div>
      )}

      {/* Payment Gateway Modal */}
      {showPayModal && activeAppForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div><h2 className="text-xs font-bold text-amber-400 uppercase">MindMate Secure Gateway</h2><p className="text-[11px] text-slate-400">Simulation</p></div>
              <button onClick={() => setShowPayModal(false)} className="text-slate-500 text-sm">✕</button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center"><span className="text-xs text-slate-400">Amount:</span><span className="text-md font-extrabold text-emerald-400">Rs. {activeAppForPay?.doctorDetails?.fee || "2500"}.00</span></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Card Number</label><input type="text" required placeholder="4111222233334444" value={cardForm.cardNumber} onChange={(e) => setCardForm({...cardForm, cardNumber: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expiration</label><input type="text" required placeholder="MM/YY" value={cardForm.expiry} onChange={(e) => setCardForm({...cardForm, expiry: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-center text-slate-200" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CVV</label><input type="password" required maxLength="3" placeholder="•••" value={cardForm.cvv} onChange={(e) => setCardForm({...cardForm, cvv: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-center text-slate-200" /></div>
              </div>
              <div className="pt-2 flex gap-3"><button type="button" onClick={() => setShowPayModal(false)} className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">Cancel</button><button type="submit" className="w-1/2 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs">Authorize</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 space-y-6">
            <div className="text-center space-y-3"><div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto text-rose-400 text-xl">🚪</div><div><h3 className="text-sm font-bold text-slate-200">Confirm Logout</h3><p className="text-xs text-slate-400">End your session on MindMate?</p></div></div>
            <div className="flex gap-3"><button type="button" onClick={() => setShowLogoutModal(false)} className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">Cancel</button><button type="button" onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="w-1/2 py-2.5 bg-rose-500 text-slate-950 font-bold rounded-xl text-xs">Logout</button></div>
          </div>
        </div>
      )}

    </div>
  );
}

// =========================================================================
// 💬 [SUB-COMPONENT]: CLINICAL MESSAGING PORTAL (INTERNAL FLOW)
// =========================================================================
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
    <div className="flex-1 flex min-h-0 bg-slate-950 border border-slate-900 m-4 rounded-2xl overflow-hidden shadow-inner">
      <div className="w-80 bg-slate-900/40 border-r border-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-900/60"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Clinical Consults</span><input type="text" placeholder="Search therapist or doctor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none" /></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredDoctors.map((doc, idx) => {
            const isSelected = activeChannel && (activeChannel._id === doc._id);
            return (
              <button key={idx} onClick={() => setActiveChannel(doc)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${isSelected ? 'bg-teal-600/10 border border-teal-500/30' : 'hover:bg-slate-900/50 border border-transparent'}`}>
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center font-bold text-teal-400">{doc.name?.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-200 truncate">{doc.name}</p><p className="text-[10px] text-slate-500 truncate">{doc.email}</p></div>
                <span className="text-[9px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase">Doc</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-slate-950">
        {activeChannel ? (
          <>
            <div className="px-6 py-4 border-b border-slate-900/60 bg-slate-900/20 flex justify-between items-center"><div><h3 className="text-xs font-bold text-slate-200">{activeChannel.name}</h3><p className="text-[10px] text-slate-500">{activeChannel.email}</p></div><span className="text-[10px] font-bold bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-md border border-teal-500/20">● Live Sync</span></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatLog.map((msg, i) => {
                const isMe = msg.senderId === patientInfo.id || msg.senderId === 'user';
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-md ${isMe ? 'bg-teal-600 text-slate-50 rounded-br-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'}`}><p className="text-xs leading-relaxed">{msg.message || msg.messageText}</p><span className="text-[8px] text-slate-400 block text-right mt-1 font-mono">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={fireMessage} className="p-4 border-t border-slate-900/60 bg-slate-900/10 flex gap-3"><input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder={`Write secure message to ${activeChannel.name}...`} className="flex-1 bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs focus:outline-none" /><button type="submit" className="bg-teal-500 text-slate-950 font-bold px-5 rounded-xl text-xs uppercase">Send 🚀</button></form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500"><div className="text-2xl mb-2">💬</div><p className="text-xs font-medium">Select an active practitioner from registry to begin support channel.</p></div>
        )}
      </div>
    </div>
  );
}

export default Chat;