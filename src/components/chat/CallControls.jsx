import React from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiVolume2, FiVolumeX, FiMaximize2 } from 'react-icons/fi';

const CallControls = ({ 
  isMuted, 
  onToggleMute, 
  isVideoOff, 
  onToggleVideo, 
  onEndCall,
  isSpeakerOn,
  onToggleSpeaker,
  onToggleFullscreen,
  callType 
}) => {
  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full">
      {callType === 'voice' && (
        <button
          onClick={onToggleSpeaker}
          className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          {isSpeakerOn ? <FiVolume2 className="text-white text-xl" /> : <FiVolumeX className="text-white text-xl" />}
        </button>
      )}
      
      <button
        onClick={onToggleMute}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
          isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
        }`}
      >
        {isMuted ? <FiMicOff className="text-white text-xl" /> : <FiMic className="text-white text-xl" />}
      </button>
      
      {callType === 'video' && (
        <>
          <button
            onClick={onToggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isVideoOff ? <FiVideoOff className="text-white text-xl" /> : <FiVideo className="text-white text-xl" />}
          </button>
          
          <button
            onClick={onToggleFullscreen}
            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <FiMaximize2 className="text-white text-xl" />
          </button>
        </>
      )}
      
      <button
        onClick={onEndCall}
        className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors cursor-pointer"
      >
        <FiPhoneOff className="text-white text-xl" />
      </button>
    </div>
  );
};

export default CallControls;