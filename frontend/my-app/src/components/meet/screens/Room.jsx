import React, { useEffect, useCallback, useState, useRef } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import { useNavigate } from "react-router-dom";
import EmojiPicker from "emoji-picker-react";
import { BsEmojiSmile, BsPaperclip, BsFillCameraVideoFill, BsFillCameraVideoOffFill, BsMicFill, BsMicMuteFill } from "react-icons/bs";
import { FaShareSquare, FaDoorOpen } from "react-icons/fa";
import { IoMdSend } from "react-icons/io";

function useWindowSize() {
  const [size, setSize] = useState([window.innerWidth, window.innerHeight]);
  
  useEffect(() => {
    const handleResize = () => {
      setSize([window.innerWidth, window.innerHeight]);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return size;
}

const RoomPage = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [screenShareError, setScreenShareError] = useState(null);
  const chatContainerRef = useRef(null);
  const [width] = useWindowSize();
  const isMobile = width < 1000;

  // Initialize user media stream
  const initUserMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      setMyStream(stream);
    } catch (err) {
      console.error("Failed to get user media:", err);
    }
  }, []);

  useEffect(() => {
    initUserMedia();
    return () => {
      if (myStream) {
        myStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
    setMessages(prev => [...prev, { 
      text: `${email} joined the room`, 
      isSystem: true, 
      sender: "system" 
    }]);
  }, []);

  const handleCallUser = useCallback(async () => {
    if (!myStream) {
      await initUserMedia();
      return;
    }
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
  }, [remoteSocketId, socket, myStream, initUserMedia]);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      if (!myStream) {
        await initUserMedia();
      }
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket, myStream, initUserMedia]
  );

  const sendStreams = useCallback(() => {
    if (!myStream) return;
    
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
    
    setMessages(prev => [...prev, { 
      text: "Stream shared successfully", 
      isSystem: true, 
      sender: "system" 
    }]);
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
      setMessages(prev => [...prev, { 
        text: "Call accepted", 
        isSystem: true, 
        sender: "system" 
      }]);
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncoming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  // Chat functionality
  const handleSendMessage = useCallback(() => {
    if (message.trim() === "") return;
    
    socket.emit("message:send", { to: remoteSocketId, text: message });
    setMessages(prev => [...prev, { text: message, sender: "me" }]);
    setMessage("");
    setShowEmojiPicker(false);
  }, [message, remoteSocketId, socket]);

  const handleReceiveMessage = useCallback(({ text, from }) => {
    setMessages(prev => [...prev, { text, sender: "remote" }]);
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (!myStream) return;
    
    const videoTrack = myStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);
    }
  }, [myStream]);

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (!myStream) return;
    
    const audioTrack = myStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
    }
  }, [myStream]);

  // Screen sharing with robust error handling
  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        screenStream.getTracks().forEach(track => track.stop());
        
        // Restore original camera stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
        
        setMyStream(stream);
        setIsScreenSharing(false);
        setScreenStream(null);
        
        // Update peer connection
        const senders = peer.peer.getSenders();
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        
        for (const sender of senders) {
          if (sender.track?.kind === "video") {
            sender.replaceTrack(videoTrack);
          } else if (sender.track?.kind === "audio") {
            sender.replaceTrack(audioTrack);
          }
        }
      } else {
        // Start screen sharing (video only)
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        }).catch(err => {
          console.error("Display media error:", err);
          throw err;
        });
        
        // Keep original audio
        const audioTrack = myStream.getAudioTracks()[0];
        const newStream = new MediaStream([
          ...stream.getVideoTracks(),
          audioTrack
        ]);
        
        setScreenStream(stream);
        setIsScreenSharing(true);
        setMyStream(newStream);
        
        // Update peer connection
        const senders = peer.peer.getSenders();
        for (const sender of senders) {
          if (sender.track?.kind === "video") {
            sender.replaceTrack(newStream.getVideoTracks()[0]);
          }
        }
        
        // Handle when user stops sharing
        stream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      }
      setScreenShareError(null);
    } catch (err) {
      console.error("Screen sharing error:", err);
      setScreenShareError("Failed to share screen. Please check permissions.");
      setIsScreenSharing(false);
      
      // Fallback to camera if error occurs
      if (myStream) {
        const senders = peer.peer.getSenders();
        for (const sender of senders) {
          if (sender.track?.kind === "video") {
            sender.replaceTrack(myStream.getVideoTracks()[0]);
          }
        }
      }
    }
  }, [isScreenSharing, screenStream, myStream]);

  // File sharing
  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = event.target.result;
      socket.emit("file:send", { 
        to: remoteSocketId, 
        fileName: file.name, 
        fileType: file.type, 
        fileSize: file.size,
        data: fileData 
      });
      setMessages(prev => [...prev, { 
        text: `You sent a file: ${file.name}`, 
        isFile: true,
        fileName: file.name,
        fileData,
        sender: "me" 
      }]);
    };
    reader.readAsDataURL(file);
  }, [remoteSocketId, socket]);

  const handleReceiveFile = useCallback(({ fileName, fileType, fileSize, data, from }) => {
    setMessages(prev => [...prev, { 
      text: `Received a file: ${fileName}`, 
      isFile: true,
      fileName,
      fileData: data,
      sender: "remote" 
    }]);
  }, []);

  // Socket event listeners
  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncoming);
    socket.on("peer:nego:final", handleNegoNeedFinal);
    socket.on("message:receive", handleReceiveMessage);
    socket.on("file:receive", handleReceiveFile);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncoming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
      socket.off("message:receive", handleReceiveMessage);
      socket.off("file:receive", handleReceiveFile);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncomingCall,
    handleCallAccepted,
    handleNegoNeedIncoming,
    handleNegoNeedFinal,
    handleReceiveMessage,
    handleReceiveFile
  ]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const onEmojiClick = (emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
  };

  const downloadFile = (fileData, fileName) => {
    const link = document.createElement("a");
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLeaveRoom = () => {
    if (myStream) {
      myStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    navigate("/meetapp");
  };

  return (
    <div style={{ 
      minHeight: "100vh",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      background: "linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #2a2a2a 100%)",
      color: "white",
      fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    }}>
      {/* Main content area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: isMobile ? "12px" : "24px",
        gap: "16px",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "8px",
          backdropFilter: "blur(10px)",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
          flexShrink: 0
        }}>
          <h1 style={{ 
            color: "#ff4757",
            fontSize: isMobile ? "1.2rem" : "1.8rem",
            fontWeight: "600",
            margin: "0"
          }}>
            Video Conference
            {screenShareError && (
              <span style={{
                fontSize: "0.8rem",
                color: "#ff6b81",
                marginLeft: "10px"
              }}>
                {screenShareError}
              </span>
            )}
          </h1>
          
          <button 
            onClick={handleLeaveRoom}
            style={{ 
              backgroundColor: "rgba(255, 71, 87, 0.2)",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 71, 87, 0.4)",
              color: "#ff4757",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.3s ease",
              fontSize: isMobile ? "0.8rem" : "1rem",
              ":hover": {
                backgroundColor: "rgba(255, 71, 87, 0.3)"
              }
            }}
          >
            <FaDoorOpen size={isMobile ? 14 : 18} /> 
            {isMobile ? "Leave" : "Leave Room"}
          </button>
        </div>

        {/* Video streams */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "center",
          alignItems: "center",
          gap: "16px",
          overflow: "auto",
          padding: isMobile ? "8px" : "16px"
        }}>
          {myStream && (
            <div style={{
              position: "relative",
              borderRadius: "12px",
              overflow: "hidden",
              background: "rgba(0, 0, 0, 0.5)",
              width: isMobile ? "100%" : "45%",
              maxWidth: "600px",
              aspectRatio: "16/9",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              flexShrink: 0
            }}>
              <div style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                color: "white",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "0.8rem",
                zIndex: 1
              }}>
                You {isScreenSharing && "(Sharing Screen)"}
              </div>
              <ReactPlayer
                playing
                muted
                height="100%"
                width="100%"
                url={myStream}
                style={{ 
                  objectFit: "cover",
                  transform: isCameraOn ? "scaleX(1)" : "scaleX(-1)" 
                }}
              />
            </div>
          )}
          
          {remoteStream && (
            <div style={{
              position: "relative",
              borderRadius: "12px",
              overflow: "hidden",
              background: "rgba(0, 0, 0, 0.5)",
              width: isMobile ? "100%" : "45%",
              maxWidth: "600px",
              aspectRatio: "16/9",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              flexShrink: 0
            }}>
              <div style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                color: "white",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "0.8rem",
                zIndex: 1
              }}>
                Participant
              </div>
              <ReactPlayer
                playing
                height="100%"
                width="100%"
                url={remoteStream}
                style={{ objectFit: "cover" }}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: isMobile ? "8px" : "12px",
          padding: "12px",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "12px",
          backdropFilter: "blur(10px)",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          flexWrap: "wrap",
          position: isMobile ? "sticky" : "static",
          bottom: isMobile ? "0" : "auto",
          zIndex: 100
        }}>
          <button 
            onClick={toggleCamera}
            style={{ 
              backgroundColor: isCameraOn ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 71, 87, 0.2)",
              padding: isMobile ? "8px 12px" : "10px 16px",
              borderRadius: "8px",
              border: isCameraOn ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(255, 71, 87, 0.4)",
              color: isCameraOn ? "white" : "#ff4757",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
              minWidth: isMobile ? "60px" : "80px",
              fontSize: isMobile ? "0.7rem" : "0.8rem",
              ":hover": {
                backgroundColor: isCameraOn ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 71, 87, 0.3)"
              }
            }}
          >
            {isCameraOn ? <BsFillCameraVideoFill size={isMobile ? 16 : 20} /> : <BsFillCameraVideoOffFill size={isMobile ? 16 : 20} />}
            <span>Camera</span>
          </button>
          
          <button 
            onClick={toggleMic}
            style={{ 
              backgroundColor: isMicOn ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 71, 87, 0.2)",
              padding: isMobile ? "8px 12px" : "10px 16px",
              borderRadius: "8px",
              border: isMicOn ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(255, 71, 87, 0.4)",
              color: isMicOn ? "white" : "#ff4757",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
              minWidth: isMobile ? "60px" : "80px",
              fontSize: isMobile ? "0.7rem" : "0.8rem",
              ":hover": {
                backgroundColor: isMicOn ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 71, 87, 0.3)"
              }
            }}
          >
            {isMicOn ? <BsMicFill size={isMobile ? 16 : 20} /> : <BsMicMuteFill size={isMobile ? 16 : 20} />}
            <span>Mic</span>
          </button>
          
          <button 
            onClick={toggleScreenShare}
            style={{ 
              backgroundColor: isScreenSharing ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 71, 87, 0.2)",
              padding: isMobile ? "8px 12px" : "10px 16px",
              borderRadius: "8px",
              border: isScreenSharing ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(255, 71, 87, 0.4)",
              color: isScreenSharing ? "white" : "#ff4757",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
              minWidth: isMobile ? "60px" : "80px",
              fontSize: isMobile ? "0.7rem" : "0.8rem",
              ":hover": {
                backgroundColor: isScreenSharing ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 71, 87, 0.3)"
              }
            }}
          >
            <FaShareSquare size={isMobile ? 16 : 18} />
            <span>{isScreenSharing ? "Stop Share" : "Share"}</span>
          </button>
          
          {myStream && (
            <button 
              onClick={sendStreams}
              style={{ 
                backgroundColor: "rgba(255, 71, 87, 0.2)",
                padding: isMobile ? "8px 12px" : "10px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 71, 87, 0.4)",
                color: "#ff4757",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease",
                minWidth: isMobile ? "60px" : "80px",
                fontSize: isMobile ? "0.7rem" : "0.8rem",
                ":hover": {
                  backgroundColor: "rgba(255, 71, 87, 0.3)"
                }
              }}
            >
              <BsFillCameraVideoFill size={isMobile ? 16 : 20} />
              <span>Stream</span>
            </button>
          )}
          
          {remoteSocketId && (
            <button 
              onClick={handleCallUser}
              style={{ 
                backgroundColor: "rgba(255, 71, 87, 0.5)",
                padding: isMobile ? "8px 12px" : "10px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 71, 87, 0.7)",
                color: "white",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease",
                minWidth: isMobile ? "60px" : "80px",
                fontSize: isMobile ? "0.7rem" : "0.8rem",
                ":hover": {
                  backgroundColor: "rgba(255, 71, 87, 0.6)"
                }
              }}
            >
              <BsFillCameraVideoFill size={isMobile ? 16 : 20} />
              <span>Call</span>
            </button>
          )}
        </div>
      </div>

      {/* Chat panel */}
      {(!isMobile || width > 768) && (
        <div style={{
          width: isMobile ? "300px" : "350px",
          background: "rgba(0, 0, 0, 0.7)",
          borderLeft: isMobile ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          flexDirection: "column",
          height: isMobile ? "50vh" : "100vh",
          position: isMobile ? "relative" : "sticky",
          top: "0"
        }}>
          <div style={{
            padding: "16px",
            background: "#ff4757",
            color: "white",
            fontSize: "1rem",
            fontWeight: "600",
            textAlign: "center"
          }}>
            Chat Messages
          </div>
          
          <div 
            ref={chatContainerRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
          >
            {messages.map((msg, index) => (
              <div 
                key={index}
                style={{ 
                  alignSelf: msg.sender === "me" ? "flex-end" : "flex-start",
                  backgroundColor: msg.sender === "me" ? "#ff4757" : 
                                msg.sender === "system" ? "rgba(0,0,0,0.3)" : "rgba(255, 255, 255, 0.1)",
                  color: msg.sender === "me" ? "white" : "inherit",
                  padding: "10px 14px",
                  borderRadius: msg.sender === "me" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                  maxWidth: "80%",
                  wordWrap: "break-word",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  border: msg.sender === "system" ? "1px dashed rgba(255,255,255,0.3)" : "none",
                  fontSize: "0.9rem"
                }}
              >
                {msg.isFile ? (
                  <div>
                    <p style={{ margin: "0 0 6px 0" }}>{msg.text}</p>
                    <button 
                      onClick={() => downloadFile(msg.fileData, msg.fileName)}
                      style={{ 
                        backgroundColor: "rgba(255,255,255,0.1)",
                        color: "inherit",
                        border: "1px solid rgba(255,255,255,0.3)",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: "0.7rem",
                        transition: "all 0.2s ease",
                        ":hover": {
                          backgroundColor: "rgba(255,255,255,0.2)"
                        }
                      }}
                    >
                      Download {msg.fileName}
                    </button>
                  </div>
                ) : (
                  <p style={{ margin: "0" }}>{msg.text}</p>
                )}
              </div>
            ))}
          </div>
          
          {/* Message input */}
          <div style={{
            padding: "12px",
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            gap: "6px",
            alignItems: "center",
            position: "relative"
          }}>
            {showEmojiPicker && (
              <div style={{
                position: "absolute",
                bottom: "60px",
                right: "0",
                zIndex: "1001"
              }}>
                <EmojiPicker 
                  onEmojiClick={onEmojiClick} 
                  width={280}
                  height={350}
                  searchDisabled
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
            
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: "10px 14px",
                border: "none",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "white",
                outline: "none",
                fontSize: "0.9rem"
              }}
            />
            
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{ 
                backgroundColor: showEmojiPicker ? "rgba(255, 255, 255, 0.2)" : "transparent",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                border: "none",
                color: showEmojiPicker ? "#ff4757" : "rgba(255, 255, 255, 0.7)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                ":hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "white"
                }
              }}
            >
              <BsEmojiSmile size={16} />
            </button>
            
            <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
              <div style={{ 
                backgroundColor: "transparent",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                border: "none",
                color: "rgba(255, 255, 255, 0.7)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                ":hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "white"
                }
              }}>
                <BsPaperclip size={16} />
              </div>
            </label>
            
            <input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            
            <button 
              onClick={handleSendMessage}
              style={{ 
                backgroundColor: "#ff4757",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                ":hover": {
                  backgroundColor: "#ff6b81"
                }
              }}
            >
              <IoMdSend size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomPage;