import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { 
  Home, Search, Ticket, User, Plus, Bell, 
  Calendar, MapPin, Users, CreditCard, 
  ChevronRight, QrCode, Download, CheckCircle,
  LayoutDashboard, Scan, BarChart3, Settings,
  MessageSquare, ShieldCheck, Clock, Phone,
  Mail, School, LogOut, X, Send, Camera,
  FileText, AlertCircle, Filter, ArrowLeft
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from './contexts/AuthContext';
import { Skeleton, EventCardSkeleton, DashboardSkeleton } from './components/Skeleton';
import { AIChatbot } from './components/AIChatbot';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { QRTicket } from './components/QRTicket';
import { cn } from './lib/utils';

// --- TYPES ---
type Role = 'STUDENT' | 'ORGANIZER' | 'ADMIN' | 'GUEST';

interface UserData {
  id: string;
  phone: string;
  email: string;
  name: string;
  college: string;
  role: Role;
}

interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  date: string;
  time: string;
  capacity: number;
  price: number;
  banner_url: string;
  organizer: {
    user: {
      name: string;
    }
  };
  _count?: {
    bookings: number;
  };
}

// --- COMPONENTS ---

const GlassCard = ({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <motion.div 
    whileHover={onClick ? { scale: 1.02 } : {}}
    whileTap={onClick ? { scale: 0.98 } : {}}
    onClick={onClick}
    className={cn(
      "glass-card rounded-2xl p-4 shadow-xl",
      onClick && "cursor-pointer",
      className
    )}
  >
    {children}
  </motion.div>
);

const BottomNav = ({ activeTab, setActiveTab, role }: { activeTab: string, setActiveTab: (t: string) => void, role: Role }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'explore', icon: Search, label: 'Explore' },
    { id: 'tickets', icon: Ticket, label: 'Tickets', roles: ['STUDENT'] },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ORGANIZER', 'ADMIN'] },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const filteredTabs = tabs.filter(t => !t.roles || t.roles.includes(role));

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md glass-card rounded-3xl p-2 flex justify-around items-center z-50">
      {filteredTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative p-3 rounded-2xl transition-all duration-300",
              isActive ? "text-white" : "text-[#B0B0C3] hover:text-white"
            )}
          >
            <tab.icon size={24} />
            {isActive && (
              <motion.div 
                layoutId="nav-active"
                className="absolute inset-0 rounded-2xl gradient-bg -z-10"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

// --- PAGES ---

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { auth } from './lib/firebase';

const AuthFlow = ({ onAuth }: { onAuth: (user: UserData, token: string) => void }) => {
  const [step, setStep] = useState<'login' | 'info' | 'role'>('login');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [role, setRole] = useState<Role>('STUDENT');
  const [adminCode, setAdminCode] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthAction = async () => {
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        setStep('info');
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // After firebase login, we still need to get the backend token/user data
        // For this demo, we'll assume the backend can verify the firebase token or we just use email as identifier
        const res = await fetch('/api/auth/otp/verify', { // Reusing verify endpoint for simplicity in this demo
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: email, otp: '0808' }) // Mocking OTP verification since we used Firebase
        });
        const data = await res.json();
        if (data.user) {
          onAuth(data.user, data.token);
        } else {
          setStep('info');
        }
      }
    } catch (e: any) {
      alert(e.message);
    }
    setLoading(false);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: email, otp: '0808', name, email, college, role, adminCode, orgCode })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onAuth(data.user, data.token);
    } catch (e: any) {
      alert(e.message);
    }
    setLoading(false);
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
      const res = await fetch('/api/auth/guest', { method: 'POST' });
      const data = await res.json();
      onAuth(data.user, data.token);
    } catch (e) {
      alert('Guest login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0F0F1B]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center">
          <div className="w-20 h-20 gradient-bg rounded-3xl rotate-12 flex items-center justify-center shadow-2xl shadow-[#6C63FF]/40 mx-auto mb-6">
            <QrCode size={40} className="text-white -rotate-12" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">COLLEVENTO</h1>
          <p className="text-[#B0B0C3] mt-2">Premium College Event Platform</p>
        </div>

        <GlassCard className="p-6 space-y-6">
          {step === 'login' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-[#B0B0C3]">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0B0C3]" size={18} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-[#6C63FF] transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[#B0B0C3]">Password</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0B0C3]" size={18} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-[#6C63FF] transition-all"
                  />
                </div>
              </div>
              <button 
                onClick={handleAuthAction}
                disabled={loading || !email || !password}
                className="w-full py-4 gradient-bg text-white font-bold rounded-xl shadow-lg shadow-[#6C63FF]/20 disabled:opacity-50"
              >
                {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-sm text-[#B0B0C3] hover:text-white transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </button>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#1A1A2E] px-2 text-[#B0B0C3]">Or</span></div>
              </div>
              <button 
                onClick={handleGuest}
                className="w-full py-4 bg-white/5 text-[#B0B0C3] font-bold rounded-xl border border-white/10"
              >
                Continue as Guest
              </button>
            </div>
          )}

          {step === 'info' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-[#B0B0C3]">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#6C63FF]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[#B0B0C3]">College Name</label>
                <input 
                  type="text" 
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#6C63FF]"
                />
              </div>
              <button 
                onClick={() => setStep('role')}
                disabled={!name || !college}
                className="w-full py-4 gradient-bg text-white font-bold rounded-xl shadow-lg shadow-[#6C63FF]/20"
              >
                Next
              </button>
              <button onClick={() => setStep('login')} className="w-full text-sm text-[#B0B0C3]">Back</button>
            </div>
          )}

          {step === 'role' && (
            <div className="space-y-4">
              <label className="text-sm text-[#B0B0C3]">Select Your Role</label>
              <div className="grid grid-cols-1 gap-3">
                {(['STUDENT', 'ORGANIZER', 'ADMIN'] as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={cn(
                      "w-full py-4 rounded-xl border font-bold transition-all",
                      role === r 
                        ? "gradient-bg text-white border-transparent" 
                        : "bg-white/5 text-[#B0B0C3] border-white/10"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {role === 'ADMIN' && (
                <div className="space-y-2 mt-4">
                  <label className="text-sm text-[#B0B0C3]">Admin Access Code</label>
                  <input 
                    type="password" 
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#6C63FF]"
                  />
                </div>
              )}
              {role === 'ORGANIZER' && (
                <div className="space-y-2 mt-4">
                  <label className="text-sm text-[#B0B0C3]">Organizer Registration Code</label>
                  <input 
                    type="text" 
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value)}
                    placeholder="Enter code from Admin"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#6C63FF]"
                  />
                </div>
              )}
              <button 
                onClick={handleComplete}
                disabled={loading || (role === 'ADMIN' && !adminCode) || (role === 'ORGANIZER' && !orgCode)}
                className="w-full py-4 gradient-bg text-white font-bold rounded-xl shadow-lg shadow-[#6C63FF]/20"
              >
                {loading ? 'Creating Account...' : 'Complete Sign Up'}
              </button>
              <button onClick={() => setStep('info')} className="w-full text-sm text-[#B0B0C3]">Back</button>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};

const HomePage = ({ onEventClick }: { onEventClick: (e: Event) => void }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 pb-32 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Discover Events</h1>
          <p className="text-[#B0B0C3]">Experience the best of college life.</p>
        </div>
        <button className="p-3 glass-card rounded-full">
          <Bell size={20} className="text-[#FFD369]" />
        </button>
      </header>

      <div className="flex space-x-4 overflow-x-auto no-scrollbar pb-2">
        {['All', 'Technical', 'Cultural', 'Sports', 'Workshops'].map((cat) => (
          <button key={cat} className="px-6 py-2 glass-card rounded-full text-sm whitespace-nowrap hover:gradient-bg hover:text-white transition-all">
            {cat}
          </button>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Upcoming Events</h2>
          <button className="text-sm text-[#6C63FF]">See All</button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <EventCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <GlassCard key={event.id} onClick={() => onEventClick(event)} className="p-0 overflow-hidden">
                <div className="relative h-48">
                  <img src={event.banner_url || `https://picsum.photos/seed/${event.id}/800/400`} className="w-full h-full object-cover" />
                  <div className="absolute top-4 right-4 px-3 py-1 glass-card rounded-full text-xs font-bold text-white">
                    {event.category}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-white">{event.title}</h3>
                    <div className="text-[#FFD369] font-bold">₹{event.price}</div>
                  </div>
                  <div className="flex items-center text-sm text-[#B0B0C3]">
                    <MapPin size={14} className="mr-1" /> {event.venue}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center text-xs text-[#B0B0C3]">
                      <Calendar size={14} className="mr-1" /> {new Date(event.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-[#B0B0C3]">
                      {event._count?.bookings || 0} / {event.capacity} Registered
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const EventDetails = ({ event, onBack, user }: { event: Event, onBack: () => void, user: UserData }) => {
  const [loading, setLoading] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleBookClick = () => {
    if (user.role === 'GUEST') {
      alert('Please sign up to book events');
      return;
    }
    setIsPaymentModalOpen(true);
  };

  return (
    <>
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed inset-0 bg-[#0F0F1B] z-[60] overflow-y-auto"
      >
        <div className="relative h-80">
          <img src={event.banner_url || `https://picsum.photos/seed/${event.id}/800/400`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F1B] to-transparent" />
          <button onClick={onBack} className="absolute top-8 left-6 p-3 glass-card rounded-full text-white">
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="px-6 -mt-12 relative z-10 space-y-6 pb-32">
          <GlassCard className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-[#6C63FF] uppercase tracking-widest">{event.category}</span>
                <h1 className="text-3xl font-black text-white mt-1">{event.title}</h1>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-[#FFD369]">₹{event.price}</div>
                <div className="text-xs text-[#B0B0C3]">Per Ticket</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 py-6 border-y border-white/5">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#6C63FF]/10 rounded-xl text-[#6C63FF]"><Calendar size={20} /></div>
                <div>
                  <div className="text-[10px] text-[#B0B0C3] uppercase">Date</div>
                  <div className="text-sm font-bold text-white">{new Date(event.date).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#6C63FF]/10 rounded-xl text-[#6C63FF]"><Clock size={20} /></div>
                <div>
                  <div className="text-[10px] text-[#B0B0C3] uppercase">Time</div>
                  <div className="text-sm font-bold text-white">{event.time}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Description</h3>
              <p className="text-[#B0B0C3] text-sm leading-relaxed">{event.description}</p>
            </div>

            <div className="mt-8 flex items-center justify-between p-4 bg-white/5 rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center font-bold">
                  {event.organizer.user.name[0]}
                </div>
                <div>
                  <div className="text-[10px] text-[#B0B0C3]">Organizer</div>
                  <div className="text-sm font-bold text-white">{event.organizer.user.name}</div>
                </div>
              </div>
              <button className="text-[#6C63FF] text-sm font-bold">Contact</button>
            </div>
          </GlassCard>

          <button 
            onClick={handleBookClick}
            className="w-full py-5 gradient-bg text-white font-black text-lg rounded-2xl shadow-2xl shadow-[#6C63FF]/30"
          >
            Book Now
          </button>
        </div>
      </motion.div>

      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        event={event} 
        onSuccess={() => {
          setIsPaymentModalOpen(false);
          onBack();
        }}
      />
    </>
  );
};

const PaymentModal = ({ isOpen, onClose, event, onSuccess }: { isOpen: boolean, onClose: () => void, event: Event, onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'qr' | 'upload'>('qr');
  const [file, setFile] = useState<File | null>(null);

  const handleBook = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ event_id: event.id })
      });
      const booking = await res.json();
      
      const formData = new FormData();
      formData.append('booking_id', booking.id);
      if (file) formData.append('proof', file);
      
      await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      alert('Payment submitted! Your ticket will be generated shortly.');
      onSuccess();
    } catch (e) {
      alert('Payment failed');
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <GlassCard className="w-full max-w-sm p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Secure Payment</h2>
              <button onClick={onClose} className="text-[#B0B0C3]"><X size={24} /></button>
            </div>

            {step === 'qr' ? (
              <div className="text-center space-y-6">
                <div className="p-4 bg-white rounded-2xl inline-block">
                  <QrCode size={200} className="text-[#0F0F1B]" />
                </div>
                <div className="space-y-2">
                  <div className="text-lg font-bold text-white">Scan to Pay ₹{event.price}</div>
                  <p className="text-xs text-[#B0B0C3]">Scan the QR code using any UPI app to complete your payment.</p>
                </div>
                <button 
                  onClick={() => setStep('upload')}
                  className="w-full py-4 gradient-bg text-white font-bold rounded-xl"
                >
                  I have paid
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm text-[#B0B0C3]">Upload Payment Proof (Screenshot)</label>
                  <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-[#6C63FF] transition-colors cursor-pointer relative">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <Camera className="mx-auto text-[#B0B0C3] mb-2" size={32} />
                    <div className="text-xs text-[#B0B0C3]">{file ? file.name : 'Click to take photo or upload'}</div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button onClick={() => setStep('qr')} className="flex-1 py-4 bg-white/5 text-white font-bold rounded-xl">Back</button>
                  <button 
                    onClick={handleBook}
                    disabled={loading || !file}
                    className="flex-[2] py-4 gradient-bg text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Proof'}
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const StudentDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dashboards/student', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="space-y-4 mt-8">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    </div>
  );

  return (
    <div className="p-6 pb-32 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white">My Tickets</h1>
        <p className="text-[#B0B0C3]">Manage your event registrations.</p>
      </header>

      <div className="space-y-6">
        {data.bookings.map((booking: any) => (
          <div key={booking.id} className="space-y-4">
            <GlassCard className="p-0 overflow-hidden">
              <div className="p-4 flex justify-between items-center border-b border-white/5">
                <div>
                  <h3 className="font-bold text-white">{booking.event.title}</h3>
                  <p className="text-xs text-[#B0B0C3]">{new Date(booking.event.date).toLocaleDateString()}</p>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                  booking.status === 'PAID' ? "bg-emerald-500/10 text-emerald-500" : "bg-[#FFD369]/10 text-[#FFD369]"
                )}>
                  {booking.status}
                </div>
              </div>
              {booking.ticket && (
                <div className="p-4 flex items-center justify-between bg-white/5">
                  <div className="flex items-center space-x-3">
                    <QrCode size={20} className="text-[#6C63FF]" />
                    <span className="text-xs font-mono text-white">{booking.ticket.ticket_code}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setSelectedTicket(booking)}
                      className="p-2 glass-card rounded-lg text-[#6C63FF]"
                    >
                      <QrCode size={18} />
                    </button>
                    <a 
                      href={booking.ticket.pdf_url} 
                      target="_blank" 
                      className="p-2 glass-card rounded-lg text-[#6C63FF]"
                    >
                      <Download size={18} />
                    </a>
                  </div>
                </div>
              )}
            </GlassCard>
            
            {selectedTicket?.id === booking.id && (
              <QRTicket 
                ticketCode={booking.ticket.ticket_code}
                eventTitle={booking.event.title}
                userName={data.user.name}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const OrganizerDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchDashboard = () => {
    fetch('/api/dashboards/organizer', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(setData);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (!data) return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
      <DashboardSkeleton />
    </div>
  );

  return (
    <div className="p-6 pb-32 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Organizer Panel</h1>
          <p className="text-[#B0B0C3]">Real-time event analytics.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="p-3 gradient-bg rounded-xl text-white shadow-lg"
        >
          <Plus size={20} />
        </button>
      </header>

      <AnalyticsDashboard data={data} />

      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4 bg-gradient-to-br from-[#6C63FF]/20 to-transparent">
          <Users className="text-[#6C63FF] mb-2" />
          <div className="text-2xl font-black text-white">{data.events.reduce((acc: any, curr: any) => acc + curr._count.bookings, 0)}</div>
          <div className="text-[10px] text-[#B0B0C3] uppercase">Total Bookings</div>
        </GlassCard>
        <GlassCard className="p-4 bg-gradient-to-br from-[#FFD369]/20 to-transparent">
          <CreditCard className="text-[#FFD369] mb-2" />
          <div className="text-2xl font-black text-white">₹{data.events.reduce((acc: any, curr: any) => acc + (curr._count.bookings * curr.price), 0)}</div>
          <div className="text-[10px] text-[#B0B0C3] uppercase">Revenue</div>
        </GlassCard>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">My Tasks</h2>
        <div className="space-y-3">
          {data.tasks.length === 0 && <p className="text-sm text-[#B0B0C3]">No tasks assigned yet.</p>}
          {data.tasks.map((task: any) => (
            <GlassCard key={task.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white">{task.title}</h3>
                  <p className="text-xs text-[#B0B0C3] mt-1">{task.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#B0B0C3] block">{new Date(task.deadline).toLocaleDateString()}</span>
                  {task.status === 'PENDING' ? (
                    <button 
                      onClick={async () => {
                        await fetch(`/api/organizer/tasks/${task.id}/complete`, {
                          method: 'PATCH',
                          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                        });
                        fetch('/api/dashboards/organizer', {
                          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                        }).then(res => res.json()).then(setData);
                      }}
                      className="mt-2 px-3 py-1 bg-[#6C63FF]/20 text-[#6C63FF] rounded-full text-[10px] font-bold"
                    >
                      Mark Done
                    </button>
                  ) : (
                    <span className="mt-2 px-3 py-1 bg-emerald-500/20 text-emerald-500 rounded-full text-[10px] font-bold inline-block">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">My Events</h2>
        <div className="space-y-3">
          {data.events.map((event: any) => (
            <GlassCard key={event.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-bold text-white">{event.title}</div>
                <div className="text-[10px] text-[#B0B0C3]">{event._count.bookings} / {event.capacity} Tickets Sold</div>
              </div>
              <div className={cn(
                "px-2 py-1 rounded-md text-[8px] font-bold uppercase",
                event.approved ? "bg-emerald-500/10 text-emerald-500" : "bg-[#FFD369]/10 text-[#FFD369]"
              )}>
                {event.approved ? 'Approved' : 'Pending'}
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <CreateEventModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          fetchDashboard();
        }} 
      />
    </div>
  );
};

const CreateEventModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technical',
    venue: '',
    date: '',
    time: '',
    capacity: '100',
    price: '0'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert('Event created and pending approval!');
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create event');
      }
    } catch (e) {
      alert('Network error');
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="w-full max-w-md glass-card p-6 space-y-6 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Create Event</h2>
              <button onClick={onClose} className="text-[#B0B0C3]"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-[#B0B0C3] uppercase">Title</label>
                <input 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-[#B0B0C3] uppercase">Category</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Sports">Sports</option>
                    <option value="Workshop">Workshop</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[#B0B0C3] uppercase">Venue</label>
                  <input 
                    required
                    value={formData.venue}
                    onChange={e => setFormData({...formData, venue: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-[#B0B0C3] uppercase">Date</label>
                  <input 
                    required
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[#B0B0C3] uppercase">Time</label>
                  <input 
                    required
                    placeholder="e.g. 10:00 AM"
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-[#B0B0C3] uppercase">Capacity</label>
                  <input 
                    required
                    type="number"
                    value={formData.capacity}
                    onChange={e => setFormData({...formData, capacity: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[#B0B0C3] uppercase">Price (₹)</label>
                  <input 
                    required
                    type="number"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[#B0B0C3] uppercase">Description</label>
                <textarea 
                  required
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none resize-none"
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 gradient-bg text-white font-bold rounded-xl shadow-lg"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const fetchData = async () => {
    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    const [s, o, e] = await Promise.all([
      fetch('/api/dashboards/admin', { headers }).then(res => res.json()),
      fetch('/api/admin/organizers', { headers }).then(res => res.json()),
      fetch('/api/admin/events/pending', { headers }).then(res => res.json())
    ]);
    setStats(s);
    setOrganizers(o);
    setPendingEvents(e);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveEvent = async (id: string) => {
    await fetch(`/api/admin/events/${id}/approve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    fetchData();
  };

  const handleRemoveOrg = async (id: string) => {
    if (!confirm('Are you sure you want to remove this organizer?')) return;
    await fetch(`/api/admin/organizers/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    fetchData();
  };

  if (!stats) return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
      <DashboardSkeleton />
    </div>
  );

  return (
    <div className="p-6 pb-32 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Control</h1>
          <p className="text-[#B0B0C3]">Manage your college ecosystem.</p>
        </div>
        <button 
          onClick={() => setIsCodeModalOpen(true)}
          className="p-3 gradient-bg rounded-xl text-white shadow-lg"
        >
          <Plus size={20} />
        </button>
      </header>

      <AnalyticsDashboard data={{ events: pendingEvents }} />

      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4">
          <Users className="text-[#6C63FF] mb-2" />
          <div className="text-2xl font-black text-white">{stats.totalUsers}</div>
          <div className="text-[10px] text-[#B0B0C3] uppercase">Total Users</div>
        </GlassCard>
        <GlassCard className="p-4">
          <Calendar className="text-[#FFD369] mb-2" />
          <div className="text-2xl font-black text-white">{stats.totalEvents}</div>
          <div className="text-[10px] text-[#B0B0C3] uppercase">Total Events</div>
        </GlassCard>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">Pending Approvals ({pendingEvents.length})</h2>
        <div className="space-y-3">
          {pendingEvents.length === 0 && <p className="text-sm text-[#B0B0C3]">No events pending approval.</p>}
          {pendingEvents.map((event: any) => (
            <GlassCard key={event.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white">{event.title}</h3>
                  <p className="text-xs text-[#B0B0C3]">By {event.organizer.user.name}</p>
                </div>
                <span className="text-[#FFD369] font-bold">₹{event.price}</span>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleApproveEvent(event.id)}
                  className="flex-1 py-2 bg-emerald-500/20 text-emerald-500 rounded-lg text-xs font-bold"
                >
                  Approve
                </button>
                <button 
                  onClick={async () => {
                    if (!confirm('Reject this event?')) return;
                    await fetch(`/api/admin/events/${event.id}`, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    fetchData();
                  }}
                  className="flex-1 py-2 bg-red-500/20 text-red-500 rounded-lg text-xs font-bold"
                >
                  Reject
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">My Organizers</h2>
        <div className="space-y-3">
          {organizers.map((org: any) => (
            <GlassCard key={org.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">{org.user.name}</div>
                <div className="text-[10px] text-[#B0B0C3]">{org.user.phone}</div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => {
                    setSelectedOrgId(org.id);
                    setIsTaskModalOpen(true);
                  }}
                  className="p-2 bg-[#6C63FF]/10 text-[#6C63FF] rounded-lg"
                >
                  <BarChart3 size={16} />
                </button>
                <button 
                  onClick={() => handleRemoveOrg(org.id)}
                  className="p-2 bg-red-500/10 text-red-500 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <OrganizerCodeModal isOpen={isCodeModalOpen} onClose={() => setIsCodeModalOpen(false)} />
      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        organizerId={selectedOrgId} 
      />
    </div>
  );
};

const OrganizerCodeModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [college, setCollege] = useState('');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/organizer-codes', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ college, code })
    });
    const data = await res.json();
    setGeneratedCode(data.code);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <GlassCard className="w-full max-w-sm p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Generate Org Code</h2>
              <button onClick={onClose} className="text-[#B0B0C3]"><X size={24} /></button>
            </div>

            {generatedCode ? (
              <div className="text-center space-y-4">
                <div className="text-sm text-[#B0B0C3]">Share this code with the organizer:</div>
                <div className="text-4xl font-black text-white tracking-widest bg-white/5 p-6 rounded-2xl border border-dashed border-[#6C63FF]">
                  {generatedCode}
                </div>
                <button onClick={onClose} className="w-full py-4 gradient-bg text-white font-bold rounded-xl">Done</button>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-[#B0B0C3]">College</label>
                  <input 
                    required
                    value={college}
                    onChange={e => setCollege(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[#B0B0C3]">Custom Code</label>
                  <input 
                    required
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="e.g. IITB-ORG-01"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                  />
                </div>
                <button type="submit" className="w-full py-4 gradient-bg text-white font-bold rounded-xl shadow-lg">Generate</button>
              </form>
            )}
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const TaskModal = ({ isOpen, onClose, organizerId }: { isOpen: boolean, onClose: () => void, organizerId: string | null }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/tasks', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ ...formData, organizer_id: organizerId })
    });
    alert('Task assigned!');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <GlassCard className="w-full max-w-sm p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Assign Task</h2>
              <button onClick={onClose} className="text-[#B0B0C3]"><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-[#B0B0C3]">Title</label>
                <input 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[#B0B0C3]">Deadline</label>
                <input 
                  required
                  type="date"
                  value={formData.deadline}
                  onChange={e => setFormData({...formData, deadline: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[#B0B0C3]">Description</label>
                <textarea 
                  required
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none resize-none"
                />
              </div>
              <button type="submit" className="w-full py-4 gradient-bg text-white font-bold rounded-xl shadow-lg">Assign Task</button>
            </form>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- MAIN APP ---

export default function App() {
  const { user: firebaseUser, loading: authLoading, logout: firebaseLogout } = useAuth();
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user', e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleAuth = (user: UserData, token: string) => {
    setUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const handleLogout = async () => {
    await firebaseLogout();
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F1B] flex items-center justify-center p-8">
        <div className="space-y-6 w-full max-w-sm">
          <Skeleton className="h-20 w-20 rounded-3xl mx-auto" />
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthFlow onAuth={handleAuth} />;
  }

  return (
    <div className="min-h-screen bg-[#0F0F1B] text-white font-sans selection:bg-[#6C63FF]/30">
      <main className="max-w-md mx-auto min-h-screen relative">
        {activeTab === 'home' && <HomePage onEventClick={setSelectedEvent} />}
        {activeTab === 'explore' && <div className="p-8 text-center text-[#B0B0C3]">Explore feature coming soon</div>}
        {activeTab === 'tickets' && <StudentDashboard />}
        {activeTab === 'dashboard' && (user.role === 'ORGANIZER' ? <OrganizerDashboard /> : <AdminDashboard />)}
        {activeTab === 'profile' && (
          <div className="p-6 space-y-8">
            <header className="text-center">
              <div className="w-24 h-24 gradient-bg rounded-full p-1 mx-auto mb-4">
                <div className="w-full h-full rounded-full bg-[#0F0F1B] flex items-center justify-center">
                  <User size={48} className="text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white">{user.name}</h2>
              <p className="text-[#B0B0C3]">{user.college} • {user.role}</p>
            </header>
            <div className="space-y-3">
              <GlassCard className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><ShieldCheck size={20} /></div>
                  <span className="text-sm font-medium">Account Security</span>
                </div>
                <ChevronRight size={18} className="text-[#B0B0C3]" />
              </GlassCard>
              <GlassCard className="flex items-center justify-between p-4" onClick={handleLogout}>
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><LogOut size={20} /></div>
                  <span className="text-sm font-medium">Logout</span>
                </div>
                <ChevronRight size={18} className="text-[#B0B0C3]" />
              </GlassCard>
            </div>
          </div>
        )}

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} role={user.role} />

        <AnimatePresence>
          {selectedEvent && (
            <EventDetails event={selectedEvent} onBack={() => setSelectedEvent(null)} user={user} />
          )}
        </AnimatePresence>

        <AIChatbot />
      </main>
    </div>
  );
}
