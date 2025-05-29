const express = require("express");
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { ExpressPeerServer } = require('peer');

const peerServer = ExpressPeerServer(server, {
    debug: true,
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/peerjs', peerServer);

app.get("/", (req, res) => {
    res.render('landing');
});

app.get('/room/:roomId', (req, res) =>{
    res.render('room', { roomId: req.params.roomId });
});

io.on("connection", (socket) => {
    let userCurrentRoom = null;
    let userCurrentId = null;

    socket.on('join-room', (roomId, userId) => {
        // console.log('SOCKET ON JOIN ROOM'); // Verbose
        // console.log('roomId:', roomId); // Verbose
        // console.log('userId:', userId); // Verbose

        userCurrentRoom = roomId; 
        userCurrentId = userId;   
        socket.userId = userId; // Set userId on the socket object

        socket.join(roomId); 
        // Emit to others in the room that a new user has connected
        socket.to(roomId).emit('user-connected', userId); 
    });

    socket.on('send-chat-message', (roomId, message) => {
        // userCurrentId is from the closure, socket.userId is directly on the socket
        if (socket.userId) { 
            console.log(`Message from ${socket.userId} in room ${roomId}: ${message}`);
            io.to(roomId).emit('new-chat-message', { 
                message: message, 
                userId: socket.userId 
            });
        } else {
            // This case should ideally not happen if join-room logic is correct
            console.log(`Anonymous message in room ${roomId}: ${message}. Sender ID not found on socket.`);
        }
    });

    socket.on('disconnect', () => {
        // Use socket.userId and a room variable stored on socket, or use userCurrentId/userCurrentRoom from closure
        if (socket.userId && userCurrentRoom) { // userCurrentRoom is from closure, might be better to store on socket too
            console.log('USER DISCONNECTED:', socket.userId, 'from room:', userCurrentRoom);
            socket.to(userCurrentRoom).emit('user-disconnected', socket.userId);
        } else {
            console.log('A user disconnected (no room/user info found on socket or in closure).');
        }
    });
});

server.listen(3030, () => {
    console.log("Server is running on port 3030");
});