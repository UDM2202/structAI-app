import React, { useState } from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiUser, FiMaximize2 } from 'react-icons/fi';
import { useChat } from '../../contexts/ChatContext';

const VideoCall = ({ onEndCall }) => {
  const { callParticipant } = useChat();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const elem = document.getElementById('video-call-container');
    if (!isFullscreen) {
      elem?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div id="video-call-container" className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
      <div className="relative w-full max-w-6xl mx-4">
        {/* Remote Video Placeholder */}
        <div className="w-full h-[80vh] bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 bg-[#0A2F44] rounded-full flex items-center justify-center mx-auto mb-4">
              <FiUser className="text-5xl text-white" />
            </div>
            <p className="text-white text-xl font-semibold">{callParticipant?.name}</p>
            <p className="text-white/50 text-sm mt-1">Connecting...</p>
          </div>
        </div>
        
        {/* Local Video Preview (Picture-in-Picture) */}
        <div className="absolute bottom-6 right-6 w-48 h-36 bg-gray-800 rounded-xl overflow-hidden shadow-xl border-2 border-[#0A2F44]">
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <div className="w-12 h-12 bg-[#0A2F44] rounded-full flex items-center justify-center">
              <FiUser className="text-white text-xl" />
            </div>
          </div>
          {isVideoOff && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <FiVideoOff className="text-white text-2xl" />
            </div>
          )}
        </div>

        {/* Call Info */}
        <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
          <p className="text-white font-medium">Video Call with {callParticipant?.name}</p>
          <p className="text-white/70 text-xs">{isMuted ? 'Muted' : 'Connected'}</p>
        </div>

        {/* Controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? <FiMicOff className="text-white text-xl" /> : <FiMic className="text-white text-xl" />}
          </button>
          
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isVideoOff ? <FiVideoOff className="text-white text-xl" /> : <FiVideo className="text-white text-xl" />}
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <FiMaximize2 className="text-white text-xl" />
          </button>
          
          <button
            onClick={onEndCall}
            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <FiPhoneOff className="text-white text-xl" />
          </button>
        </div>

        {/* Note for backend integration */}
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-white/40 text-xs">Video call UI ready • Backend integration coming soon</p>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;