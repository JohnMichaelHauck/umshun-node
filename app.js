var Express = require('express');
var Server = require('http').Server;
var Sio = require('socket.io');
var Path = require('path');

var app = Express();
var server = Server(app);
var sio = Sio(server);

app.use(Express.static(Path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.sendFile(Path.join(__dirname, 'public', 'index.html'));
});

var allSockets = [];
var nextUid = 1;
var throttle = 2000;

sio.on('connection', function (socket) {
    
    socket.myUid = nextUid++;
    socket.myScore = 0;
    socket.myWord = '';
    socket.myTod = new Date().getTime() - throttle;
    
    allSockets.push(socket);
    console.log('connected ' + socket.myUid + ', players: ' + allSockets.length);

    socket.on('heard', function (word) {
        var tod = new Date().getTime();
        if (socket.myTod + throttle > tod) {
            console.log('spam from ' + socket.myUid);
        }
        else {
            console.log('heard ' + word + ' from ' + socket.myUid);
            for (var i = 0; i < allSockets.length; i++) {
                var other = allSockets[i];
                if (other != socket) {
                    if (other.myWord == word) {
                        if (other.myTod + throttle > tod) {
                            other.myScore++;
                            console.log('  player ' + other.myUid + ' gets a point');
                        }
                    }
                }
            }
            socket.myTod = tod;
            socket.myWord = word;
        }
    });
    
    socket.on('score', function () {
       socket.emit('score', socket.myScore);
       console.log('player ' + socket.myUid + ', score: ' + socket.myScore); 
    });

    socket.on('disconnect', function () {
        allSockets.splice(allSockets.indexOf(socket), 1);
        console.log('disconnected ' + socket.myUid + ', players: ' + allSockets.length);
    });
});

server.listen(3000, function () {
    console.log('Server');
});