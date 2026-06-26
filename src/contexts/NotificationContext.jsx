// src/contexts/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

// Mock notifications data
const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'invite',
    title: 'Workspace Invitation',
    message: 'John Engineer invited you to join "Acme Engineering" as Admin',
    workspace_id: 'ws-1',
    workspace_name: 'Acme Engineering',
    role: 'admin',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    read: false
  },
  {
    id: 'notif-2',
    type: 'transfer',
    title: 'Ownership Transfer',
    message: 'John Engineer transferred workspace ownership to you',
    workspace_id: 'ws-1',
    workspace_name: 'Acme Engineering',
    status: 'pending',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    read: true
  },
  {
    id: 'notif-3',
    type: 'invite',
    title: 'Project Invitation',
    message: 'Sarah Designer invited you to join project "London Office Tower" as Editor',
    project_id: 'proj-1',
    project_name: 'London Office Tower',
    role: 'editor',
    status: 'pending',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    read: false
  },
  {
    id: 'notif-4',
    type: 'member_joined',
    title: 'New Member',
    message: 'Mike Analyst has joined your workspace',
    workspace_id: 'ws-1',
    workspace_name: 'Acme Engineering',
    user_name: 'Mike Analyst',
    status: 'accepted',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    read: false
  }
];

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setNotifications(MOCK_NOTIFICATIONS);
      const unread = MOCK_NOTIFICATIONS.filter(n => !n.read).length;
      setUnreadCount(unread);
      setLoading(false);
    }, 500);
  };

  const markAsRead = async (notificationId) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const acceptInvite = async (notification) => {
    // Update notification status
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? { ...n, status: 'accepted', read: true } : n
    ));
    
    // Here you would call API to accept the invite
    console.log('Accepted invite:', notification);
    
    // Reload workspaces to show new workspace/project
    window.location.reload();
  };

  const rejectInvite = async (notification) => {
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? { ...n, status: 'rejected', read: true } : n
    ));
    console.log('Rejected invite:', notification);
  };

  const acceptTransfer = async (notification) => {
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? { ...n, status: 'accepted', read: true } : n
    ));
    console.log('Accepted ownership transfer:', notification);
    window.location.reload();
  };

  const deleteNotification = async (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    const remainingUnread = notifications.filter(n => n.id !== notificationId && !n.read).length;
    setUnreadCount(remainingUnread);
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    acceptInvite,
    rejectInvite,
    acceptTransfer,
    deleteNotification,
    loadNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};