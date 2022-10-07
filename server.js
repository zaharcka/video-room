const express = require("express");
const app = express();
const server = require('http').Server(app);

const { Server } = require('socket.io');
const io = new Server(server);

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get("/", (req, res) => {
    res.redirect('/room')
});

app.get('/room', (req, res) =>{
    res.render('room', {roomId: 'room'})
});

io.on("connection", (socket) => {
    console.log('Socket>>>', socket);
    socket.on('join-room', (roomId, userId) => {
        socket.to(roomId).broadcast.emit('user-connected', userId)
    })
});

server.listen(3030);