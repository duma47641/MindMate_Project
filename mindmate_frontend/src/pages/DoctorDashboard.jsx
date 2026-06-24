import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 📅 FullCalendar Imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

function DoctorDashboard() {
  // 🟢 [UI FIX]: ලොග් වුණු ගමන්ම මුලින්ම Calendar එක පෙන්වන්න Default එක 'dashboard' කළා බං
  const [activeMenu, setActiveMenu] = useState('dashboard'); 
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docInfo, setDocInfo] = useState({ id: '', name: 'Loading...', email: '' });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Chart Modal States
  const [showChartModal, setShowChartModal] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [activePatientName, setActivePatientName] = useState('');

  // Password Form States
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [passLoading, setPassLoading] = useState(false);

  // 🔔 Notification States
  const [activeNotification, setActiveNotification] = useState(null);
  const lastCheckedMessagesCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);

  const TOKEN = localStorage.getItem('token');

  // 🔄 දොස්තරට අදාළ බුකින්ස් ටික සර්වර් එකෙන් ඇදලා ගැනීම
  const fetchAppointments = async () => {
    if (!TOKEN) return;
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const { data } = await axios.get('http://localhost:5000/api/appointments/my', config);
      setAppointments(data);
    } catch (error) {
      console.error("Error fetching doctor appointments:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔔 Global Background Listener for Live Notifications
  useEffect(() => {
    if (!TOKEN) return;

    const checkIncomingPatientMessages = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
        const { data } = await axios.get('http://localhost:5000/api/messages/history/all', config).catch(async () => {
          if (appointments.length > 0) {
            const paidApp = appointments.find(a => a.status === 'Paid');
            if (paidApp) {
              const targetPatientId = paidApp.patientId?._id || paidApp.patientId;
              return await axios.get(`http://localhost:5000/api/messages/history/${targetPatientId}`, config);
            }
          }
          return { data: [] };
        });

        if (Array.isArray(data) && data.length > 0) {
          const patientMessages = data.filter(m => m.senderId !== (docInfo.id || 'doctor'));
          
          if (patientMessages.length > lastCheckedMessagesCountRef.current) {
            const latestMsg = patientMessages[patientMessages.length - 1];
            
            if (activeMenu !== 'chat' && !isFirstLoadRef.current) {
              setActiveNotification({
                senderName: latestMsg.senderName || "Active Mental Patient",
                text: latestMsg.messageText || latestMsg.message || "Sent a message...",
                timestamp: new Date(latestMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });

              setTimeout(() => { setActiveNotification(null); }, 6000);
            }
          }
          lastCheckedMessagesCountRef.current = patientMessages.length;
        }
        isFirstLoadRef.current = false;
      } catch (err) {
        console.log("Background patient notification sync silent log.");
      }
    };

    const pollTimer = setInterval(checkIncomingPatientMessages, 4000);
    return () => clearInterval(pollTimer);
  }, [TOKEN, activeMenu, appointments, docInfo]);

  useEffect(() => {
    if (!TOKEN) { window.location.href = '/login'; return; }

    try {
      const base64Url = TOKEN.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      const core = payload.user || payload;
      setDocInfo({
        id: core.id || core._id,
        name: core.name || 'Dr. Arshad Rahman',
        email: core.email || 'arshad@mindmate.com'
      });
    } catch (error) {
      console.error("Token decode error:", error.message);
    }

    fetchAppointments();
  }, [TOKEN]);

  useEffect(() => {
    if (activeMenu === 'appointments' || activeMenu === 'dashboard') {
      fetchAppointments();
    }
  }, [activeMenu]);

  // 👨‍⚕️ Appointment එකක් Approve හෝ Cancel කිරීම
  const handleStatusUpdate = async (appId, nextStatus) => {
    if (!window.confirm(`Are you sure you want to set this request to ${nextStatus}?`)) return;
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.put(`http://localhost:5000/api/appointments/${appId}/status`, { status: nextStatus }, config);
      alert(`Appointment successfully ${nextStatus}! 🚀`);
      fetchAppointments(); 
    } catch (error) {
      alert("Error updating status: " + (error.response?.data?.message || error.message));
    }
  };

  // 📊 Analytics Open කිරීම
  const openAnalytics = async (patientId, patientName) => {
    setActivePatientName(patientName);
    setShowChartModal(true);
    setChartLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const { data } = await axios.get(`http://localhost:5000/api/appointments/analytics/${patientId}`, config);
      setChartData(data);
    } catch (error) {
      console.error(error);
      setChartData([
        { date: '2026-06-07', Neutral: 1, Stress: 2, Anxiety: 4, Depression: 1, Critical: 5 },
        { date: '2026-06-12', Neutral: 3, Stress: 1, Anxiety: 2, Depression: 5, Critical: 2 }
      ]);
    } finally {
      setChartLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPassLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.put('http://localhost:5000/api/users/update-password', passwordForm, config);
      alert("🔒 Password Updated Successfully!");
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      alert(error.response?.data?.message || "Password Update Failed");
    } finally {
      setPassLoading(false);
    }
  };

  const pendingCount = appointments.filter(app => app.status === 'Pending').length;
  const approvedCount = appointments.filter(app => app.status === 'Approved' || app.status === 'Paid').length;
  
  const totalIncome = appointments
    .filter(app => app.status === 'Approved' || app.status === 'Paid')
    .reduce((sum, app) => {
      const fee = parseFloat(app.doctorDetails?.fee || app.fee || 2500);
      return sum + fee;
    }, 0);

  // 📅 Calendar Event Mapper Logic
  const calendarEvents = appointments.map(app => {
    let statusColors = {
      'Pending': '#f59e0b',
      'Approved': '#06b6d4',
      'Paid': '#10b981',
      'Cancelled': '#ef4444'
    };
    const patientName = app.patientId?.name || app.patientId?.username || 'MindMate Patient';
    return {
      id: app._id,
      title: `⏰ ${app.timeSlot} - ${patientName} (${app.status})`,
      start: app.date,
      backgroundColor: statusColors[app.status] || '#334155',
      borderColor: statusColors[app.status] || '#334155',
      textColor: '#020617',
      extendedProps: { ...app }
    };
  });

  const handleEventClick = (info) => {
    const app = info.event.extendedProps;
    const pName = app.patientId?.name || app.patientId?.username || 'MindMate Patient';
    let actionMsg = `📋 CLIENT SESSION REPORT\n-------------------------------\n👤 Patient: ${pName}\n📅 Date: ${app.date}\n⏰ Slot: ${app.timeSlot}\n⚡ Status: ${app.status}\n\n`;

    if (app.status === 'Pending') {
      const option = window.confirm(`${actionMsg}Would you like to APPROVE this appointment request?\n\n[OK] = Approve Session\n[Cancel] = Keep Pending`);
      if (option) handleStatusUpdate(app._id, 'Approved');
    } else if (app.status === 'Paid') {
      const option = window.confirm(`${actionMsg}This session is Paid & Verified.\nWould you like to open this patient's AI Mood Analytics?`);
      if (option) openAnalytics(app.patientId?._id, pName);
    } else {
      alert(actionMsg + "No advanced interactions needed for this status log.");
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative">
      
      {/* 🔔 LIVE ALERT POPUP NOTIFICATION */}
      {activeNotification && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900/95 border-2 border-teal-500/40 backdrop-blur-md text-slate-100 px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-4 max-w-sm animate-slideIn">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 font-black text-sm flex items-center justify-center shadow-inner">💬</div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline"><h4 className="text-xs font-bold text-teal-400 truncate">{activeNotification.senderName}</h4><span className="text-[9px] text-slate-500 font-mono">{activeNotification.timestamp}</span></div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-snug">"{activeNotification.text}"</p>
            <button onClick={() => { setActiveMenu('chat'); setActiveNotification(null); }} className="mt-2 text-[10px] font-bold text-teal-400 hover:underline tracking-wider uppercase block">Open Messaging Desk 🚀</button>
          </div>
          <button onClick={() => setActiveNotification(null)} className="text-slate-500 hover:text-slate-200 text-xs">✕</button>
        </div>
      )}

      {/* 📂 LEFT SIDEBAR */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shadow-2xl h-full flex-shrink-0">
        <div>
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold text-slate-950 text-lg shadow-lg">👨‍⚕️</div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-teal-400">MindMate Doc</h2>
              <p className="text-[10px] text-slate-400">Medical Portal</p>
            </div>
          </div>

          <nav className="p-4 space-y-2">
            {/* 🟢 [UI Fix]: මුලින්ම ලොඩ් වෙන Clinical Dashboard බටන් එක මචං */}
            <button onClick={() => setActiveMenu('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'dashboard' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>📊 Clinical Scheduler Dashboard</button>
            <button onClick={() => setActiveMenu('appointments')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'appointments' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>📋 Patient Appointments List</button>
            <button onClick={() => setActiveMenu('chat')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'chat' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>💬 Live Chat with Patient</button>
            <button onClick={() => setActiveMenu('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${activeMenu === 'settings' ? 'bg-teal-600 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800/50'}`}>⚙️ Account Settings</button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-sm font-bold text-teal-400">{docInfo.name.charAt(0)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{docInfo.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{docInfo.email}</p>
            </div>
          </div>
          <button onClick={() => setShowLogoutModal(true)} className="w-full py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white font-bold rounded-xl text-[11px] transition-all">Logout Account</button>
        </div>
      </aside>

      {/* 💻 MAIN CONTENT WINDOW */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 min-w-0">
        <header className="flex items-center justify-between px-6 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md">
          <h1 className="text-lg font-bold tracking-wide text-teal-400">
            {activeMenu === 'dashboard' ? 'Clinical Interactive Scheduler' : activeMenu === 'appointments' ? 'Patient Channeling Intake Log List' : activeMenu === 'chat' ? 'Secure Clinical Messaging Desk' : 'Security Settings'}
          </h1>
        </header>

        {/* ==================== 📊 1. DEFAULT DASHBOARD VIEW (CALENDAR ONLY) ==================== */}
        {activeMenu === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-5xl mx-auto">
              {/* Stats Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-lg">
                  <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Sessions</p><h3 className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</h3></div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-md">⏳</div>
                </div>
                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-lg">
                  <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approved Sessions</p><h3 className="text-2xl font-black text-teal-400 mt-1">{approvedCount}</h3></div>
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-md">✅</div>
                </div>
                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-lg border-emerald-500/10">
                  <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Earnings</p><h3 className="text-2xl font-black text-emerald-400 mt-1">LKR {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3></div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-md">💵</div>
                </div>
              </div>

              {/* FullCalendar Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
                  <div><h2 className="text-sm font-bold text-slate-200 tracking-wide">Interactive Clinical Calendar</h2><p className="text-[11px] text-slate-500 mt-0.5">Click any scheduled event block to manage records.</p></div>
                  <div className="flex gap-3 text-[10px] bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-amber-400 font-semibold">● Pending</span><span className="text-cyan-400 font-semibold">● Approved</span><span className="text-emerald-400 font-semibold">● Paid</span>
                  </div>
                </div>
                {loading ? (
                  <p className="text-xs text-slate-500 text-center py-20">Loading interactive clinical timeline...</p>
                ) : (
                  <div className="premium-calendar-wrapper text-xs text-slate-200">
                    <FullCalendar plugins={[dayGridPlugin]} initialView="dayGridMonth" events={calendarEvents} eventClick={handleEventClick} height="auto" headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================== 📋 2. PATIENT APPOINTMENTS LIST VIEW (THE ORIGINAL LIST EXTRACTED HERE) ==================== */}
        {activeMenu === 'appointments' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-4">
              <h2 className="text-sm font-bold text-slate-300 mb-4 font-semibold">Active Consultation Intake Log List</h2>
              
              {loading ? (
                <p className="text-xs text-slate-500 text-center py-12">Loading requests from medical database...</p>
              ) : appointments.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-12">No channelling requests found for your profile yet, doctor.</p>
              ) : (
                appointments.map((app) => (
                  <div key={app._id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-slate-800/50 transition-colors">
                    
                    {/* Patient Core Details */}
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-lg">👤</div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-200">{app.patientId?.name || app.patientId?.username || 'MindMate Patient'}</h3>
                        <p className="text-xs text-slate-400">{app.patientId?.email || 'No email log available'}</p>
                        <div className="flex gap-4 mt-2 text-xs text-slate-500 border-t border-slate-800/60 pt-2">
                          <div>📅 Date: <span className="text-slate-300">{app.date}</span></div><div>⏰ Slot: <span className="text-slate-300">{app.timeSlot}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls Box */}
                    <div className="flex items-center gap-2 justify-end">
                      {app.status === 'Pending' && (
                        <>
                          <button onClick={() => handleStatusUpdate(app._id, 'Approved')} className="px-4 py-1.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-md hover:bg-teal-400 transition-colors">Approve</button>
                          <button onClick={() => handleStatusUpdate(app._id, 'Cancelled')} className="px-4 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-xs font-bold rounded-xl transition-all">Decline</button>
                        </>
                      )}
                      {app.status === 'Approved' && <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-cyan-500/10 text-cyan-400 border-cyan-500/20">Approved (Awaiting Payment)</span>}
                      {app.status === 'Cancelled' && <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-rose-500/10 text-rose-400 border-rose-500/20">Cancelled</span>}
                      {app.status === 'Paid' && (
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-500/20 text-emerald-400 border-emerald-500/40">● Paid & Confirmed 💵</span>
                          <button onClick={() => openAnalytics(app.patientId?._id, app.patientId?.name)} className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md">📊 View Mood Analytics</button>
                        </div>
                      )}
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ==================== 💬 3. DOCTOR LIVE CHAT TAB ==================== */}
        {activeMenu === 'chat' && <DoctorClinicalChatSection coreAppointments={appointments} docInfo={docInfo} TOKEN={TOKEN} />}

        {/* ==================== ⚙️ 4. SETTINGS TAB ==================== */}
        {activeMenu === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-6">
              <div><h2 className="text-md font-bold text-slate-200">Update Account Password</h2><p className="text-xs text-slate-500 mt-1">Ensure your medical account stays secure.</p></div>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Password</label><input type="password" required placeholder="••••••••" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-slate-200 transition-colors" /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Password</label><input type="password" required placeholder="Minimum 6 characters" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 text-slate-200 transition-colors" /></div>
                <div className="pt-2"><button type="submit" disabled={passLoading} className="w-full py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg">{passLoading ? "Updating Security..." : "Save New Password"}</button></div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Mood Analytics Dashboard Modal Popup */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-md font-bold text-teal-400">📊 Mood Analytics Dashboard</h2>
                <p className="text-xs text-slate-400 mt-0.5">Tracking well-being for <span className="text-white font-medium">{activePatientName}</span></p>
              </div>
              <button onClick={() => setShowChartModal(false)} className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-sm hover:bg-rose-500 text-slate-400">✕</button>
            </div>
            {chartLoading ? (
              <p className="text-xs text-slate-500 text-center py-20">Extracting clinical markers from AI dataset...</p>
            ) : (
              <div className="w-full h-80 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Neutral" fill="#94a3b8" />
                    <Bar dataKey="Stress" fill="#38bdf8" />
                    <Bar dataKey="Anxiety" fill="#f59e0b" />
                    <Bar dataKey="Depression" fill="#6366f1" />
                    <Bar dataKey="Critical" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="text-right"><button onClick={() => setShowChartModal(false)} className="px-5 py-2 bg-slate-800 text-xs font-bold rounded-xl">Close Log</button></div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 space-y-6">
            <div className="text-center space-y-3"><div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto text-rose-400 text-xl">🚪</div><div><h3 className="text-sm font-bold text-slate-200">Confirm Logout</h3><p className="text-xs text-slate-400">Are you sure you want to end your session?</p></div></div>
            <div className="flex gap-3"><button type="button" onClick={() => setShowLogoutModal(false)} className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">Cancel</button><button type="button" onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="w-1/2 py-2.5 bg-rose-500 text-slate-950 font-bold rounded-xl text-xs">Logout Account</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// 💬 [SUB-COMPONENT]: DOCTOR CLINICAL MESSAGING PORTAL
function DoctorClinicalChatSection({ coreAppointments, docInfo, TOKEN }) {
  const [activeChannel, setActiveChannel] = useState(null);
  const [chatLog, setChatLog] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const chatBottomRef = useRef(null);

  const patientDirectory = [];
  const map = new Map();
  
  coreAppointments.forEach(app => {
    if (app.patientId && app.patientId._id && !map.has(app.patientId._id)) {
      map.set(app.patientId._id, true);
      patientDirectory.push({
        _id: app.patientId._id,
        name: app.patientId.name || app.patientId.username || 'Valued Patient',
        email: app.patientId.email || 'No email registered'
      });
    }
  });

  const fetchActiveChatLog = async () => {
    if (!TOKEN || !activeChannel) return;
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const { data } = await axios.get(`http://localhost:5000/api/messages/history/${activeChannel._id}`, config);
      setChatLog(data);
    } catch (err) { console.error("Error shifting data logs:", err.message); }
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
      const { data } = await axios.post('http://localhost:5000/api/messages/send', {
        receiverId: activeChannel._id,
        message: bodyStr
      }, config);

      setChatLog(prev => [...prev, data.newMessage || data]);
    } catch (err) { console.error("Dispatch failure:", err.message); }
  };

  const filteredPatients = patientDirectory.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex-1 flex min-h-0 bg-slate-950 border border-slate-900 m-4 rounded-2xl overflow-hidden shadow-inner">
      <div className="w-80 bg-slate-900/40 border-r border-slate-900 flex flex-col">
        <div className="p-4 border-b border-slate-900/60"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Clinical Contacts</span><input type="text" placeholder="Search patient name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none" /></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredPatients.length === 0 ? (
            <p className="text-[11px] text-slate-600 text-center py-10 italic">No active patients found in channeling memory.</p>
          ) : (
            filteredPatients.map((pat, idx) => {
              const isSelected = activeChannel && (activeChannel._id === pat._id);
              return (
                <button key={idx} onClick={() => setActiveChannel(pat)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${isSelected ? 'bg-teal-600/10 border border-teal-500/30' : 'hover:bg-slate-900/50 border border-transparent'}`}>
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center font-bold text-teal-400">{pat.name?.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-200 truncate">{pat.name}</p><p className="text-[10px] text-slate-500 truncate">{pat.email}</p></div>
                </button>
              );
            })
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-slate-950">
        {activeChannel ? (
          <>
            <div className="px-6 py-4 border-b border-slate-900/60 bg-slate-900/20 flex justify-between items-center"><div><h3 className="text-xs font-bold text-slate-200">{activeChannel.name}</h3><p className="text-[10px] text-slate-500">{activeChannel.email}</p></div><span className="text-[10px] font-bold bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-md border border-teal-500/20">● Live Sync</span></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatLog.map((msg, i) => {
                const isMe = msg.senderId === docInfo.id || msg.senderId === 'doctor';
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
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500"><div className="text-2xl mb-2">💬</div><p className="text-xs font-medium">Select an active patient profile from the directory on the left to activate secure counseling portal.</p></div>
        )}
      </div>
    </div>
  );
}

export default DoctorDashboard;