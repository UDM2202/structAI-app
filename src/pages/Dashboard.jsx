import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FiHome, 
  FiFolder, 
  FiFileText, 
  FiSettings, 
  FiHelpCircle,
  FiLogOut,
  FiPlus,
  FiBell,
  FiUser,
  FiBarChart2,
  FiCpu
} from 'react-icons/fi';

const Dashboard = () => {
  // Mock user for placeholder
  const user = {
    name: 'John Andrews',
    email: 'john@example.com',
    avatar: 'JA'
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-[#e5e7eb] flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[#e5e7eb]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#0A2F44] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SA</span>
            </div>
            <span className="font-bold text-[#04131b]">StructAI</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {[
            { icon: FiHome, label: 'Dashboard', active: true },
            { icon: FiFolder, label: 'Projects', active: false },
            { icon: FiFileText, label: 'Reports', active: false },
            { icon: FiSettings, label: 'Settings', active: false },
            { icon: FiHelpCircle, label: 'Help', active: false },
          ].map((item, index) => (
            <a
              key={index}
              href="#"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                item.active 
                  ? 'bg-[#e6f0f5] text-[#0A2F44]' 
                  : 'text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#374151]'
              }`}
            >
              <item.icon className="text-lg" />
              <span className="font-medium">{item.label}</span>
            </a>
          ))}
        </nav>

        {/* User profile */}
        <div className="p-4 border-t border-[#e5e7eb]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#0A2F44] rounded-lg flex items-center justify-center text-white font-semibold">
              {user.avatar}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#374151]">{user.name}</p>
              <p className="text-xs text-[#6b7280]">{user.email}</p>
            </div>
            <button className="text-[#6b7280] hover:text-[#0A2F44]">
              <FiLogOut />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-[#e5e7eb] px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#02090d]">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <button className="relative text-[#6b7280] hover:text-[#0A2F44]">
                <FiBell className="text-xl" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#2E7D32] text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </button>
              <button className="flex items-center space-x-2 bg-[#0A2F44] text-white px-4 py-2 rounded-lg hover:bg-[#082636] transition-colors">
                <FiPlus />
                <span>New Project</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 p-8 overflow-y-auto">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: 'Total Projects', value: '12', change: '+2 this month', icon: FiFolder, color: 'bg-[#e6f0f5] text-[#0A2F44]' },
              { label: 'Optimisation Runs', value: '47', change: '+12 this week', icon: FiCpu, color: 'bg-[#e8f5e9] text-[#2E7D32]' },
              { label: 'Carbon Saved', value: '3.2t', change: '≈ 24% reduction', icon: FiBarChart2, color: 'bg-[#f3f4f6] text-[#374151]' },
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-[#e5e7eb]">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <stat.icon className="text-xl" />
                  </div>
                  <span className="text-sm text-[#6b7280]">{stat.change}</span>
                </div>
                <p className="text-3xl font-bold text-[#02090d]">{stat.value}</p>
                <p className="text-[#6b7280] text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Recent projects placeholder */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-[#e5e7eb]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#02090d]">Recent Projects</h2>
              <Link to="/projects" className="text-sm text-[#0A2F44] hover:underline">View all</Link>
            </div>
            
            <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-12 text-center">
              <FiFolder className="text-4xl text-[#d1d5db] mx-auto mb-3" />
              <p className="text-[#6b7280] font-medium">🚧 Projects dashboard coming in Phase 2</p>
              <p className="text-sm text-[#9ca3af] mt-2">We'll display your recent projects and stats here</p>
              <button className="mt-4 bg-[#0A2F44] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#082636] inline-flex items-center">
                <FiPlus className="mr-2" /> Create your first project
              </button>
            </div>
          </div>

          {/* Development notice */}
          <div className="mt-6 bg-[#e6f0f5] border border-[#cce1eb] rounded-lg p-4">
            <p className="text-sm text-[#082636]">
              <span className="font-semibold">🔧 Development Mode:</span> This dashboard is a placeholder. 
              Full functionality coming in Phase 2 (Workspace & Project Management).
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;