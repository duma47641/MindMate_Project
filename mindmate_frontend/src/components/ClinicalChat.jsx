import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function ClinicalChat() {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [myInfo, setMyInfo] = useState({ id: '', role: '' });
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  
  const messagesEndRef = useRef(null);
  const TOKEN = localStorage.getItem('token');

  //  Extracting details (ID and Role) from the token
  useEffect(() => {
    if (!TOKEN) return;
    try {
      const base64Url = TOKEN.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      const core = payload.user || payload;
      setMyInfo({
        id: core.id || core._id,
        role: core.role || 'Patient'
      });
    } catch (error) {
      console.error("Token decoding error in chat module:", error.message);
    }
  }, [TOKEN]);

  // Fetching the list of active contacts for everyone you have chatted with or can chat with
  const fetchContacts = async () => {
    if (!TOKEN) return;
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      
  // 1. Retrieve the people who have already sent messages.
      const resActive = await axios.get('http://localhost:5000/api/messages/contacts', config);
      let list = Array.isArray(resActive.data) ? resActive.data : [];

      if (myInfo.role === 'Patient' && list.length === 0) {
        try {
          const resDocs = await axios.get('http://localhost:5000/api/users/doctors', config);
          if (Array.isArray(resDocs.data)) {
            list = resDocs.data.map(doc => ({
              _id: doc._id || doc.id,
              name: doc.name || 'Medical Officer',
              email: doc.email,
              role: 'Doctor'
            }));
          }
        } catch (err) {
          console.error("Fallback doctors fetch failed:", err.message);
        }
      }

      setContacts(list);
      setFilteredContacts(list);
    } catch (error) {
      console.error("Contacts loading failed:", error.message);
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchChatHistory = async (otherUserId) => {
    if (!TOKEN || !otherUserId) return;
    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const { data } = await axios.get(`http://localhost:5000/api/messages/history/${otherUserId}`, config);
      setMessages(data);
    } catch (error) {
      console.error("Chat loading failed:", error.message);
    }
  };

  // REAL-TIME AUTO POLLING: The chat updates in the background every 3 seconds, mate!
  useEffect(() => {
    fetchContacts();
    
    const contactsInterval = setInterval(() => {
      fetchContacts();
    }, 10000); 

    return () => clearInterval(contactsInterval);
  }, [myInfo.role]);

  useEffect(() => {
    if (!selectedContact) return;

    fetchChatHistory(selectedContact._id);

    const chatInterval = setInterval(() => {
      fetchChatHistory(selectedContact._id);
    }, 3000); 

    return () => clearInterval(chatInterval);
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const results = contacts.filter(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredContacts(results);
  }, [searchTerm, contacts]);

  // Sending a new message (Send Message Function)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedContact) return;

    const msgBody = {
      receiverId: selectedContact._id,
      message: newMessageText.trim()
    };

    try {
      const config = { headers: { Authorization: `Bearer ${TOKEN}` } };
      const { data } = await axios.post('http://localhost:5000/api/messages/send', msgBody, config);
      
      setMessages(prev => [...prev, data]);
      setNewMessageText('');
    } catch (error) {
      console.error("Sending failed:", error.message);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      
      {/*  1. LEFT SIDE PANEL - CONTACTS LIST */}
      <div className="w-80 bg-slate-900/60 border-r border-slate-800/80 flex flex-col h-full">
        {/* Search header */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-900/40 space-y-3">
          <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider">Clinical Consults</h3>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
            <input 
              type="text" 
              placeholder="Search therapist or patient..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>
        </div>

        {/* Contacts scroll area */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {loadingContacts ? (
            <p className="text-[11px] text-slate-500 text-center py-12">Synchronizing roster file...</p>
          ) : filteredContacts.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-12">No active clinic logs found.</p>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact._id}
                onClick={() => setSelectedContact(contact)}
                className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${selectedContact?._id === contact._id ? 'bg-teal-500/10 border-l-4 border-teal-500' : 'hover:bg-slate-800/30'}`}
              >
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-black text-teal-400 text-sm">
                  {contact.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <p className="text-xs font-bold text-slate-200 truncate">{contact.name}</p>
                    <span className="text-[9px] uppercase font-bold text-slate-500 px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800">
                      {contact.role || (myInfo.role === 'Patient' ? 'Doctor' : 'Patient')}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{contact.email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/*  2. RIGHT PANEL - CONVERSATION PORTAL */}
      <div className="flex-1 bg-slate-950 flex flex-col h-full">
        {selectedContact ? (
          <>
            {/* Active Contact Header */}
            <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-900/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center font-bold text-teal-400">
                  {selectedContact.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{selectedContact.name}</h4>
                  <p className="text-[10px] text-teal-400 font-mono">{selectedContact.email}</p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-teal-400 bg-teal-950/40 border border-teal-500/20 px-2.5 py-1 rounded-xl">● Live Sync</span>
            </div>

            {/* Chat Bubble Scroll Window */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-50">
                  <span className="text-3xl"></span>
                  <p className="text-[11px] text-slate-400">No previous messages in logs. Type below to initiate transmission.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === myInfo.id;
                  return (
                    <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-lg ${isMe ? 'bg-teal-600 text-slate-950 font-medium rounded-tr-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'}`}>
                        <p>{msg.message}</p>
                        <div className="flex items-center justify-end gap-1 mt-1.5">
                          <span className="text-[8px] opacity-60 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            <span className="text-[9px]">
                              {msg.read ? '✔️✔️' : '✔️'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Transmission Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800/60 bg-slate-900/30">
              <div className="flex gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1 focus-within:border-teal-500 transition-all">
                <input 
                  type="text" 
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder={`Write secure message to ${selectedContact.name}...`}
                  className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
                <button 
                  type="submit"
                  disabled={!newMessageText.trim()}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-lg text-xs tracking-wider transition-colors"
                >
                  SEND 
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Empty Initial State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shadow-xl"></div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Medical Communication Desk</h3>
              <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed"></p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default ClinicalChat;