// src/components/layout/MainLayout.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiGrid, FiLayers, FiBarChart2, FiColumns, FiSquare, 
  FiTriangle, FiWind, FiDroplet, FiSettings, FiHelpCircle,
  FiSun, FiMoon, FiUser, FiLogOut, FiMenu, FiChevronLeft,
  FiSave, FiDownload, FiShare2, FiArrowLeft, FiBell
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const MainLayout = ({ children, currentModule, breadcrumb, designCode = "EC2", analysisMethod = "Limit State", concreteGrade = "C30/37", steelGrade = "B500" }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Navigation items - Engineering Tools Only (NO Dashboard, NO User info)
  const navItems = [
    { id: 'slab', name: 'Slab', icon: FiLayers, path: '/structural-input' },
    { id: 'beam', name: 'Beam', icon: FiBarChart2, path: '/beam' },
    { id: 'column', name: 'Column', icon: FiColumns, path: '/column-design' },
    { id: 'foundation', name: 'Foundation', icon: FiSquare, path: '/foundation-design' },
    { id: 'staircase', name: 'Staircase', icon: FiTriangle, path: '/staircase-design' },
    { id: 'loads', name: 'Load Cases', icon: FiWind, path: '/load-cases' },
    { id: 'materials', name: 'Materials', icon: FiDroplet, path: '/materials' },
    { id: 'settings', name: 'Settings', icon: FiSettings, path: '/settings' },
    { id: 'help', name: 'Help', icon: FiHelpCircle, path: '/help' },
  ];

  const getUserInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return 'JE';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#111827] flex transition-colors duration-300">
      
      {/* ============================================================ */}
      {/* LEFT SIDEBAR - FIXED ENGINEERING TOOLBAR (NO USER INFO) */}
      {/* ============================================================ */}
      <div 
        className={`hidden md:flex bg-white dark:bg-[#1f2937] border-r border-[#e5e7eb] dark:border-[#374151] flex-col h-screen sticky top-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className={`p-5 border-b border-[#e5e7eb] dark:border-[#374151] ${isSidebarCollapsed ? 'px-3' : ''}`}>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-[#0A2F44] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">SDH</span>
            </div>
            {!isSidebarCollapsed && (
              <span className="font-bold text-[#02090d] dark:text-white">Struct Design Hub</span>
            )}
          </div>
        </div>

        {/* Primary Navigation - Engineering Tools Only */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentModule === item.id || location.pathname.includes(item.id);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-[#0A2F44] text-white shadow-md'
                      : 'text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#374151] hover:text-[#0A2F44] dark:hover:text-[#cce1eb]'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title={isSidebarCollapsed ? item.name : ''}
                >
                  <item.icon className={`text-xl flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'group-hover:text-[#0A2F44] dark:group-hover:text-[#66a4c2]'}`} />
                  {!isSidebarCollapsed && (
                    <span className="text-sm font-medium">{item.name}</span>
                  )}
                  {isActive && !isSidebarCollapsed && (
                    <div className="ml-auto w-1 h-5 bg-white rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom section with collapse button */}
        <div className="p-4 border-t border-[#e5e7eb] dark:border-[#374151]">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#334155] transition-colors cursor-pointer"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? (
              <FiMenu className="text-lg text-[#6b7280] dark:text-[#9ca3af]" />
            ) : (
              <div className="flex items-center space-x-2">
                <FiChevronLeft className="text-sm text-[#6b7280] dark:text-[#9ca3af]" />
                <span className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Collapse</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Floating Toggle Button - Visible when sidebar is collapsed */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="hidden md:flex fixed left-5 top-[84px] z-30 w-6 h-6 bg-white dark:bg-[#1f2937] border border-[#e5e7eb] dark:border-[#374151] rounded-full shadow-md hover:shadow-lg transition-all items-center justify-center cursor-pointer"
        style={{ 
          left: isSidebarCollapsed ? 'calc(5rem - 12px)' : 'calc(16rem - 12px)'
        }}
        title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {isSidebarCollapsed ? (
          <FiChevronLeft className="text-xs text-[#6b7280] dark:text-[#9ca3af] rotate-180" />
        ) : (
          <FiChevronLeft className="text-xs text-[#6b7280] dark:text-[#9ca3af]" />
        )}
      </button>

      {/* Mobile Sidebar - Same structure */}
      {isMobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-[75%] bg-white dark:bg-[#1f2937] z-50 md:hidden shadow-2xl">
            <div className="flex flex-col h-full">
              <div className="p-5 border-b border-[#e5e7eb] dark:border-[#374151] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-[#0A2F44] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">SA</span>
                  </div>
                  <span className="font-bold text-[#02090d] dark:text-white">StructAI</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 hover:bg-[#f3f4f6] dark:hover:bg-[#374151] rounded-lg">
                  <FiChevronLeft className="text-lg text-[#6b7280]" />
                </button>
              </div>
              <nav className="flex-1 p-3 overflow-y-auto">
                <div className="space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                        currentModule === item.id
                          ? 'bg-[#0A2F44] text-white'
                          : 'text-[#6b7280] dark:text-[#9ca3af] hover:bg-[#f3f4f6] dark:hover:bg-[#374151]'
                      }`}
                    >
                      <item.icon className="text-xl flex-shrink-0" />
                      <span className="text-sm font-medium">{item.name}</span>
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* MAIN CONTENT AREA */}
      {/* ============================================================ */}
      <div className="flex-1 overflow-auto">
        
        {/* SINGLE TOP BAR - Only one header */}
        <div className="bg-white dark:bg-[#1f2937] border-b border-[#e5e7eb] dark:border-[#374151] sticky top-0 z-20">
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              {/* Left: Back + Breadcrumb */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer"
                >
                  <FiMenu className="text-lg text-[#6b7280]" />
                </button>
                
                <button onClick={handleBack} className="flex items-center space-x-1 text-sm text-[#6b7280] dark:text-[#9ca3af] hover:text-[#0A2F44] transition-colors cursor-pointer">
                  <FiArrowLeft className="text-sm" />
                  <span>Back to Project</span>
                </button>
                
                {breadcrumb && (
                  <div className="hidden md:flex items-center space-x-2 text-sm">
                    <span className="text-[#9ca3af]">/</span>
                    <span className="text-[#6b7280] dark:text-[#9ca3af]">{breadcrumb}</span>
                  </div>
                )}
              </div>
              
              {/* Right: Actions - NO USER TEXT, only icons */}
              <div className="flex items-center space-x-2">
                <button className="p-1.5 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer" title="Save">
                  <FiSave className="text-sm text-[#6b7280]" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer" title="Export">
                  <FiDownload className="text-sm text-[#6b7280]" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer" title="Share">
                  <FiShare2 className="text-sm text-[#6b7280]" />
                </button>
                <div className="w-px h-6 bg-[#e5e7eb] dark:bg-[#374151] mx-1"></div>
                <button onClick={toggleDarkMode} className="p-1.5 rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151] transition-colors cursor-pointer">
                  {isDarkMode ? <FiSun className="text-sm text-yellow-500" /> : <FiMoon className="text-sm text-[#0A2F44]" />}
                </button>
                {/* User Avatar ONLY - NO name/email text */}
                <div className="w-7 h-7 bg-[#0A2F44] rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {getUserInitials()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ENGINEERING CONTEXT STRIP - Sticky under header */}
        <div className="bg-[#f9fafb] dark:bg-[#374151] border-b border-[#e5e7eb] dark:border-[#374151] sticky top-[57px] z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-[#02090d] dark:text-white">Design Code:</span>
                <span className="text-[#0A2F44] dark:text-[#66a4c2] font-mono">{designCode}</span>
              </div>
              <div className="w-px h-3 bg-[#e5e7eb] dark:bg-[#374151]"></div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-[#02090d] dark:text-white">Analysis:</span>
                <span className="text-[#6b7280] dark:text-[#9ca3af]">{analysisMethod}</span>
              </div>
              <div className="w-px h-3 bg-[#e5e7eb] dark:bg-[#374151]"></div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-[#02090d] dark:text-white">Units:</span>
                <span className="text-[#6b7280] dark:text-[#9ca3af]">kN, mm, m</span>
              </div>
              <div className="w-px h-3 bg-[#e5e7eb] dark:bg-[#374151]"></div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-[#02090d] dark:text-white">Concrete:</span>
                <span className="text-[#6b7280] dark:text-[#9ca3af]">{concreteGrade}</span>
              </div>
              <div className="w-px h-3 bg-[#e5e7eb] dark:bg-[#374151]"></div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-[#02090d] dark:text-white">Steel:</span>
                <span className="text-[#6b7280] dark:text-[#9ca3af]">{steelGrade}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content - NO duplicate headers inside */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;