import React, { useState, useRef } from 'react';
import { FiPaperclip, FiSend, FiSmile } from 'react-icons/fi';

const MessageInput = ({ onSendMessage, onSendFile, disabled }) => {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleSubmit = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      onSendFile(file);
    }
  };

  return (
    <div className="p-3 border-t border-[#e5e7eb] dark:border-[#374151] bg-white dark:bg-[#1f2937]">
      <div className="flex items-end space-x-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-[#6b7280] hover:text-[#0A2F44] dark:hover:text-[#66a4c2] transition-colors cursor-pointer rounded-lg hover:bg-[#f3f4f6] dark:hover:bg-[#374151]"
          disabled={disabled}
        >
          <FiPaperclip className="text-lg" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows="1"
          disabled={disabled}
          className="flex-1 px-3 py-2 rounded-lg border border-[#e5e7eb] dark:border-[#374151] bg-[#f9fafb] dark:bg-[#374151] text-[#02090d] dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#0A2F44] text-sm"
        />
        
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          className="p-2 bg-[#0A2F44] text-white rounded-lg hover:bg-[#082636] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <FiSend className="text-lg" />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;