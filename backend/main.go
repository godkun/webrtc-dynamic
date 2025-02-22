package main

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v4"
)

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
)

type WebSocketMessage struct {
	Type      string                    `json:"type"`
	SDP       webrtc.SessionDescription `json:"sdp,omitempty"`
	Candidate webrtc.ICECandidateInit   `json:"candidate,omitempty"`
	Kind      string                    `json:"kind,omitempty"`
}

type PeerConnection struct {
	connection *webrtc.PeerConnection
	mutex      sync.Mutex
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("连接升级失败: %v", err)
		return
	}
	defer conn.Close()

	// 创建新的 WebRTC 配置
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs: []string{"stun:stun.l.google.com:19302"},
			},
		},
	}

	// 创建新的 RTCPeerConnection
	peerConnection, err := webrtc.NewPeerConnection(config)
	if err != nil {
		log.Printf("创建点对点连接失败: %v", err)
		return
	}
	defer peerConnection.Close()

	// 设置点对点连接事件处理器
	peerConnection.OnICECandidate(func(ice *webrtc.ICECandidate) {
		if ice == nil {
			return
		}

		candidateJSON := ice.ToJSON()
		message := WebSocketMessage{
			Type:      "ice-candidate",
			Candidate: candidateJSON,
		}

		if err := conn.WriteJSON(message); err != nil {
			log.Printf("发送 ICE candidate 失败: %v", err)
		}
	})

	peerConnection.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		log.Printf("收到新的媒体轨道: %s, ID: %s, Label: %s, StreamID: %s",
			track.Kind().String(),
			track.ID(),
			track.StreamID(),
			track.RID())
	})

	// 处理 WebSocket 消息
	for {
		var message WebSocketMessage
		err := conn.ReadJSON(&message)
		if err != nil {
			log.Printf("读取消息失败: %v", err)
			break
		}

		switch message.Type {
		case "offer":
			err = peerConnection.SetRemoteDescription(message.SDP)
			if err != nil {
				log.Printf("设置远程描述失败: %v", err)
				continue
			}

			answer, err := peerConnection.CreateAnswer(nil)
			if err != nil {
				log.Printf("创建应答失败: %v", err)
				continue
			}

			err = peerConnection.SetLocalDescription(answer)
			if err != nil {
				log.Printf("设置本地描述失败: %v", err)
				continue
			}

			response := WebSocketMessage{
				Type: "answer",
				SDP:  *peerConnection.LocalDescription(),
			}

			if err := conn.WriteJSON(response); err != nil {
				log.Printf("发送应答失败: %v", err)
			}

		case "ice-candidate":
			if err := peerConnection.AddICECandidate(message.Candidate); err != nil {
				log.Printf("添加 ICE candidate 失败: %v", err)
			}

		case "track-added":
			log.Printf("客户端添加了新的媒体轨道类型: %s", message.Kind)

		case "track-removed":
			log.Printf("客户端移除了媒体轨道类型: %s", message.Kind)
			// 打印当前剩余的轨道数量
			receivers := peerConnection.GetReceivers()
			activeReceivers := 0
			for _, receiver := range receivers {
				if receiver.Track() != nil {
					activeReceivers++
				}
			}
			log.Printf("当前剩余轨道数量: %d", activeReceivers)
			// 按类型统计剩余轨道
			videoTracks := 0
			audioTracks := 0
			for _, receiver := range receivers {
				if receiver.Track() != nil {
					if receiver.Track().Kind() == webrtc.RTPCodecTypeVideo {
						videoTracks++
					} else if receiver.Track().Kind() == webrtc.RTPCodecTypeAudio {
						audioTracks++
					}
				}
			}
			log.Printf("剩余视频轨道: %d, 音频轨道: %d", videoTracks, audioTracks)
		}
	}
}

func main() {
	// 提供静态文件服务
	fs := http.FileServer(http.Dir("../frontend"))
	http.Handle("/", fs)

	// WebSocket 端点
	http.HandleFunc("/ws", handleWebSocket)

	log.Println("服务器启动在端口 :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
