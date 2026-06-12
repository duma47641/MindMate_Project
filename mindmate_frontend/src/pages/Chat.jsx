import React, { useState, useEffect, useRef } from 'react';
import axios from 'react-datepicker';
import axiosInstance from 'axios'; // සාමාන්‍ය axios ඉම්පෝට් එක මචං
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

function Chat() {
  const [activeMenu, setActiveMenu] = useState('chat'); // 'chat', 'booking', 'my_appointments', 'settings'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 🚪 Logout Confirmation Modal State එක මෙතන තියෙනවා මචං
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Patient Identity Info State
  const [patientInfo, setPatientInfo] = useState({ name: 'Loading...', email: '' });

  // States
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

  // Password Update States
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [passLoading, setPassLoading] = useState(false);

  const TOKEN = localStorage.getItem('token'); 
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  const fetchMyAppointments = async () => {
    if (!TOKEN) return;
    setAppointmentsLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const { data } = await axiosInstance.get('http://localhost:5000/api/appointments/my', config);
      setMyAppointments(data);
    } catch (error) { console.error("Error fetching appointments:", error.message); }
    finally { setAppointmentsLoading(false); }
  };

  useEffect(() => {
    if (!TOKEN) { window.location.href = '/login'; return; }

    // 🟢 [Dynamic Identity Scanner]: ලොග් වෙන ඕනෑම කෙනෙකුගේ ඇත්තම නම සහ ඊමේල් එක විතරක්ම ගන්නවා බං!
    try {
      const base64Url = TOKEN.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      console.log("Patient JWT Payload Scan:", payload);

      // 🕵️‍♂️ ටෝකන් එක ඇතුළේ කෙලින්ම නැත්නම්, .user හරි .patient හරි ඔබ්ජෙක්ට් එකක් ඇතුළේ තියෙනවද බලනවා
      const core = payload.user || payload.patient || payload;

      // 💡 ඩේටාබේස් එකේ නම සේව් කරලා තියෙන ඕනෑම Key එකක් Dynamic අල්ලගන්නවා 
      const dynamicName = core.name || core.username || core.fullName || core.email?.split('@')[0] || "MindMate User";
      const dynamicEmail = core.email || core.userEmail || "user@mindmate.com";

      setPatientInfo({
        name: dynamicName,
        email: dynamicEmail
      });
    } catch (error) {
      console.error("Token decode error:", error.message);
      setPatientInfo({ name: "MindMate User", email: "user@mindmate.com" });
    }

    const fetchChatHistory = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
        const { data } = await axiosInstance.get('http://localhost:5000/api/chat/history', config);
        const formattedMessages = data.map(chat => ({ text: chat.message, sender: chat.sender === 'User' ? 'user' : 'ai' }));
        setMessages(formattedMessages);
      } catch (error) { console.error("Error history:", error.message); }
    };

    const fetchAvailableDoctors = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
        const { data } = await axiosInstance.get('http://localhost:5000/api/users/doctors', config);
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
      const { data } = await axiosInstance.post('http://localhost:5000/api/chat/message', { message: userMessage }, config);
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

      const base64Url = TOKEN.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      const currentPatientId = payload.id;

      await axiosInstance.post('http://localhost:5000/api/appointments', { 
        doctorId: selectedDoc._id, 
        date: formattedDate, 
        timeSlot: bookingSlot,
        patientId: currentPatientId
      }, config);

      alert(` Appointment booked successfully!`);
      setShowModal(false); setBookingDate(null); setBookingSlot('');
      fetchMyAppointments(); setActiveMenu('my_appointments');
    } catch (error) { alert("Booking Error"); }
    finally { setBookingSubmitLoading(false); }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault(); setPayLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axiosInstance.put(`http://localhost:5000/api/appointments/${activeAppForPay._id}/pay`, cardForm, config);
      alert("💳 Payment Authorized Successfully! 🎉");
      setShowPayModal(false); setCardForm({ cardNumber: '', expiry: '', cvv: '' });
      await fetchMyAppointments();
    } catch (error) { alert("Payment Failed"); }
    finally { setPayLoading(false); }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPassLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axiosInstance.put('http://localhost:5000/api/users/update-password', passwordForm, config);
      alert("🔒 Password Updated Successfully! 🎉");
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      alert(error.response?.data?.message || "Password Update Failed");
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* 📂 LEFT SIDEBAR */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shadow-2xl h-full flex-shrink-0">
        <div>
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold text-slate-950 text-lg shadow-lg">🧠</div>
            <div><h2 className="text-sm font-bold tracking-wide text-teal-400">MindMate Client</h2><p className="text-[10px] text-slate-400">Patient Workspace</p></div>
          </div>
          <nav className="p-4 space-y-2">
            <button onClick={() => setActiveMenu('chat')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'chat' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>💬 Chat with AI Bot</button>
            <button onClick={() => setActiveMenu('booking')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'booking' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>📅 Book Practitioner</button>
            <button onClick={() => setActiveMenu('my_appointments')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'my_appointments' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>📋 My Appointments</button>
            <button onClick={() => setActiveMenu('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'settings' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>⚙️ Account Settings</button>
          </nav>
        </div>

        {/* [Smart Patient Badge] */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-sm font-bold text-teal-400">
              {patientInfo.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{patientInfo.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{patientInfo.email}</p>
            </div>
          </div>
          {/* 🟢 පැරණි කෝඩ් එක වෙනස් කරලා සෘජුවම Modal එක ට්‍රිගර් වෙන විදිහට සෙට් කළා බං */}
          <button 
            onClick={() => setShowLogoutModal(true)} 
            className="w-full py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold rounded-xl text-[11px] transition-all"
          >
            Logout Session
          </button>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 min-w-0">
        <header className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md">
          <h1 className="text-lg font-bold tracking-wide text-teal-400">
            {activeMenu === 'chat' ? 'MindMate AI Assistance' : activeMenu === 'booking' ? 'Clinical Practitioner Directory' : activeMenu === 'my_appointments' ? 'My Scheduled Consultations' : 'Security Settings'}
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

        {/* 2. BOOKING TAB */}
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

        {/* 3. MY APPOINTMENTS TAB */}
        {activeMenu === 'my_appointments' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-4">
              {myAppointments.map((app) => (
                <div key={app._id} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-lg">👨‍⚕️</div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">
                        {app.doctorDetails?.name || app.doctorId?.name || 'Clinical Practitioner'}
                      </h3>
                      <p className="text-xs text-teal-400 mt-0.5">
                        {app.doctorDetails?.specialization || 'Mental Health Specialist'}
                      </p>
                      <div className="flex flex-wrap gap-x-4 mt-2 text-xs text-slate-500">
                        <div>📅 {app.date}</div>
                        <div>⏰ {app.timeSlot}</div>
                        <div className="text-emerald-400 font-medium">
                          💵 Fee: Rs. {app.doctorDetails?.fee || app.doctorId?.fee || "2500"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-end">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${app.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : app.status === 'Approved' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : app.status === 'Cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{app.status}</span>
                    {app.status === 'Approved' && (
                      <button onClick={() => { setActiveAppForPay(app); setShowPayModal(true); }} className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md animate-pulse">
                        Proceed to Pay LKR.{app.doctorDetails?.fee || "2500"} 💳
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. ⚙️ PATIENT PASSWORD ACCOUNT SETTINGS TAB */}
        {activeMenu === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-md font-bold text-slate-200">Update Security Password</h2>
                <p className="text-xs text-slate-500 mt-1">Keep your personal mental healthcare profile fully protected.</p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Password</label>
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••" 
                    value={passwordForm.currentPassword} 
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-slate-200 transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Password</label>
                  <input 
                    type="password" 
                    required 
                    placeholder="Minimum 6 characters" 
                    value={passwordForm.newPassword} 
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-slate-200 transition-colors" 
                  />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={passLoading} className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all">
                    {passLoading ? "Updating Password..." : "Save New Password"}
                  </button>
                </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-all">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative border border-teal-500/10">
            <div className="px-6 py-4 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider">MindMate Secure Gateway</h2>
                <p className="text-[11px] text-slate-400">Payment Simulation</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-slate-500 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400">Total Consultation Amount:</span>
                <span className="text-md font-extrabold text-emerald-400">Rs. {activeAppForPay?.doctorDetails?.fee || activeAppForPay?.doctorId?.fee || "2500"}.00</span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cardholder Name</label>
                <input type="text" required placeholder="JOHN DOE" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 text-slate-200 uppercase placeholder-slate-700 transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dummy Card Number</label>
                <input type="text" required maxLength="16" minLength="16" placeholder="4111222233334444" value={cardForm.cardNumber} onChange={(e) => setCardForm({...cardForm, cardNumber: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 text-slate-200 tracking-widest placeholder-slate-700 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expiration</label>
                  <input type="text" required maxLength="5" placeholder="MM/YY" value={cardForm.expiry} onChange={(e) => setCardForm({...cardForm, expiry: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 text-slate-200 text-center placeholder-slate-700 transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CVV Security Code</label>
                  <input type="password" required maxLength="3" minLength="3" placeholder="•••" value={cardForm.cvv} onChange={(e) => setCardForm({...cardForm, cvv: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 text-slate-200 text-center tracking-widest placeholder-slate-700 transition-colors" />
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowPayModal(false)} className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors">Cancel</button>
                <button type="submit" disabled={payLoading} className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/10 transition-all">{payLoading ? "Authorizing..." : "Authorize Payment"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 🚪 PREMIUM LOGOUT CONFIRMATION POPUP ==================== */}
      {/* 🟢 ඔන්න උඹ ඉල්ලපු සුපිරි Safe-Logout Popup එක කෝඩ් එකේ යටටම ලස්සනට ඇමිණුවා බං! */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6 border border-rose-500/10">
            
            {/* Icon & Message */}
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400 text-xl shadow-lg shadow-rose-500/5 animate-pulse">
                🚪
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-200">Confirm Logout</h3>
                <p className="text-xs text-slate-400">Are you sure you want to end your active session on MindMate?</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowLogoutModal(false)} 
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }} 
                className="w-1/2 py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-rose-500/10 transition-all"
              >
                Logout Account
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Chat;