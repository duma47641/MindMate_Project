import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

//  FullCalendar Imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

function DoctorDashboard() {
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

  //  Notification States
  const [activeNotification, setActiveNotification] = useState(null);
  const lastCheckedMessagesCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);

  const TOKEN = localStorage.getItem('token');

  //  Fetch Appointments
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

  //  Global Background Listener for Live Notifications
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

  //  Appointment Status Update
  const handleStatusUpdate = async (appId, nextStatus) => {
    if (!window.confirm(`Are you sure you want to set this request to ${nextStatus}?`)) return;
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      await axios.put(`http://localhost:5000/api/appointments/${appId}/status`, { status: nextStatus }, config);
      alert(`Appointment successfully ${nextStatus}! `);
      fetchAppointments(); 
    } catch (error) {
      alert("Error updating status: " + (error.response?.data?.message || error.message));
    }
  };

  //  Mood Analytics Graph Trigger
  const openAnalytics = async (patientInput, fallbackName) => {
    const pId = patientInput?.patientId || patientInput?._id || patientInput?.userId || patientInput?.id || patientInput;
    const pName = patientInput?.name || patientInput?.username || fallbackName || 'Valued Patient';

    setActivePatientName(pName);
    setShowChartModal(true);
    setChartLoading(true);

    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const { data } = await axios.get(`http://localhost:5000/api/chat/patient-history/${pId}`, config);

      if (Array.isArray(data) && data.length > 0) {
        const groupedMap = {};

        data.forEach(item => {
          const dateKey = item.date || new Date().toLocaleDateString();
          if (!groupedMap[dateKey]) {
            groupedMap[dateKey] = { date: dateKey, Neutral: 0, Stress: 0, Anxiety: 0, Depression: 0, Critical: 0 };
          }

          let mood = item.sentiment || "Neutral";
          if (mood.includes("Normal") || mood.includes("Stable")) mood = "Neutral";
          if (mood.includes("Crisis") || mood.includes("Suicidal")) mood = "Critical";

          if (groupedMap[dateKey][mood] !== undefined) {
            groupedMap[dateKey][mood] += 1;
          } else {
            groupedMap[dateKey]["Neutral"] += 1;
          }
        });

        setChartData(Object.values(groupedMap));
      } else {
        setChartData([]);
      }
    } catch (error) {
      console.error("Failed to load mood analytics:", error);
      setChartData([]);
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

  //  Calendar Event Mapper Logic
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
      backgroundColor: statusColors[app.status] || '#64748b',
      borderColor: statusColors[app.status] || '#64748b',
      textColor: '#ffffff',
      extendedProps: { ...app }
    };
  });

  const handleEventClick = (info) => {
    const app = info.event.extendedProps;
    const pName = app.patientId?.name || app.patientId?.username || 'MindMate Patient';
    let actionMsg = ` CLIENT SESSION REPORT\n-------------------------------\n Patient: ${pName}\n Date: ${app.date}\n Slot: ${app.timeSlot}\n Status: ${app.status}\n\n`;

    if (app.status === 'Pending') {
      const option = window.confirm(`${actionMsg}Would you like to APPROVE this appointment request?\n\n[OK] = Approve Session\n[Cancel] = Keep Pending`);
      if (option) handleStatusUpdate(app._id, 'Approved');
    } else if (app.status === 'Paid') {
      const option = window.confirm(`${actionMsg}This session is Paid & Verified.\nWould you like to open this patient's AI Mood Analytics?`);
      if (option) openAnalytics(app.patientId?._id || app.patientId, pName);
    } else {
      alert(actionMsg + "No advanced interactions needed for this status log.");
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden relative">
      
      {/*  LIVE NOTIFICATION POPUP */}
      {activeNotification && (
        <div className="fixed top-5 right-5 z-50 bg-white/95 border border-emerald-200 backdrop-blur-md text-slate-800 px-5 py-4 rounded-2xl shadow-xl flex items-start gap-4 max-w-sm animate-slideIn">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 font-black text-sm flex items-center justify-center shadow-xs">💬</div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <h4 className="text-xs font-bold text-emerald-700 truncate">{activeNotification.senderName}</h4>
              <span className="text-[9px] text-slate-400 font-mono">{activeNotification.timestamp}</span>
            </div>
            <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-snug">"{activeNotification.text}"</p>
            <button onClick={() => { setActiveMenu('chat'); setActiveNotification(null); }} className="mt-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline tracking-wider uppercase block">Open Messaging Desk </button>
          </div>
          <button onClick={() => setActiveNotification(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
        </div>
      )}

      {/*  LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shadow-[2px_0_12px_rgba(0,0,0,0.02)] h-full flex-shrink-0">
        <div>
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-emerald-500/25 ring-4 ring-emerald-50"></div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900">MindMate Doc</h2>
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Medical Portal</p>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            {[
              { id: 'dashboard', label: 'Clinical Scheduler Dashboard', icon: '' },
              { id: 'appointments', label: 'Patient Appointments List', icon: '' },
              { id: 'chat', label: 'Live Chat with Patient', icon: '' },
              { id: 'settings', label: 'Account Settings', icon: '' }
            ].map(tab => {
              const isActive = activeMenu === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveMenu(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-xs transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 translate-x-1'
                      : 'text-slate-600 hover:bg-emerald-50/60 hover:text-emerald-700 hover:translate-x-1'
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
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200/80 flex items-center justify-center text-sm font-bold text-emerald-700 shadow-inner">{docInfo.name.charAt(0)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{docInfo.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{docInfo.email}</p>
            </div>
          </div>
          <button onClick={() => setShowLogoutModal(true)} className="w-full py-2.5 bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-200/60 hover:border-transparent font-bold rounded-xl text-[11px] transition-all duration-200 shadow-xs active:scale-[0.98]">
            Logout Account
          </button>
        </div>
      </aside>

      {/*  MAIN CONTENT WINDOW */}
      <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] min-w-0">
        <header className="flex items-center justify-between px-8 py-4.5 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-xs z-10">
          <div>
            <h1 className="text-base font-extrabold text-slate-800 tracking-tight">
              {activeMenu === 'dashboard' ? 'Clinical  Schedule' : activeMenu === 'appointments' ? 'Patient Channeling Intake Log List' : activeMenu === 'chat' ? 'Secure Clinical Messaging Desk' : 'Security Settings'}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Doctor Channeling & Consultation Desk</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-emerald-50/80 border border-emerald-200/70 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Doctor Portal Active
            </span>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 1. DEFAULT DASHBOARD VIEW (STATS & CALENDAR) */}
        {/* ========================================================================= */}
        {activeMenu === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="max-w-5xl mx-auto">
              {/* Stats Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex items-center justify-between shadow-xs hover:shadow-md hover:border-amber-200 transition-all duration-200">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Sessions</p>
                    <h3 className="text-2xl font-black text-amber-500 mt-1">{pendingCount}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl shadow-inner">⏳</div>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex items-center justify-between shadow-xs hover:shadow-md hover:border-emerald-200 transition-all duration-200">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved Sessions</p>
                    <h3 className="text-2xl font-black text-emerald-600 mt-1">{approvedCount}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl shadow-inner">✅</div>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex items-center justify-between shadow-xs hover:shadow-md hover:border-teal-200 transition-all duration-200">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Earnings</p>
                    <h3 className="text-2xl font-black text-teal-700 mt-1">LKR {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-xl shadow-inner">💵</div>
                </div>
              </div>

              {/* FullCalendar Card */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex flex-wrap gap-4 items-center justify-between mb-5 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 tracking-wide">Interactive Clinical Calendar</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click any scheduled event block to manage records or view patient mood analytics.</p>
                  </div>
                  <div className="flex gap-3 text-[10px] bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/80">
                    <span className="text-amber-600 font-bold">● Pending</span>
                    <span className="text-cyan-600 font-bold">● Approved</span>
                    <span className="text-emerald-600 font-bold">● Paid</span>
                  </div>
                </div>
                {loading ? (
                  <p className="text-xs text-slate-400 text-center py-20">Loading interactive clinical timeline...</p>
                ) : (
                  <div className="premium-calendar-wrapper text-xs text-slate-800">
                    <FullCalendar 
                      plugins={[dayGridPlugin]} 
                      initialView="dayGridMonth" 
                      events={calendarEvents} 
                      eventClick={handleEventClick} 
                      height="auto" 
                      headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }} 
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. PATIENT APPOINTMENTS LIST VIEW */}
        {/* ========================================================================= */}
        {activeMenu === 'appointments' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="mb-6">
                <h2 className="text-lg font-black text-slate-800">Active Consultation Intake Log List</h2>
                <p className="text-xs text-slate-500 mt-0.5">Approve, decline, and inspect channeled patient appointments.</p>
              </div>
              
              {loading ? (
                <p className="text-xs text-slate-400 text-center py-12">Loading requests from medical database...</p>
              ) : appointments.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
                  <p className="text-xs text-slate-500">No channeling requests found for your profile yet, doctor.</p>
                </div>
              ) : (
                appointments.map((app) => (
                  <div key={app._id} className="bg-white border border-slate-200/80 rounded-3xl p-5.5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all duration-200">
                    
                    {/* Patient Core Details */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
                        👤
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">{app.patientId?.name || app.patientId?.username || 'MindMate Patient'}</h3>
                        <p className="text-xs text-slate-500">{app.patientId?.email || 'No email log available'}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs">
                          <span className="px-2.5 py-1 bg-slate-50 rounded-lg text-slate-600 border border-slate-100"> Date: <strong className="text-slate-800">{app.date}</strong></span>
                          <span className="px-2.5 py-1 bg-slate-50 rounded-lg text-slate-600 border border-slate-100"> Slot: <strong className="text-slate-800">{app.timeSlot}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls Box */}
                    <div className="flex items-center gap-2 justify-end">
                      {app.status === 'Pending' && (
                        <>
                          <button onClick={() => handleStatusUpdate(app._id, 'Approved')} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95">Approve</button>
                          <button onClick={() => handleStatusUpdate(app._id, 'Cancelled')} className="px-4 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 text-xs font-bold rounded-xl transition-all active:scale-95">Decline</button>
                        </>
                      )}
                      {app.status === 'Approved' && (
                        <span className="px-3 py-1.5 rounded-xl text-[11px] font-bold border bg-cyan-50 text-cyan-700 border-cyan-200">
                          Approved (Awaiting Payment)
                        </span>
                      )}
                      {app.status === 'Cancelled' && (
                        <span className="px-3 py-1.5 rounded-xl text-[11px] font-bold border bg-rose-50 text-rose-700 border-rose-200">
                          Cancelled
                        </span>
                      )}
                      {app.status === 'Paid' && (
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1.5 rounded-xl text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs">
                            ● Paid & Confirmed 💵
                          </span>
                          <button onClick={() => openAnalytics(app.patientId?._id || app.patientId, app.patientId?.name)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 active:scale-95">
                            📊 View Mood Analytics
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. DOCTOR LIVE CHAT TAB */}
        {/* ========================================================================= */}
        {activeMenu === 'chat' && <DoctorClinicalChatSection coreAppointments={appointments} docInfo={docInfo} TOKEN={TOKEN} />}

        {/* ========================================================================= */}
        {/* 4. SETTINGS TAB */}
        {/* ========================================================================= */}
        {activeMenu === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
            <div className="bg-white border border-slate-200/80 w-full max-w-md rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-extrabold text-slate-800">Update Account Password</h2>
                <p className="text-xs text-slate-500 mt-0.5">Ensure your medical practitioner account stays protected.</p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Current Password</label>
                  <input type="password" required placeholder="••••••••" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 text-slate-800 transition-all shadow-inner" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">New Password</label>
                  <input type="password" required placeholder="Minimum 6 characters" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full bg-slate-50/80 border border-slate-200/80 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 text-slate-800 transition-all shadow-inner" />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={passLoading} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 shadow-md shadow-emerald-600/20 active:scale-98">
                    {passLoading ? "Updating Security..." : "Save New Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Mood Analytics Dashboard Modal Popup */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-md font-extrabold text-emerald-700">📊 Mood Analytics Dashboard</h2>
                <p className="text-xs text-slate-500 mt-0.5">Tracking clinical markers and well-being for <span className="text-slate-900 font-bold">{activePatientName}</span></p>
              </div>
              <button onClick={() => setShowChartModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center text-sm font-bold text-slate-500 transition-colors">✕</button>
            </div>

            {chartLoading ? (
              <p className="text-xs text-slate-400 text-center py-20">Extracting clinical markers from AI dataset...</p>
            ) : chartData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-20">No mood log data found for this patient yet.</p>
            ) : (
              <div className="w-full h-80 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Neutral" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Stress" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Anxiety" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Depression" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Critical" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            <div className="text-right">
              <button onClick={() => setShowChartModal(false)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-500 text-xl shadow-inner">🚪</div>
              <div><h3 className="text-sm font-extrabold text-slate-800">Confirm Logout</h3><p className="text-xs text-slate-500">End your medical portal session?</p></div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowLogoutModal(false)} className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors">Cancel</button>
              <button type="button" onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition-all">Logout Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
//   DOCTOR CLINICAL MESSAGING PORTAL
// =========================================================================
function DoctorClinicalChatSection({ coreAppointments, docInfo, TOKEN }) {
  const [activeChannel, setActiveChannel] = useState(null);
  const [chatLog, setChatLog] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const chatBottomRef = useRef(null);

  const patientDirectory = [];
  const map = new Map();
  
  coreAppointments.forEach(app => {
    if (app.patientId && (app.patientId._id || app.patientId.id) && !map.has(app.patientId._id || app.patientId.id)) {
      const pKey = app.patientId._id || app.patientId.id;
      map.set(pKey, true);
      patientDirectory.push({
        _id: pKey,
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
    <div className="flex-1 flex min-h-0 bg-white border border-slate-200/80 m-6 rounded-3xl overflow-hidden shadow-xs">
      <div className="w-80 bg-slate-50/50 border-r border-slate-200/80 flex flex-col">
        <div className="p-4 border-b border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Channeled Patients</span>
          <input type="text" placeholder="Search patient name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-all shadow-2xs" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredPatients.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-10 italic">No active patients found in channeling memory.</p>
          ) : (
            filteredPatients.map((pat, idx) => {
              const isSelected = activeChannel && (activeChannel._id === pat._id);
              return (
                <button key={idx} onClick={() => setActiveChannel(pat)} className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${isSelected ? 'bg-emerald-50/80 border border-emerald-200/80 shadow-xs' : 'hover:bg-slate-100/70 border border-transparent'}`}>
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shadow-inner">{pat.name?.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{pat.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{pat.email}</p>
                  </div>
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
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-3 py-0.5 rounded-full">● Live Sync</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatLog.map((msg, i) => {
                const isMe = msg.senderId === docInfo.id || msg.senderId === 'doctor';
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                    <div className={`max-w-[70%] px-4.5 py-3.5 rounded-2xl shadow-xs ${isMe ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-xs' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'}`}>
                      <p className="text-xs leading-relaxed">{msg.message || msg.messageText}</p>
                      <span className={`text-[8px] block text-right mt-1 font-mono ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={fireMessage} className="p-4 border-t border-slate-200/80 bg-white flex gap-3 items-center">
              <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder={`Write secure message to ${activeChannel.name}...`} className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-inner" />
              <button type="submit" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95">Send </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-xs font-medium">Select an active patient profile from the directory on the left to activate counseling desk.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorDashboard;