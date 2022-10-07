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
        console.log('ADD VIDEO STREAM')
        peer.on('call', (call) => {
            console.log('PEER.ON CALL')
            call.answer(stream);
            const video = document.createElement('video');
            call.on('stream', (userVideoStream) => {
                console.log('CALL.ON STREAM')
                addVideoStream(video, userVideoStream)
            })
        });
        socket.on('user-connected', (userId) => {
            console.log('ON USER CONNECTED>>>>')
            connectToUser(userId, stream)
        })
    }).catch((error) => {
        console.log('Error getting media>>>>', error)
});

const connectToUser = (userId, stream) => {
    console.log('ON USER CONNECTED handler>>>>')
    const call = peer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', (userVideoStream) => {
        console.log('ON USER CONNECTED call stream>>>>')
        addVideoStream(video, userVideoStream)
    })
};

peer.on('open', (id) => {
    console.log('peer.on');
    socket.emit('join-room', ROOM_ID, id)
})

const addVideoStream = (video, stream) => {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
        video.play();
        videoGrid.append(video);
    });
};