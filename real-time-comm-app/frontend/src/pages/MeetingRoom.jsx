import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer';
import VideoPlayer from '../components/VideoPlayer';
import Toolbar from '../components/Toolbar';
import Whiteboard from '../components/Whiteboard';
import Chat from '../components/Chat';

const MeetingRoom = ({ currentUser, onLeave }) => {
  const { roomId } = useParams();
  const [socket, setSocket] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [reactions, setReactions] = useState([]);
  const peersRef = useRef({});
  const userVideoRef = useRef();
  const socketRef = useRef(null);

  // 1. Initialize socket connection once
  useEffect(() => {
    const s = io('http://localhost:5000');
    socketRef.current = s;
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  // 2. After socket is connected, set up media and listeners
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return; // wait for socket to be created

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setMyStream(stream);
        if (userVideoRef.current) userVideoRef.current.srcObject = stream;

        s.emit('join-room', { roomId, userId: currentUser.id, username: currentUser.username });

        // Remove any existing listeners to avoid duplicates
        s.off('existing-participants');
        s.off('user-joined');
        s.off('offer');
        s.off('answer');
        s.off('ice-candidate');
        s.off('user-left');
        s.off('reaction');

        s.on('existing-participants', participants => {
          participants.forEach(p => {
            if (p.socketId !== s.id) createPeer(p.socketId, s.id, stream, true);
          });
        });

        s.on('user-joined', user => createPeer(user.socketId, s.id, stream, true));
        s.on('offer', ({ from, offer }) => createPeer(from, s.id, stream, false, offer));
        s.on('answer', ({ from, answer }) => peersRef.current[from]?.signal(answer));
        s.on('ice-candidate', ({ from, candidate }) => peersRef.current[from]?.signal(candidate));
        s.on('user-left', socketId => {
          if (peersRef.current[socketId]) peersRef.current[socketId].destroy();
          delete peersRef.current[socketId];
          setPeers(prev => prev.filter(p => p.socketId !== socketId));
        });
        s.on('reaction', ({ username, reaction }) => {
          setReactions(prev => [...prev, { id: Date.now(), username, reaction }]);
          setTimeout(() => setReactions(prev => prev.slice(1)), 1000);
        });
      })
      .catch(err => console.error('Media error:', err));

    return () => {
      if (s) {
        s.off('existing-participants');
        s.off('user-joined');
        s.off('offer');
        s.off('answer');
        s.off('ice-candidate');
        s.off('user-left');
        s.off('reaction');
      }
      Object.values(peersRef.current).forEach(peer => peer.destroy());
      peersRef.current = {};
      if (myStream) myStream.getTracks().forEach(track => track.stop());
    };
  }, [roomId, currentUser]);

  const createPeer = (socketId, myId, stream, initiator, offer = null) => {
    const peer = new SimplePeer({ initiator, stream, trickle: false });
    peer.on('signal', signal => {
      if (signal.type === 'offer') socketRef.current?.emit('offer', { to: socketId, offer: signal });
      else if (signal.type === 'answer') socketRef.current?.emit('answer', { to: socketId, answer: signal });
      else if (signal.candidate) socketRef.current?.emit('ice-candidate', { to: socketId, candidate: signal });
    });
    peer.on('stream', remoteStream => {
      setPeers(prev => [...prev, { socketId, stream: remoteStream, username: 'Participant' }]);
    });
    if (offer) peer.signal(offer);
    peersRef.current[socketId] = peer;
  };

  const toggleAudio = () => {
    if (myStream) {
      const enabled = !audioEnabled;
      myStream.getAudioTracks()[0].enabled = enabled;
      setAudioEnabled(enabled);
      socketRef.current?.emit('toggle-audio', { roomId, userId: currentUser.id, muted: !enabled });
    }
  };
  const toggleVideo = () => {
    if (myStream) {
      const enabled = !videoEnabled;
      myStream.getVideoTracks()[0].enabled = enabled;
      setVideoEnabled(enabled);
      socketRef.current?.emit('toggle-video', { roomId, userId: currentUser.id, disabled: !enabled });
    }
  };
  const toggleScreenShare = async () => {
    if (!screenStream) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer._pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(stream.getVideoTracks()[0]);
        });
        stream.getVideoTracks()[0].onended = () => toggleScreenShare(); // auto-stop when user ends share
      } catch (err) { console.error('Screen share error:', err); }
    } else {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      Object.values(peersRef.current).forEach(peer => {
        const sender = peer._pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender && myStream) sender.replaceTrack(myStream.getVideoTracks()[0]);
      });
    }
  };
  const raiseHand = () => socketRef.current?.emit('raise-hand', { roomId, username: currentUser.username });
  const sendReaction = (reaction) => socketRef.current?.emit('send-reaction', { roomId, reaction, username: currentUser.username });

  // Render only when socket exists to avoid null errors
  if (!socket) return <div className="h-screen flex items-center justify-center text-white">Connecting to server...</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <div className="fixed top-20 right-4 z-50">
        {reactions.map(r => <div key={r.id} className="animate-float text-3xl mb-2 bg-black/50 rounded-full p-2">{r.reaction} <span className="text-sm text-white">{r.username}</span></div>)}
      </div>
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        <div className={`flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min ${showWhiteboard || showChat ? 'w-2/3' : 'w-full'}`}>
          {myStream && <VideoPlayer stream={myStream} username={currentUser.username} isLocal audioEnabled={audioEnabled} videoEnabled={videoEnabled} />}
          {peers.map(peer => <VideoPlayer key={peer.socketId} stream={peer.stream} username={peer.username} />)}
        </div>
        {showWhiteboard && socket && <div className="w-1/3"><Whiteboard socket={socket} roomId={roomId} /></div>}
        {showChat && socket && <div className="w-80"><Chat socket={socket} roomId={roomId} username={currentUser.username} /></div>}
      </div>
      <Toolbar onToggleAudio={toggleAudio} onToggleVideo={toggleVideo} onScreenShare={toggleScreenShare} onLeave={onLeave} onRaiseHand={raiseHand} onReaction={sendReaction} audioEnabled={audioEnabled} videoEnabled={videoEnabled} />
      <div className="fixed bottom-24 right-4 flex gap-2">
        <button onClick={() => setShowWhiteboard(!showWhiteboard)} className="bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-600 transition">{showWhiteboard ? 'Hide Board' : 'Whiteboard'}</button>
        <button onClick={() => setShowChat(!showChat)} className="bg-green-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-green-600 transition">{showChat ? 'Hide Chat' : 'Chat'}</button>
      </div>
    </div>
  );
};

export default MeetingRoom;