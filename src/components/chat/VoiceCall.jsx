import React, { useState, useEffect } from 'react';
import { FiMic, FiMicOff, FiPhoneOff, FiUser, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { useChat } from '../../contexts/ChatContext';

const VoiceCall = ({ onEndCall }) => {
  const { callParticipant } = useChat();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="bg-[#1f2937] rounded-2xl p-8 w-96 text-center">
        {/* Avatar */}
        <div className="relative">
          <div className="w-32 h-32 bg-[#0A2F44] rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-[#0A2F44]/30 animate-pulse">
            <FiUser className="text-5xl text-white" />
          </div>
          <div className="absolute bottom-4 right-1/2 transform translate-x-16 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
        
        <h3 className="text-xl font-semibold text-white mb-1">{callParticipant?.name}</h3>
        <p className="text-gray-400 text-sm mb-2">Voice Call • {formatDuration(callDuration)}</p>
        
        {/* Audio Visualizer */}
        <div className="flex items-center justify-center space-x-1 mb-8 h-16">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-[#0A2F44] rounded-full animate-pulse"
              style={{
                height: `${Math.sin(i * 0.5) * 30 + 20}px`,
                animationDelay: `${i * 0.05}s`,
                animationDuration: '0.8s'
              }}
            />
          ))}
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-center space-x-6">
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            {isSpeakerOn ? <FiVolume2 className="text-white text-xl" /> : <FiVolumeX className="text-white text-xl" />}
          </button>
          
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? <FiMicOff className="text-white text-2xl" /> : <FiMic className="text-white text-2xl" />}
          </button>
          
          <button
            onClick={onEndCall}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <FiPhoneOff className="text-white text-2xl" />
          </button>
        </div>

        <p className="text-white/40 text-xs mt-6">
          Voice call UI ready • Backend integration coming soon
        </p>
      </div>
    </div>
  );
};

export default VoiceCall;