let myVideoStream;
const socket = io('/')
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;

var peer = new Peer(undefined, {
    path: '/peerjs',
    host: '/',
    port: '3030'
});

navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
})
    .then((stream) => {
        console.log('Success media!')
        myVideoStream = stream;
        addVideoStream(myVideo, stream);
        peer.on('call', (call) => {
            call.answer(stream);
            const video = document.createElement('video');
            call.on('stream', (userVideoStream) => {
                addVideoStream(video, userVideoStream)
            })
        });
        socket.on('user-connected', (userId) => {
            connectToUser(userId, stream)
        })
    }).catch((error) => {
        console.log('Error getting media>>>>', error)
});

const connectToUser = (userId, stream) => {
    const call = peer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream)
    })
};

peer.on('open', (id) => {
    socket.emit('join-room', 'room', id)
})

const addVideoStream = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
        video.play();
        videoGrid.append(video);
    });
};