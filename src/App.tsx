import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { 
  Home, Search, Ticket, User, Plus, Bell, 
  Calendar, MapPin, Users, CreditCard, 
  ChevronRight, QrCode, Download, CheckCircle,
  LayoutDashboard, Scan, BarChart3, Settings,
  MessageSquare, ShieldCheck, Clock
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- TYPES ---
type Role = 'STUDENT' | 'ORGANIZER' | 'ADMIN' | 'GUEST';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  category: string;
  price: number;
  bannerUrl: string;
  organizer: {
    user: {
      fullName: string;
    }
  };
  capacity: number;
  _count?: {
    bookings: number;
  };
}

// --- COMPONENTS ---

const GlassCard = ({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "bg-[#1E1E2F]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl cursor-pointer",
      className
    )}
  >
    {children}
  </motion.div>
);

const BottomNav = ({ activeTab, setActiveTab, role }: { activeTab: string, setActiveTab: (t: string) => void, role: Role }) => {
  const tabs = {
    STUDENT: [
      { id: 'home', icon: Home, label: 'Home' },
      { id: 'explore', icon: Search, label: 'Explore' },
      { id: 'tickets', icon: Ticket, label: 'Tickets' },
      { id: 'profile', icon: User, label: 'Profile' },
    ],
    ORGANIZER: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Stats' },
      { id: 'events', icon: Calendar, label: 'Events' },
      { id: 'scan', icon: Scan, label: 'Scan' },
      { id: 'profile', icon: User, label: 'Profile' },
    ],
    ADMIN: [
      { id: 'overview', icon: BarChart3, label: 'Admin' },
      { id: 'approvals', icon: ShieldCheck, label: 'Approvals' },
      { id: 'broadcast', icon: Bell, label: 'Alert' },
      { id: 'profile', icon: User, label: 'Profile' },
    ]
  };

  const currentTabs = tabs[role === 'GUEST' ? 'STUDENT' : role as keyof typeof tabs];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-[#1E1E2F]/80 backdrop-blur-2xl border border-white/10 rounded-full p-2 flex justify-around items-center shadow-2xl z-50">
      {currentTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative p-3 rounded-full transition-all duration-300",
              isActive ? "bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6] text-white" : "text-[#B0B0C3] hover:text-white"
            )}
          >
            <Icon size={24} />
            {isActive && (
              <motion.div 
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full bg-white/10"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

// --- PAGES ---

const HomePage = ({ role, onEventClick }: { role: Role, onEventClick: (e: Event) => void }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const stats = [
    { label: 'Active Events', value: events.length.toString(), icon: Calendar },
    { label: 'Total Students', value: '1.2k', icon: Users },
    { label: 'Revenue', value: '₹45k', icon: CreditCard },
  ];

  return (
    <div className="p-6 pb-32 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome, {role === 'GUEST' ? 'Guest' : 'Student'}!</h1>
          <p className="text-[#B0B0C3]">Explore what's happening in your college.</p>
        </div>
        <div className="p-2 bg-[#1E1E2F] rounded-full border border-white/10">
          <Bell size={20} className="text-[#FFD369]" />
        </div>
      </header>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <GlassCard key={i} className="p-3 text-center">
            <stat.icon size={18} className="mx-auto mb-1 text-[#8B5CF6]" />
            <div className="text-lg font-bold text-white">{stat.value}</div>
            <div className="text-[10px] text-[#B0B0C3] uppercase tracking-wider">{stat.label}</div>
          </GlassCard>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Upcoming Events</h2>
          <button className="text-sm text-[#8B5CF6]">View All</button>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-white/5 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <GlassCard key={event.id} onClick={() => onEventClick(event)}>
                <div className="relative h-40 rounded-xl overflow-hidden mb-4">
                  <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white">
                    {event.category}
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white">{event.title}</h3>
                    <div className="flex items-center text-sm text-[#B0B0C3] mt-1">
                      <MapPin size={14} className="mr-1" /> {event.venue}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#FFD369]">₹{event.price}</div>
                    <div className="text-xs text-[#B0B0C3]">{event.date.split('T')[0]}</div>
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

const EventDetails = ({ event, onBack }: { event: Event, onBack: () => void }) => {
  const [isBooking, setIsBooking] = useState(false);

  const handleBooking = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to book tickets');
      return;
    }

    setIsBooking(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ eventId: event.id })
      });

      if (res.ok) {
        alert('Booking Successful! Ticket generated.');
        onBack();
      } else {
        const data = await res.json();
        alert(data.error || 'Booking failed');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-[#0F0F1B] z-[60] overflow-y-auto"
    >
      <div className="relative h-80">
        <img src={event.bannerUrl} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F1B] to-transparent" />
        <button 
          onClick={onBack}
          className="absolute top-12 left-6 p-2 bg-black/50 backdrop-blur-md rounded-full text-white"
        >
          <ChevronRight className="rotate-180" />
        </button>
      </div>

      <div className="px-6 -mt-12 relative z-10 space-y-6 pb-32">
        <GlassCard className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-xs font-bold text-[#8B5CF6] uppercase tracking-widest">{event.category}</span>
              <h1 className="text-3xl font-bold text-white mt-1">{event.title}</h1>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#FFD369]">₹{event.price}</div>
              <div className="text-sm text-[#B0B0C3]">Per Person</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#8B5CF6]/10 rounded-lg">
                <Calendar size={20} className="text-[#8B5CF6]" />
              </div>
              <div>
                <div className="text-xs text-[#B0B0C3]">Date</div>
                <div className="text-sm font-medium text-white">{new Date(event.date).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#8B5CF6]/10 rounded-lg">
                <MapPin size={20} className="text-[#8B5CF6]" />
              </div>
              <div>
                <div className="text-xs text-[#B0B0C3]">Venue</div>
                <div className="text-sm font-medium text-white">{event.venue}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Users size={20} className="text-emerald-500" />
              </div>
              <div>
                <div className="text-xs text-[#B0B0C3]">Bookings</div>
                <div className="text-sm font-medium text-white">{event._count?.bookings || 0} / {event.capacity}</div>
              </div>
            </div>
            <div className="h-2 flex-1 mx-4 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500" 
                style={{ width: `${Math.min(100, ((event._count?.bookings || 0) / event.capacity) * 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-2">About Event</h3>
            <p className="text-[#B0B0C3] leading-relaxed">{event.description}</p>
          </div>

          <div className="mt-6 flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6] flex items-center justify-center text-white font-bold">
                {event.organizer.user.fullName?.[0] || 'O'}
              </div>
              <div>
                <div className="text-xs text-[#B0B0C3]">Organizer</div>
                <div className="text-sm font-medium text-white">{event.organizer.user.fullName || 'Organizer'}</div>
              </div>
            </div>
            <button className="text-[#8B5CF6] text-sm font-medium">Contact</button>
          </div>
        </GlassCard>

        <div className="fixed bottom-8 left-6 right-6 flex space-x-4">
          <button 
            onClick={handleBooking}
            disabled={isBooking}
            className="flex-1 bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#6C63FF]/20 disabled:opacity-50"
          >
            {isBooking ? 'Processing...' : 'Book Now'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const OrganizerDashboard = ({ onCreateEvent }: { onCreateEvent: () => void }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/organizer/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 pb-32 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white">Organizer Dashboard</h1>
        <p className="text-[#B0B0C3]">Real-time event performance.</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-white/5 animate-pulse rounded-2xl" />
          <div className="h-24 bg-white/5 animate-pulse rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-4 bg-gradient-to-br from-[#6C63FF]/20 to-transparent">
            <Users className="text-[#6C63FF] mb-2" />
            <div className="text-2xl font-bold text-white">{stats?.totalRegistrations || 0}</div>
            <div className="text-xs text-[#B0B0C3]">Total Registrations</div>
          </GlassCard>
          <GlassCard className="p-4 bg-gradient-to-br from-[#FFD369]/20 to-transparent">
            <CreditCard className="text-[#FFD369] mb-2" />
            <div className="text-2xl font-bold text-white">₹{stats?.totalRevenue || 0}</div>
            <div className="text-xs text-[#B0B0C3]">Total Revenue</div>
          </GlassCard>
        </div>
      )}

      <GlassCard className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">Recent Attendance</h3>
          <BarChart3 size={20} className="text-[#B0B0C3]" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-slate-700" />
                <div>
                  <div className="text-sm font-medium text-white">Student Name {i}</div>
                  <div className="text-xs text-[#B0B0C3]">TechX 2024 • 10:45 AM</div>
                </div>
              </div>
              <CheckCircle size={20} className="text-emerald-500" />
            </div>
          ))}
        </div>
      </GlassCard>

      <button 
        onClick={onCreateEvent}
        className="w-full bg-white/5 border border-dashed border-white/20 text-[#B0B0C3] py-4 rounded-2xl flex items-center justify-center space-x-2 hover:bg-white/10 transition-all"
      >
        <Plus size={20} />
        <span>Create New Event</span>
      </button>
    </div>
  );
};

const CreateEventModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    venue: '',
    category: 'Technical',
    capacity: 100,
    price: 0,
    bannerUrl: ''
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsUploading(true);
    // Simulate upload
    setTimeout(() => {
      const seed = Math.random().toString(36).substring(7);
      setFormData(prev => ({ ...prev, bannerUrl: `https://picsum.photos/seed/${seed}/1200/600` }));
      setIsUploading(false);
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert('Event submitted for admin approval!');
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create event');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-[100] bg-[#0F0F1B] p-6 overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">Create Event</h2>
            <button onClick={onClose} className="text-[#B0B0C3]"><ChevronRight className="rotate-90" /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 pb-12">
            <div className="space-y-2">
              <label className="text-sm text-[#B0B0C3]">Event Banner</label>
              <div className="relative h-48 bg-white/5 rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center overflow-hidden">
                {formData.bannerUrl ? (
                  <img src={formData.bannerUrl} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Plus className="text-[#B0B0C3] mb-2" />
                    <span className="text-xs text-[#B0B0C3]">{isUploading ? 'Uploading...' : 'Upload Image'}</span>
                  </>
                )}
                <input 
                  type="file" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#B0B0C3]">Title</label>
              <input 
                required
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                placeholder="Event name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-[#B0B0C3]">Date</label>
                <input 
                  required
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[#B0B0C3]">Category</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                >
                  <option>Technical</option>
                  <option>Cultural</option>
                  <option>Sports</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#B0B0C3]">Venue</label>
              <input 
                required
                value={formData.venue}
                onChange={e => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                placeholder="Location"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-[#B0B0C3]">Capacity</label>
                <input 
                  type="number"
                  value={formData.capacity}
                  onChange={e => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[#B0B0C3]">Price (₹)</label>
                <input 
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#B0B0C3]">Description</label>
              <textarea 
                required
                rows={4}
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none"
                placeholder="What is this event about?"
              />
            </div>

            <button className="w-full bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white font-bold py-4 rounded-2xl shadow-lg">
              Submit for Approval
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ProfilePage = ({ role, user }: { role: Role, user: any }) => {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(role === 'ORGANIZER');

  useEffect(() => {
    if (role === 'ORGANIZER') {
      const token = localStorage.getItem('token');
      fetch('/api/organizer/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setProfileData(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [role]);

  const handleTaskStatus = async (taskId: string, status: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/organizer/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      // Refresh data
      const res = await fetch('/api/organizer/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProfileData(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 pb-32 space-y-8">
      <header className="text-center">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6] p-1 mx-auto">
            <div className="w-full h-full rounded-full bg-[#0F0F1B] flex items-center justify-center">
              <User size={40} className="text-white" />
            </div>
          </div>
          <button className="absolute bottom-0 right-0 p-2 bg-[#8B5CF6] rounded-full text-white border-2 border-[#0F0F1B]">
            <Plus size={16} />
          </button>
        </div>
        <h2 className="text-2xl font-bold text-white mt-4">{user.fullName}</h2>
        <p className="text-[#B0B0C3]">{user.collegeName} • {role}</p>
        
        {role === 'ORGANIZER' && profileData?.admin && (
          <div className="mt-2 inline-flex items-center px-3 py-1 bg-white/5 rounded-full text-xs text-[#B0B0C3]">
            <ShieldCheck size={12} className="mr-1 text-[#8B5CF6]" />
            Assigned by: {profileData.admin.user.fullName}
          </div>
        )}
      </header>

      {role === 'ORGANIZER' && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Clock size={18} className="mr-2 text-[#FFD369]" />
            Assigned Tasks
          </h3>
          {loading ? (
            <div className="h-20 bg-white/5 animate-pulse rounded-2xl" />
          ) : (
            <div className="space-y-3">
              {profileData?.organizer.tasks.map((task: any) => (
                <GlassCard key={task.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className={cn("text-sm font-medium", task.status === 'COMPLETED' ? "text-[#B0B0C3] line-through" : "text-white")}>
                      {task.title}
                    </div>
                    <div className="text-[10px] text-[#B0B0C3] mt-1">Deadline: {new Date(task.deadline).toLocaleDateString()}</div>
                  </div>
                  {task.status === 'PENDING' ? (
                    <button 
                      onClick={() => handleTaskStatus(task.id, 'COMPLETED')}
                      className="text-[10px] font-bold text-[#8B5CF6] uppercase tracking-wider px-3 py-1 bg-[#8B5CF6]/10 rounded-full"
                    >
                      Mark Done
                    </button>
                  ) : (
                    <CheckCircle size={18} className="text-emerald-500" />
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="space-y-4">
        <GlassCard className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><User size={20} /></div>
            <span className="text-white">Personal Information</span>
          </div>
          <ChevronRight size={20} className="text-[#B0B0C3]" />
        </GlassCard>
        {role === 'STUDENT' && (
          <>
            <GlassCard className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><Ticket size={20} /></div>
                <span className="text-white">My Bookings</span>
              </div>
              <ChevronRight size={20} className="text-[#B0B0C3]" />
            </GlassCard>
            <GlassCard className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Download size={20} /></div>
                <span className="text-white">Certificates</span>
              </div>
              <ChevronRight size={20} className="text-[#B0B0C3]" />
            </GlassCard>
          </>
        )}
        <GlassCard className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-500"><Settings size={20} /></div>
            <span className="text-white">Settings</span>
          </div>
          <ChevronRight size={20} className="text-[#B0B0C3]" />
        </GlassCard>
      </div>

      <button className="w-full py-4 text-red-500 font-semibold">Logout</button>
    </div>
  );
};

const AIChat = ({ isOpen, onClose, socket, user }: { isOpen: boolean, onClose: () => void, socket: Socket | null, user: any }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I am COLLEVENTO AI. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!socket) return;

    socket.on('chat:response', (data: { message: string }) => {
      setMessages(prev => [...prev, { role: 'assistant', text: data.message }]);
    });

    return () => {
      socket.off('chat:response');
    };
  }, [socket]);

  const handleSend = () => {
    if (!input.trim() || !socket || !user) return;
    
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');

    socket.emit('chat:message', { 
      userId: user.id,
      message: userMessage 
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed inset-0 z-[100] bg-[#0F0F1B] flex flex-col"
        >
          <header className="p-6 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6] flex items-center justify-center">
                <MessageSquare className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">COLLEVENTO AI</h2>
                <div className="flex items-center text-xs text-emerald-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                  Online
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-[#B0B0C3] hover:text-white">
              <ChevronRight className="rotate-90" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={cn(
                "max-w-[80%] p-4 rounded-2xl",
                m.role === 'user' 
                  ? "ml-auto bg-[#6C63FF] text-white rounded-tr-none" 
                  : "bg-[#1E1E2F] text-[#B0B0C3] rounded-tl-none border border-white/5"
              )}>
                {m.text}
              </div>
            ))}
          </div>

          <div className="p-6 bg-[#1E1E2F]/50 backdrop-blur-xl border-t border-white/10">
            <div className="flex space-x-4">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask anything..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#6C63FF]"
              />
              <button 
                onClick={handleSend}
                className="p-3 bg-[#6C63FF] rounded-xl text-white"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- MAIN APP ---

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);
    return () => { newSocket.close(); };
  }, []);

  const handleLogin = async (role: Role) => {
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const [activeTab, setActiveTab] = useState('home');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F0F1B] flex flex-col items-center justify-center p-8 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-12"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6] rounded-3xl rotate-12 flex items-center justify-center shadow-2xl shadow-[#6C63FF]/40 mx-auto">
            <QrCode size={48} className="text-white -rotate-12" />
          </div>
          <h1 className="text-4xl font-black text-white mt-8 tracking-tighter">COLLEVENTO</h1>
          <p className="text-[#B0B0C3] mt-2">Premium College Event Platform</p>
        </motion.div>

        <div className="w-full max-w-xs space-y-4">
          <button 
            onClick={() => handleLogin('STUDENT')}
            className="w-full py-4 bg-gradient-to-r from-[#6C63FF] to-[#8B5CF6] text-white font-bold rounded-2xl shadow-lg"
          >
            Continue as Student
          </button>
          <button 
            onClick={() => handleLogin('ORGANIZER')}
            className="w-full py-4 bg-[#1E1E2F] text-white font-bold rounded-2xl border border-white/10"
          >
            Organizer Login
          </button>
          <button 
            onClick={() => handleLogin('GUEST')}
            className="text-[#B0B0C3] text-sm font-medium hover:text-white transition-colors"
          >
            Explore as Guest
          </button>
        </div>
      </div>
    );
  }

  const role = user.role as Role;

  return (
    <div className="min-h-screen bg-[#0F0F1B] text-white font-sans selection:bg-[#6C63FF]/30">
      <main className="max-w-md mx-auto min-h-screen relative">
        {activeTab === 'home' && <HomePage role={role} onEventClick={setSelectedEvent} />}
        {activeTab === 'dashboard' && <OrganizerDashboard onCreateEvent={() => setIsCreateEventOpen(true)} />}
        {activeTab === 'profile' && <ProfilePage role={role} user={user} />}
        
        {/* Placeholder for other tabs */}
        {['explore', 'tickets', 'events', 'scan', 'overview', 'approvals', 'broadcast'].includes(activeTab) && (
          <div className="p-6 flex flex-col items-center justify-center h-[80vh] text-center space-y-4">
            <Clock size={48} className="text-[#B0B0C3]" />
            <h2 className="text-xl font-bold">Coming Soon</h2>
            <p className="text-[#B0B0C3]">This feature is being finalized for production.</p>
          </div>
        )}

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} role={role} />

        <AnimatePresence>
          {selectedEvent && (
            <EventDetails event={selectedEvent} onBack={() => setSelectedEvent(null)} />
          )}
        </AnimatePresence>

        <CreateEventModal isOpen={isCreateEventOpen} onClose={() => setIsCreateEventOpen(false)} />

        <button 
          onClick={() => setIsAIChatOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-[#6C63FF] to-[#8B5CF6] rounded-2xl flex items-center justify-center shadow-xl shadow-[#6C63FF]/30 z-40"
        >
          <MessageSquare className="text-white" />
        </button>

        <AIChat isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} socket={socket} user={user} />
      </main>
    </div>
  );
}
