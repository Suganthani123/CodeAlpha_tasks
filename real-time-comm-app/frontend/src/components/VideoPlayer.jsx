import React, { useEffect, useRef } from 'react';

const VideoPlayer = ({ stream, username, isLocal, muted, videoEnabled }) => {
  const videoRef = useRef();
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video shadow-lg">
      <video ref={videoRef} autoPlay playsInline muted={muted || isLocal} className={`w-full h-full object-cover ${!videoEnabled ? 'opacity-40' : ''}`} />
      <div className="absolute bottom-2 left-2 bg-black/60 px-3 py-1 rounded-lg text-white text-sm font-medium">
        {username} {isLocal && '(You)'}
      </div>
      {!videoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <span className="text-white text-lg">Camera Off</span>
        </div>
      )}
    </div>
  );
};
export default VideoPlayer;