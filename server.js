const express = require("express");
const app = express();
const server = require('http').Server(app);

const { Server } = require('socket.io');
const io = require('socket.io')(server);

const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
    debug: true,

});
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use('/peerjs', peerServer);

app.get("/", (req, res) => {
    res.redirect('/room')
});

app.get('/room', (req, res) =>{
    res.render('room', {roomId: 'room'})
});

io.on("connection", (socket) => {
    socket.on('join-room', (roomId, userId) => {
        console.log('SOCKET ON JOIN ROOM');
        console.log('SOCKET ON JOIN ROOM', roomId)
        console.log('SOCKET ON JOIN ROOM', userId)
        socket.to(roomId).emit('user-connected', userId)
        //console.log('socket.to(roomId)>>>>>', socket);
    })
});

server.listen(3030);