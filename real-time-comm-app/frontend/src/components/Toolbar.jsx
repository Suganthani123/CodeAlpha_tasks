import React, { useState } from 'react';
import { VideoCameraIcon, MicrophoneIcon, PhoneXMarkIcon, ComputerDesktopIcon, PhotoIcon, HandRaisedIcon, FaceSmileIcon } from '@heroicons/react/24/solid';

const Toolbar = ({ onToggleAudio, onToggleVideo, onScreenShare, onLeave, onRaiseHand, onReaction, audioEnabled, videoEnabled }) => {
  const [showReactions, setShowReactions] = useState(false);
  const reactions = ['👍', '❤️', '😂', '😮', '👏', '🎉'];
  return (
    <div className="flex justify-center gap-4 p-4 bg-gray-800 text-white rounded-t-2xl">
      <button onClick={onToggleAudio} className={`p-3 rounded-full transition ${!audioEnabled ? 'bg-red-500' : 'bg-gray-600'} hover:opacity-80`}>
        <MicrophoneIcon className="w-6 h-6" />
      </button>
      <button onClick={onToggleVideo} className={`p-3 rounded-full transition ${!videoEnabled ? 'bg-red-500' : 'bg-gray-600'} hover:opacity-80`}>
        <VideoCameraIcon className="w-6 h-6" />
      </button>
      <button onClick={onScreenShare} className="p-3 rounded-full bg-gray-600 hover:opacity-80">
        <ComputerDesktopIcon className="w-6 h-6" />
      </button>
      <button onClick={onRaiseHand} className="p-3 rounded-full bg-gray-600 hover:opacity-80">
        <HandRaisedIcon className="w-6 h-6" />
      </button>
      <div className="relative">
        <button onClick={() => setShowReactions(!showReactions)} className="p-3 rounded-full bg-gray-600 hover:opacity-80">
          <FaceSmileIcon className="w-6 h-6" />
        </button>
        {showReactions && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-lg p-2 flex gap-2 z-50">
            {reactions.map(emoji => (
              <button key={emoji} onClick={() => { onReaction(emoji); setShowReactions(false); }} className="text-2xl hover:scale-125 transition">
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onLeave} className="p-3 rounded-full bg-red-500 hover:opacity-80">
        <PhoneXMarkIcon className="w-6 h-6" />
      </button>
    </div>
  );
};
export default Toolbar;