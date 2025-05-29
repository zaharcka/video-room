let myVideoStream;
const socket = io('/');
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;

const peers = {}; // For tracking active peer connections
let myPeerId; // To store current user's peer ID

var peer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: '3030' // Make sure this port is consistent with your server if not default
});

navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
})
    .then((stream) => {
        // console.log('Successfully accessed media devices!');
        myVideoStream = stream;
        // Add local video immediately, userId (myPeerId) will be set in peer.on('open')
        addVideoStream(myVideo, stream, null); 

        peer.on('call', (call) => {
            // console.log('Incoming call from:', call.peer);
            call.answer(myVideoStream); // Answer the call with local stream
            const video = document.createElement('video');
            call.on('stream', (userVideoStream) => {
                // console.log('Received stream from:', call.peer);
                addVideoStream(video, userVideoStream, call.peer);
                peers[call.peer] = call; // Store incoming call
            });
            call.on('close', () => {
                // console.log('Call closed by remote peer:', call.peer);
                video.remove();
                delete peers[call.peer];
            });
        });

        socket.on('user-connected', (userId) => {
            // console.log('User connected:', userId);
            // Delay connection slightly to ensure peer is fully ready on the other side
            setTimeout(() => {
                connectToUser(userId, myVideoStream);
            }, 1000);
        });
    }).catch((error) => {
        console.error('Error getting media devices:', error);
});

peer.on('open', (id) => {
    myPeerId = id; // Store my PeerJS ID
    console.log('My PeerJS ID:', myPeerId);
    if (myVideo.srcObject) { // If local stream is already added to myVideo
        myVideo.setAttribute('data-user-id', myPeerId); // Set its data-user-id
    }
    socket.emit('join-room', ROOM_ID, id);
});

const addVideoStream = (video, stream, userId) => {
    video.srcObject = stream;
    if (userId) { // Ensure userId is provided
        video.setAttribute('data-user-id', userId);
    }
    video.addEventListener("loadedmetadata", () => {
        video.play();
    });
    // Check if video element is already in the grid to prevent duplicates
    if (!video.parentNode) {
        videoGrid.append(video);
    }
};

const connectToUser = (userId, stream) => {
    if (peers[userId]) {
        // console.log('Already connected or connecting to user:', userId);
        return; // Avoid duplicate calls
    }
    // console.log('Connecting to user:', userId);
    const call = peer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', (userVideoStream) => {
        // console.log('Received stream from user:', userId);
        addVideoStream(video, userVideoStream, userId);
        peers[userId] = call; // Store outgoing call
    });
    call.on('close', () => {
        // console.log('Call closed with user:', userId);
        video.remove();
        delete peers[userId];
    });
    // Handle errors during the call setup
    call.on('error', (err) => {
        console.error('Failed to connect to user:', userId, err);
        video.remove(); // Clean up video element on error
        // Optionally, remove from peers if it was added, though typically 'close' would also fire
        delete peers[userId]; 
    });
};

socket.on('user-disconnected', (userId) => {
    console.log('User disconnected event:', userId); // Kept as per instruction
    if (peers[userId]) {
        // console.log('Closing peer connection for user:', userId);
        peers[userId].close(); // This should trigger the 'close' event on the call object
        // delete peers[userId]; // Deletion is now handled in call.on('close')
    }
    // Fallback to remove video elements if 'close' event didn't fire or element persists
    const videoElements = videoGrid.querySelectorAll(`video[data-user-id="${userId}"]`);
    videoElements.forEach(el => {
        // console.log('Removing video for disconnected user (fallback):', userId);
        el.remove();
    });
});

// Optional: More robust error handling for peer object itself
peer.on('error', (err) => {
    console.error('PeerJS error:', err);
    // Depending on the error, you might want to inform the user or attempt to reconnect.
});

// Wait for the DOM to be fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', () => {
    const toggleVideoBtn = document.getElementById('toggle-video-btn');
    const toggleVideoIcon = document.getElementById('toggle-video-icon');
    const toggleMicBtn = document.getElementById('toggle-mic-btn');
    const toggleMicIcon = document.getElementById('toggle-mic-icon');

    if (toggleVideoBtn && toggleVideoIcon) {
        toggleVideoBtn.addEventListener('click', () => {
            if (myVideoStream && myVideoStream.getVideoTracks().length > 0) {
                const videoTrack = myVideoStream.getVideoTracks()[0];
                videoTrack.enabled = !videoTrack.enabled; // Toggle video state

                if (videoTrack.enabled) {
                    toggleVideoIcon.className = 'fa fa-video-camera';
                    toggleVideoBtn.classList.remove('control-disabled'); // Optional: for styling
                    // console.log('Video enabled');
                } else {
                    toggleVideoIcon.className = 'fa fa-video-slash';
                    toggleVideoBtn.classList.add('control-disabled'); // Optional: for styling
                    // console.log('Video disabled');
                }
            } else {
                console.log('Video stream or track not available.'); // Kept as a useful warning
            }
        });
    }

    if (toggleMicBtn && toggleMicIcon) {
        toggleMicBtn.addEventListener('click', () => {
            if (myVideoStream && myVideoStream.getAudioTracks().length > 0) {
                const audioTrack = myVideoStream.getAudioTracks()[0];
                audioTrack.enabled = !audioTrack.enabled; // Toggle audio state

                if (audioTrack.enabled) {
                    toggleMicIcon.className = 'fa fa-microphone';
                    toggleMicBtn.classList.remove('control-disabled'); // Optional: for styling
                    // console.log('Microphone enabled');
                } else {
                    toggleMicIcon.className = 'fa fa-microphone-slash';
                    toggleMicBtn.classList.add('control-disabled'); // Optional: for styling
                    // console.log('Microphone disabled (muted)');
                }
            } else {
                console.log('Audio stream or track not available.'); // Kept as a useful warning
            }
        });
    }

    // Chat functionality
    const chatInput = document.getElementById('chat_message');
    const chatMessagesList = document.getElementById('chat-messages-list');

    if (chatInput && chatMessagesList) {
        chatInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && chatInput.value.trim() !== '') {
                event.preventDefault(); // Prevent default form submission or line break
                const message = chatInput.value;
                // ROOM_ID should be globally available from room.ejs
                // myPeerId is also available if you prefer to send that as sender ID
                socket.emit('send-chat-message', ROOM_ID, message); 
                chatInput.value = ''; // Clear input after sending
            }
        });
    }

    // Leave Room functionality
    const leaveRoomBtn = document.getElementById('leave-room-btn');

    if (leaveRoomBtn) {
        leaveRoomBtn.addEventListener('click', () => {
            // console.log('Leave Room button clicked.');

            // 1. Close all PeerJS connections
            for (const peerId in peers) {
                if (peers.hasOwnProperty(peerId) && peers[peerId]) {
                    peers[peerId].close();
                    // console.log('Closed peer connection with:', peerId);
                }
            }
            // Clear the peers object by re-assigning or deleting properties
            Object.keys(peers).forEach(key => delete peers[key]);


            // 2. Stop local media stream tracks
            if (myVideoStream) {
                myVideoStream.getTracks().forEach(track => {
                    track.stop();
                });
                // console.log('Local media stream stopped.');
            }

            // 3. Remove local video element from the grid
            if (myVideo && myVideo.parentNode) {
                 myVideo.parentNode.removeChild(myVideo);
                 // console.log('Local video element removed.');
            }
            
            // 4. Disconnect from Socket.IO server
            // This will trigger the 'disconnect' event on the server for this client
            if (socket) {
                socket.disconnect();
                // console.log('Disconnected from Socket.IO server.');
            }

            // 5. Redirect to landing page
            window.location.href = '/';
        });
    }
});

socket.on('new-chat-message', (data) => {
    const chatMessagesList = document.getElementById('chat-messages-list'); // Ensure it's accessible
    if (chatMessagesList && data.message && data.userId) {
        const li = document.createElement('li');
        // Displaying part of userId for brevity, or could be a nickname later
        li.textContent = `User ${data.userId.substring(0, 8)}: ${data.message}`; 
        chatMessagesList.appendChild(li);
        // Auto-scroll to the bottom
        chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
    }
});