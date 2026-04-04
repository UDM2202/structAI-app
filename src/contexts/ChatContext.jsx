// src/contexts/ChatContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children, workspaceId, projectId, user }) => {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState(null); // 'voice' or 'video'
  const [callParticipant, setCallParticipant] = useState(null);
  const [isConnected, setIsConnected] = useState(true);

  // Mock online users
  useEffect(() => {
    setOnlineUsers([
      { id: 'user1', name: 'John Engineer', avatar: 'JE', role: 'admin' },
      { id: 'user2', name: 'Sarah Architect', avatar: 'SA', role: 'member' },
      { id: 'user3', name: 'Mike Structural', avatar: 'MS', role: 'member' },
    ]);
  }, []);

  // Mock messages
  useEffect(() => {
    setMessages([
      {
        id: 1,
        sender: { id: 'user1', name: 'John Engineer' },
        content: 'Welcome to the project chat! Feel free to discuss anything about the design.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: 'text',
        read: true
      },
      {
        id: 2,
        sender: { id: 'user2', name: 'Sarah Architect' },
        content: 'I just updated the beam calculations. Let me know if you have any questions.',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        type: 'text',
        read: true
      },
      {
        id: 3,
        sender: { id: 'user1', name: 'John Engineer' },
        content: 'Great! The slab design looks optimized. Ready for review.',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        type: 'text',
        read: false
      },
    ]);
  }, []);

  const sendMessage = (content, type = 'text') => {
    if (!content.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      sender: user || { id: 'current', name: 'You', avatar: 'ME' },
      content,
      timestamp: new Date().toISOString(),
      type,
      read: false
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Mock reply (simulate other user response)
    setTimeout(() => {
      const replyMessage = {
        id: Date.now() + 1,
        sender: { id: 'user1', name: 'John Engineer', avatar: 'JE' },
        content: 'Thanks for your message! I will review it shortly.',
        timestamp: new Date().toISOString(),
        type: 'text',
        read: false
      };
      setMessages(prev => [...prev, replyMessage]);
    }, 2000);
  };

  const sendFile = (file) => {
    const newFileMessage = {
      id: Date.now(),
      sender: user || { id: 'current', name: 'You', avatar: 'ME' },
      content: `📎 ${file.name}`,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString(),
      type: 'file'
    };
    setMessages(prev => [...prev, newFileMessage]);
  };

  const startCall = (participant, type) => {
    setCallParticipant(participant);
    setCallType(type);
    setIsCallActive(true);
  };

  const endCall = () => {
    setIsCallActive(false);
    setCallType(null);
    setCallParticipant(null);
  };

  const markAsRead = (messageId) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, read: true } : msg
    ));
  };

  return (
    <ChatContext.Provider value={{
      messages,
      onlineUsers,
      isConnected,
      sendMessage,
      sendFile,
      startCall,
      endCall,
      isCallActive,
      callType,
      callParticipant,
      markAsRead
    }}>
      {children}
    </ChatContext.Provider>
  );
};