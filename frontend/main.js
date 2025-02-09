let peerConnection;
let ws;
const configuration = { 
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] 
};

// WebSocket setup
function connectWebSocket() {
    ws = new WebSocket('ws://localhost:8080/ws');
    
    ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        
        switch(message.type) {
            case 'offer':
                await handleOffer(message.sdp);
                break;
            case 'ice-candidate':
                await handleIceCandidate(message.candidate);
                break;
        }
    };
    
    ws.onopen = () => {
        console.log('WebSocket connected');
    };
}

// PeerConnection setup and management
async function setupPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({
                type: 'ice-candidate',
                candidate: event.candidate
            }));
        }
    };
    
    peerConnection.onnegotiationneeded = async () => {
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            ws.send(JSON.stringify({
                type: 'offer',
                sdp: peerConnection.localDescription
            }));
        } catch (error) {
            console.error('Error during negotiation:', error);
        }
    };
}

// Handle incoming offers
async function handleOffer(sdp) {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        ws.send(JSON.stringify({
            type: 'answer',
            sdp: answer
        }));
    } catch (error) {
        console.error('Error handling offer:', error);
    }
}

// Handle incoming ICE candidates
async function handleIceCandidate(candidate) {
    try {
        if (candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
}

// Media stream handling
async function startStreaming() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        document.getElementById('localVideo').srcObject = stream;
        
        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
        });
        
    } catch (error) {
        console.error('Error accessing media devices:', error);
    }
}

// Add new video track
async function addVideoTrack() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        
        peerConnection.addTrack(videoTrack, stream);
        ws.send(JSON.stringify({
            type: 'track-added',
            kind: 'video'
        }));
    } catch (error) {
        console.error('Error adding video track:', error);
    }
}

// Add new audio track
async function addAudioTrack() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = stream.getAudioTracks()[0];
        
        peerConnection.addTrack(audioTrack, stream);
        ws.send(JSON.stringify({
            type: 'track-added',
            kind: 'audio'
        }));
    } catch (error) {
        console.error('Error adding audio track:', error);
    }
}

// Event listeners
document.getElementById('startBtn').addEventListener('click', async () => {
    await setupPeerConnection();
    connectWebSocket();
    await startStreaming();
});

document.getElementById('addVideoBtn').addEventListener('click', addVideoTrack);
document.getElementById('addAudioBtn').addEventListener('click', addAudioTrack);
