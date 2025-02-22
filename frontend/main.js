let peerConnection;
let ws;
const configuration = { 
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] 
};
// 添加一个数组来存储待处理的 ICE candidates
let pendingCandidates = [];

// WebSocket 设置
function connectWebSocket() {
    ws = new WebSocket('ws://localhost:8080/ws');
    
    ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        
        switch(message.type) {
            case 'offer':
                await handleOffer(message.sdp);
                break;
            case 'answer':
                await handleAnswer(message.sdp);
                // 处理之前存储的候选者
                while (pendingCandidates.length > 0) {
                    const candidate = pendingCandidates.shift();
                    await handleIceCandidate(candidate);
                }
                break;
            case 'ice-candidate':
                // 如果还没有设置远程描述，先将候选者存储起来
                if (!peerConnection.remoteDescription) {
                    pendingCandidates.push(message.candidate);
                } else {
                    await handleIceCandidate(message.candidate);
                }
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
            updateTracksDisplay();
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

// 添加处理 answer 的函数
async function handleAnswer(sdp) {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (error) {
        console.error('Error handling answer:', error);
    }
}

// 修改 handleIceCandidate 函数
async function handleIceCandidate(candidate) {
    try {
        if (candidate && peerConnection.remoteDescription) {
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
        
        console.log('开始流传输前的所有轨道:', peerConnection.getSenders());
        
        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
        });
        
        updateTracksDisplay();
        
        console.log('开始流传输后的所有轨道:', peerConnection.getSenders());
        console.log('当前流中的轨道:', stream.getTracks().map(track => ({
            kind: track.kind,
            id: track.id,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted
        })));
        
    } catch (error) {
        console.error('Error accessing media devices:', error);
    }
}

// 添加新的视频轨道
async function addVideoTrack() {
    try {
        // 检查 peerConnection 是否已初始化
        if (!peerConnection) {
            console.error('PeerConnection 未初始化，请先点击开始按钮');
            alert('请先点击开始按钮建立连接');
            return;
        }

        // 请求访问用户的摄像头
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // 获取视频轨道
        const videoTrack = stream.getVideoTracks()[0];
        
        // 添加日志
        console.log('添加视频轨道前的所有轨道:', peerConnection.getSenders());
        peerConnection.addTrack(videoTrack, stream);
        updateTracksDisplay();
        console.log('添加视频轨道后的所有轨道:', peerConnection.getSenders());
        
        // 通过 WebSocket 通知对方有新的视频轨道被添加
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
        // 检查 peerConnection 是否已初始化
        if (!peerConnection) {
            console.error('PeerConnection 未初始化，请先点击开始按钮');
            alert('请先点击开始按钮建立连接');
            return;
        }

        // 请求访问用户的麦克风
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // 获取音频轨道
        const audioTrack = stream.getAudioTracks()[0];
        
        // 将新的音频轨道添加到现有的 peer connection 中
        console.log('添加音频轨道前的所有轨道:', peerConnection.getSenders());
        peerConnection.addTrack(audioTrack, stream);
        updateTracksDisplay();
        console.log('添加音频轨道后的所有轨道:', peerConnection.getSenders());
        // 通过 WebSocket 通知对方有新的音频轨道被添加
        ws.send(JSON.stringify({
            type: 'track-added',
            kind: 'audio'
        }));
    } catch (error) {
        console.error('Error adding audio track:', error);
    }
}

// 删除视频轨道
async function removeVideoTrack() {
    try {
        if (!peerConnection) {
            console.error('PeerConnection 未初始化，请先点击开始按钮');
            alert('请先点击开始按钮建立连接');
            return;
        }

        console.log('删除视频轨道前的所有轨道:', peerConnection.getSenders());
        
        // 找到所有视频轨道的发送器
        const videoSenders = peerConnection.getSenders().filter(sender => 
            sender.track && sender.track.kind === 'video'
        );

        // 删除所有视频轨道
        for (const sender of videoSenders) {
            await peerConnection.removeTrack(sender);
            sender.track.stop(); // 停止轨道
        }

        updateTracksDisplay();
        
        console.log('删除视频轨道后的所有轨道:', peerConnection.getSenders());

        // 通知对方视频轨道已被删除
        ws.send(JSON.stringify({
            type: 'track-removed',
            kind: 'video'
        }));

    } catch (error) {
        console.error('Error removing video track:', error);
    }
}

// 删除音频轨道
async function removeAudioTrack() {
    try {
        if (!peerConnection) {
            console.error('PeerConnection 未初始化，请先点击开始按钮');
            alert('请先点击开始按钮建立连接');
            return;
        }

        console.log('删除音频轨道前的所有轨道:', peerConnection.getSenders());

        // 找到所有音频轨道的发送器
        const audioSenders = peerConnection.getSenders().filter(sender => 
            sender.track && sender.track.kind === 'audio'
        );

        // 删除所有音频轨道
        for (const sender of audioSenders) {
            await peerConnection.removeTrack(sender);
            sender.track.stop(); // 停止轨道
        }

        updateTracksDisplay();
        
        console.log('删除音频轨道后的所有轨道:', peerConnection.getSenders());

        // 通知对方音频轨道已被删除
        ws.send(JSON.stringify({
            type: 'track-removed',
            kind: 'audio'
        }));

    } catch (error) {
        console.error('Error removing audio track:', error);
    }
}

// 添加一个获取当前轨道信息的辅助函数
function getTracksInfo() {
    const senders = peerConnection.getSenders();
    const tracks = senders.map(s => ({
        kind: s.track?.kind,
        id: s.track?.id,
        label: s.track?.label,
        enabled: s.track?.enabled,
        readyState: s.track?.readyState
    })).filter(t => t.kind); // 只返回还有轨道的sender信息

    return {
        totalTracks: tracks.length,
        tracks: tracks,
        videoTracks: tracks.filter(t => t.kind === 'video').length,
        audioTracks: tracks.filter(t => t.kind === 'audio').length
    };
}

function updateTracksDisplay() {
    const tracksContainer = document.getElementById('tracksContainer');
    const senders = peerConnection.getSenders();
    
    tracksContainer.innerHTML = '';
    
    senders.forEach((sender, index) => {
        if (sender.track) {
            const trackDiv = document.createElement('div');
            trackDiv.className = 'track-item';
            
            const trackInfo = document.createElement('div');
            trackInfo.className = 'track-info';
            trackInfo.textContent = `${sender.track.kind} - ID: ${sender.track.id} - Label: ${sender.track.label}`;
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-track-btn';
            deleteButton.textContent = '删除';
            deleteButton.onclick = async () => {
                try {
                    const track = sender.track;
                    console.log('当前删除轨道信息:', track);
                    if (track) {
                        console.log('删除前轨道状态:', getTracksInfo());

                        // 先停止轨道
                        track.stop();
                        // 再从 PeerConnection 中移除
                        await peerConnection.removeTrack(sender);
                        
                        // 通知对方轨道已被删除
                        ws.send(JSON.stringify({
                            type: 'track-removed',
                            kind: track.kind
                        }));

                        // 立即更新显示
                        updateTracksDisplay();

                        // 延迟检查轨道状态
                        setTimeout(() => {
                            console.log('删除后轨道状态:', getTracksInfo());
                        }, 1000);

                        // 再次检查确认最终状态
                        setTimeout(() => {
                            console.log('最终轨道状态:', getTracksInfo());
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Error removing track:', error);
                }
            };
            
            trackDiv.appendChild(trackInfo);
            trackDiv.appendChild(deleteButton);
            tracksContainer.appendChild(trackDiv);
        }
    });

    // 打印当前显示的轨道数量
    // console.log('当前显示的轨道状态:', getTracksInfo());
}

// 事件监听器
document.getElementById('startBtn').addEventListener('click', async () => {
    pendingCandidates = []; // 重置待处理的候选者
    await setupPeerConnection();
    connectWebSocket();
    await startStreaming();
});

document.getElementById('addVideoBtn').addEventListener('click', addVideoTrack);
document.getElementById('addAudioBtn').addEventListener('click', addAudioTrack);
document.getElementById('removeVideoBtn').addEventListener('click', removeVideoTrack);
document.getElementById('removeAudioBtn').addEventListener('click', removeAudioTrack);
