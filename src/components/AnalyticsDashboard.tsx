import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { Users, TrendingUp, Activity, Calendar } from 'lucide-react';

const COLORS = ['#6C63FF', '#FFD369', '#FF6B6B', '#4ECDC4'];

export const AnalyticsDashboard = ({ data }: { data: any }) => {
  // Mocking some engagement data if not present
  const engagementData = [
    { name: 'Mon', views: 400, clicks: 240 },
    { name: 'Tue', views: 300, clicks: 139 },
    { name: 'Wed', views: 200, clicks: 980 },
    { name: 'Thu', views: 278, clicks: 390 },
    { name: 'Fri', views: 189, clicks: 480 },
    { name: 'Sat', views: 239, clicks: 380 },
    { name: 'Sun', views: 349, clicks: 430 },
  ];

  const attendanceData = data.events.map((e: any) => ({
    name: e.title.substring(0, 10),
    bookings: e._count.bookings,
    capacity: e.capacity
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4 border border-white/5">
          <div className="flex items-center space-x-2 text-[#6C63FF] mb-2">
            <Activity size={16} />
            <span className="text-[10px] uppercase font-bold tracking-wider">Engagement</span>
          </div>
          <div className="text-2xl font-black text-white">+24%</div>
          <div className="text-[10px] text-[#B0B0C3]">vs last week</div>
        </div>
        <div className="glass-card p-4 border border-white/5">
          <div className="flex items-center space-x-2 text-[#FFD369] mb-2">
            <TrendingUp size={16} />
            <span className="text-[10px] uppercase font-bold tracking-wider">Growth</span>
          </div>
          <div className="text-2xl font-black text-white">1.2k</div>
          <div className="text-[10px] text-[#B0B0C3]">new users</div>
        </div>
      </div>

      <div className="glass-card p-6 border border-white/5 h-64">
        <h3 className="text-sm font-bold text-white mb-4">Attendance Overview</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={attendanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#B0B0C3" fontSize={10} />
            <YAxis stroke="#B0B0C3" fontSize={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Bar dataKey="bookings" fill="#6C63FF" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-6 border border-white/5 h-64">
        <h3 className="text-sm font-bold text-white mb-4">Platform Engagement</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={engagementData}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#B0B0C3" fontSize={10} />
            <YAxis stroke="#B0B0C3" fontSize={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            />
            <Area type="monotone" dataKey="views" stroke="#6C63FF" fillOpacity={1} fill="url(#colorViews)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
