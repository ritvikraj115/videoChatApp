import React, { useEffect, useCallback, useState, useRef } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import { FaPhoneAlt } from "react-icons/fa";
import { FaPhoneVolume } from "react-icons/fa6";
import { FaVideo } from "react-icons/fa";
import { FaVideoSlash } from "react-icons/fa6";
import { FcEndCall } from "react-icons/fc";
import { FaMicrophone } from "react-icons/fa";
import { FaMicrophoneSlash } from "react-icons/fa";
import {useNavigate} from 'react-router-dom';
import { RiAiGenerate } from "react-icons/ri";


const RoomPage = () => {
  const socket = useSocket();
  const navigate=useNavigate();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [callAccepted, setCallAccepted]= useState(false);
  const [incomingCall, setIncomingCall]= useState(false);
  const [video, setvideo]= useState(true)
  const [audio, setAudio]= useState(false)
  const [expression,setExpression]= useState('')
  const backgroundImageUrl = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRh-jTnUQCNemLc1bDh-5RADjva0p7EG1z9Yg&s';

  const sendStreams = useCallback(async () => {
    if(video){
      console.log("start stream")
      setvideo(false);
      for (let track of myStream.getTracks()) {
        peer.peer.addTrack(track, myStream);
        
      }
    }
    else{
      console.log("stop stream")
      setvideo(true);
      for (let track of myStream.getTracks()) {
        socket.emit('stop:stream',{to:remoteSocketId})
        peer.peer.removeTrack(peer.peer.getSenders().find(sender => sender.track === track)); // Removes the track from the peer connection
    }
    }
  }, [myStream, video]);


  const handleUserJoined = useCallback( async({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
    const offer = await peer.getOffer();
    setCallAccepted(true)
    
    socket.emit("user:call", { to: remoteSocketId, offer });
    
  }, [remoteSocketId, socket, myStream]);

  const handleIncommingCall = useCallback(async ({from, offer}) =>
    {
    console.log(offer)
    setIncomingCall(true)
    setRemoteSocketId(from);
    socket.emit('call:accepted',{from,offer})
   },[socket]
  );

  const handleCallAccepted = useCallback(
      async ({ from, offer }) => {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);
     
        
        // console.log(`Incoming Call`, from, offer);
        const ans = await peer.getAnswer(offer);
        setCallAccepted(true)
        socket.emit('post:call',{from,ans})
      },
      [socket]
  );

  const postCall = async ({from, ans}) =>{
    await peer.setLocalDescription(ans);
    
    console.log("Call Accepted!");
   
  }

  const handleNegoNeeded = useCallback(async () => {
    console.log('nego needed')
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);


  const stopStream = ({from})=>{
    setRemoteStream('');// this was the error

  }

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      console.log(' incoming nego needed')
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = async ({ ans }) => {
    await peer.setLocalDescription(ans);
  };

  const closePeerConnection= async ()=>{
    if (peer && peer.peer) {
      // Close all media tracks in the local stream
      if (myStream) {
        for (const track of myStream.getTracks()) {
          await track.stop();
        }
      }
  
      // Close the peer connection
      peer.peer.close();
    }
    setIncomingCall(false);
    setCallAccepted(false);
    setMyStream('');
    setRemoteStream('');
    console.log('ending');
    socket.emit('call:ended',{to:remoteSocketId});
    
    navigate('/')
  }


  const callEnd= ({from})=>{
    if (peer && peer.peer) {
      // Close all media tracks in the local stream
      if (myStream) {
        console.log('stopping')
        for (const track of myStream.getTracks()) {
          track.stop();
        }
      }
      peer.peer.close();
    }

    setIncomingCall(false)
    setCallAccepted(false)
    setMyStream('')
    setRemoteStream('')
    
    navigate('/')
  }


  const playerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && playerRef.current) {
        captureFrame();
    }
}, [remoteStream]);
  
const captureFrame = useCallback(() => {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (playerRef.current && playerRef.current.getInternalPlayer()) {
          const videoElement = playerRef.current.getInternalPlayer();
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;

          context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          const frame = canvas.toDataURL('image/jpeg');
          if(frame!='data:,' && remoteStream)
          sendFrameToBackend(frame);
          setTimeout(() => {
            console.log("8 seconds have passed.");
            requestAnimationFrame(captureFrame);  // Continue capturing
        }, 4000); // 4000 milliseconds = 4 seconds
      }
  },[remoteStream]);

  const sendFrameToBackend = async (frame) => {
      const response = await fetch('https://videocallapp-ufmd.onrender.com/process-frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frame })
      });
      const result = await response.json();
      setExpression(result);// Process the response
  };

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      let remoteStrea = ev.streams;
      console.log(remoteStrea)
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStrea[0]);
    });
    return () => {
      peer.peer.removeEventListener("track", () => {});
    };
  }, [remoteStream]); // Remove 'video' from dependency array
  
  

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);
    socket.on('post:call',postCall);
    socket.on('stop:stream',stopStream);
    socket.on('call:end',callEnd)

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
      socket.off('post:call',postCall)
      socket.off('stop:stream',stopStream)
      socket.off('call:end',callEnd)
      
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
    postCall,
    stopStream,
    callEnd
  ]);

  return (
    <div style={{'height':'100vh','background':`url(${backgroundImageUrl}`,'backgroundSize':'cover','backgroundPosition':'center','marginTop':'-22px'}}>
      <h1 style={{'color':'white', 'paddingTop':'50px'}}>Room Page</h1>
      <h2 style={{'color':'white'}}>{remoteSocketId ? "Connected" : "No one in room"}</h2>
      {(remoteSocketId && !incomingCall && !callAccepted) && <button onClick={handleCallUser} style={{'backgroundColor':'#61ff33','borderRadius':'40px','height':'50px', 'width':'50px','cursor':'pointer'}}>
        <FaPhoneAlt style={{'color':'ffffff', 'backgroundColor':'61ff33','height':'30px', 'width':'30px'}}/></button>}
      <div style={{'display':'flex','justifyContent':'space-evenly'}}>
      {myStream && (
        <div> 
          <h4 style={{'color':'white'}}>My Stream</h4>
          <ReactPlayer
            playing
            muted = {audio}
            height="400px"
            width="400px"
            border='3px solid green'
            url={myStream}
          />
        </div>
      )}
      {remoteStream && (
        <div> 
          <h4 style={{'color':'white'}}>Remote Stream</h4>
          <ReactPlayer
            playing
            muted = {audio}
            height="400px"
            width="400px"
            border='3px solid green'
            ref={playerRef}
            url={remoteStream}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="ex"><RiAiGenerate style={{'color':'white', 'background':'black'}}/><h4 style={{'color':'white'}}>Detected Expression : <h2 style={{'color':'#61ff33'}}>{expression}</h2></h4></div>
        </div>
      )}
      </div>
      <div style={{'display':'flex','marginTop':'50px','justifyContent':'center'}}>
      {myStream && <button  onClick={sendStreams}  style={{'margin':'4px','backgroundColor':'#61ff33','borderRadius':'40px','height':'50px', 'width':'50px','cursor':'pointer'}}>
        {video?<FaVideo style={{'color':'ffffff', 'backgroundColor':'61ff33','height':'30px', 'width':'30px'}}/>
        :<FaVideoSlash style={{'color':'ffffff', 'backgroundColor':'61ff33','height':'30px', 'width':'30px'}}/>}</button>}
        {myStream && <button  style={{'margin':'4px','backgroundColor':'#61ff33','borderRadius':'40px','height':'50px', 'width':'50px','cursor':'pointer'}}>
        {audio?<FaMicrophone onClick={()=>{setAudio(false)}} style={{'color':'ffffff', 'backgroundColor':'61ff33','height':'30px', 'width':'30px'}}/>
        :<FaMicrophoneSlash onClick={()=>{setAudio(true)}} style={{'color':'ffffff', 'backgroundColor':'61ff33','height':'30px', 'width':'30px'}}/>}</button>}
        {(callAccepted) && <button onClick={closePeerConnection} style={{'margin':'4px', 'backgroundColor':'white','borderRadius':'40px','height':'50px', 'width':'50px','cursor':'pointer'}}>
        <FcEndCall style={{'color':'white', 'backgroundColor':'white','height':'30px', 'width':'30px'}}/></button>}
      </div>
    </div>
  );
};

export default RoomPage;
