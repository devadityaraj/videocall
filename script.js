
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, onValue, push } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Your web app's Firebase configuration

const firebaseConfig = {
  apiKey: "AIzaSyC4NbTh3-zaHQL_42CGucLNUeBcZp_iQKs",
  authDomain: "videocall1234-afb61.firebaseapp.com",
  databaseURL: "https://videocall1234-afb61-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "videocall1234-afb61",
  storageBucket: "videocall1234-afb61.appspot.com",
  messagingSenderId: "479042585434",
  appId: "1:479042585434:web:c16925ad2b6685abd2a963"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallButton = document.getElementById('startCall');
const joinCallButton = document.getElementById('joinCall');
const muteCallButton = document.getElementById('muteCall');
const hangupCallButton = document.getElementById('hangupCall');

let localStream;
let remoteStream;
let peerConnection;
let isMuted = false;
let callId;

const servers = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    }
  ]
};

startCallButton.addEventListener('click', startCall);
joinCallButton.addEventListener('click', joinCall);
muteCallButton.addEventListener('click', toggleMute);
hangupCallButton.addEventListener('click', hangup);

async function startCall() {
  try {
    callId = prompt("Enter a unique call ID:");
    console.log("Starting call with ID:", callId);
    startCallButton.style.display = 'none';
    hangupCallButton.style.display = 'inline';

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(servers);
    peerConnection.onicecandidate = handleICECandidateEvent;
    peerConnection.ontrack = handleTrackEvent;

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const callRef = ref(db, `calls/${callId}`);
    await set(callRef, { offer });

    onValue(callRef, async snapshot => {
      const data = snapshot.val();
      if (data && data.answer && !peerConnection.currentRemoteDescription) {
        const answer = new RTCSessionDescription(data.answer);
        await peerConnection.setRemoteDescription(answer);
      }
    });
  } catch (error) {
    console.error("Error starting call:", error);
  }
}

async function joinCall() {
  try {
    callId = prompt("Enter the call ID:");
    console.log("Joining call with ID:", callId);
    joinCallButton.style.display = 'none';
    muteCallButton.style.display = 'inline';

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(servers);
    peerConnection.onicecandidate = handleICECandidateEvent;
    peerConnection.ontrack = handleTrackEvent;

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    const callRef = ref(db, `calls/${callId}`);
    onValue(callRef, async snapshot => {
      const data = snapshot.val();
      if (data && data.offer && !peerConnection.currentRemoteDescription) {
        const offer = new RTCSessionDescription(data.offer);
        await peerConnection.setRemoteDescription(offer);

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await set(callRef, { offer: data.offer, answer });
      }
    });
  } catch (error) {
    console.error("Error joining call:", error);
  }
}

function handleICECandidateEvent(event) {
  if (event.candidate) {
    const candidate = event.candidate.toJSON();
    const callRef = ref(db, `calls/${callId}/candidates`);
    const newCandidateRef = push(callRef);
    set(newCandidateRef, candidate);
  }
}

function handleTrackEvent(event) {
  remoteVideo.srcObject = event.streams[0];
}

function toggleMute() {
  isMuted = !isMuted;
  localStream.getAudioTracks()[0].enabled = !isMuted;
  muteCallButton.textContent = isMuted ? 'Unmute' : 'Mute';
}

function hangup() {
  peerConnection.close();
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  startCallButton.style.display = 'inline';
  hangupCallButton.style.display = 'none';
  joinCallButton.style.display = 'inline';
  muteCallButton.style.display = 'none';
}
