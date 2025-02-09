package main

import (
	"encoding/json"
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
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	// Create a new WebRTC configuration
	config := webrtc.Configuration{
		ICEServers: []webrtc.ICEServer{
			{
				URLs: []string{"stun:stun.l.google.com:19302"},
			},
		},
	}

	// Create a new RTCPeerConnection
	peerConnection, err := webrtc.NewPeerConnection(config)
	if err != nil {
		log.Printf("Failed to create peer connection: %v", err)
		return
	}
	defer peerConnection.Close()

	// Set up handlers for peer connection events
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
			log.Printf("Failed to send ICE candidate: %v", err)
		}
	})

	peerConnection.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		log.Printf("New track received: %s", track.Kind().String())
	})

	// Handle WebSocket messages
	for {
		var message WebSocketMessage
		err := conn.ReadJSON(&message)
		if err != nil {
			log.Printf("Failed to read message: %v", err)
			break
		}

		switch message.Type {
		case "offer":
			err = peerConnection.SetRemoteDescription(message.SDP)
			if err != nil {
				log.Printf("Failed to set remote description: %v", err)
				continue
			}

			answer, err := peerConnection.CreateAnswer(nil)
			if err != nil {
				log.Printf("Failed to create answer: %v", err)
				continue
			}

			err = peerConnection.SetLocalDescription(answer)
			if err != nil {
				log.Printf("Failed to set local description: %v", err)
				continue
			}

			response := WebSocketMessage{
				Type: "answer",
				SDP:  *peerConnection.LocalDescription(),
			}

			if err := conn.WriteJSON(response); err != nil {
				log.Printf("Failed to send answer: %v", err)
			}

		case "ice-candidate":
			if err := peerConnection.AddICECandidate(message.Candidate); err != nil {
				log.Printf("Failed to add ICE candidate: %v", err)
			}

		case "track-added":
			log.Printf("Client added new track of kind: %s", message.Kind)
		}
	}
}

func main() {
	// Serve static files
	fs := http.FileServer(http.Dir("../frontend"))
	http.Handle("/", fs)

	// WebSocket endpoint
	http.HandleFunc("/ws", handleWebSocket)

	log.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
