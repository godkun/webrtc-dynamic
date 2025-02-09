let peerConnection;
let ws;
const configuration = { 
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] 
};

// WebSocket 设置
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

// PeerConnection 设置和管理
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

// 处理接收到的 offer
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

// 处理接收到的 ICE candidate
async function handleIceCandidate(candidate) {
    try {
        if (candidate) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
}

// 媒体流处理
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

// 添加新的视频轨道
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

// 添加新的音频轨道
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

// 事件监听器
document.getElementById('startBtn').addEventListener('click', async () => {
    await setupPeerConnection();
    connectWebSocket();
    await startStreaming();
});

document.getElementById('addVideoBtn').addEventListener('click', addVideoTrack);
document.getElementById('addAudioBtn').addEventListener('click', addAudioTrack);
