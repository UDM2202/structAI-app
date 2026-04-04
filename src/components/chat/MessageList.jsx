import React, { useRef, useEffect } from 'react';
import { FiCheck, FiCheckCircle, FiImage, FiFile } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

const MessageList = ({ messages, onMarkAsRead }) => {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString();
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <FiImage className="text-blue-500" />;
    return <FiFile className="text-gray-500" />;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg) => {
        const isCurrentUser = msg.sender.id === user?.id || msg.sender.name === 'You';
        
        return (
          <div
            key={msg.id}
            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`max-w-[75%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
              {!isCurrentUser && (
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-5 h-5 bg-[#e6f0f5] dark:bg-[#1e3a4a] rounded-full flex items-center justify-center text-[8px] font-medium text-[#0A2F44]">
                    {msg.sender.avatar || msg.sender.name.charAt(0)}
                  </div>
                  <p className="text-xs font-medium text-[#6b7280] dark:text-[#9ca3af]">
                    {msg.sender.name}
                  </p>
                </div>
              )}
              
              <div className={`rounded-lg p-3 ${
                isCurrentUser
                  ? 'bg-[#0A2F44] text-white'
                  : 'bg-white dark:bg-[#1f2937] text-[#02090d] dark:text-white border border-[#e5e7eb] dark:border-[#374151]'
              }`}>
                {msg.type === 'text' && (
                  <p className="text-sm break-words">{msg.content}</p>
                )}
                {msg.type === 'file' && (
                  <div className="flex items-center space-x-2">
                    {getFileIcon(msg.fileType)}
                    <div>
                      <p className="text-sm font-medium">{msg.fileName}</p>
                      <p className="text-xs opacity-70">{Math.round(msg.fileSize / 1024)} KB</p>
                    </div>
                  </div>
                )}
                <div className={`flex items-center justify-end space-x-1 mt-1 ${
                  isCurrentUser ? 'text-white/50' : 'text-[#9ca3af]'
                }`}>
                  <p className="text-[10px]">{formatTime(msg.timestamp)}</p>
                  {isCurrentUser && (
                    msg.read ? <FiCheckCircle className="text-[10px]" /> : <FiCheck className="text-[10px]" />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;