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
var throttleMs = 2000;

sio.on('connection', function (socket) {

    allSockets.push(socket);

    socket.myUid = nextUid++;
    socket.myScore = 0;
    socket.myWord = '';
    socket.myTod = new Date().getTime() - throttleMs;
    socket.myName = 'player ' + socket.myUid;
    socket.mySpeaker = 'default';
    socket.join(socket.mySpeaker);

    console.log('player ' + socket.myUid + ': connected');
    console.log('players: ' + allSockets.length);

    socket.on('name', function (name) { // player tells us their name
        console.log('player ' + socket.myUid + ': name = ' + name);
        socket.myName = name;
    });

    socket.on('speaker', function (speaker) { // player is listening to a specific speaker
        speaker = speaker.toLowerCase();
        console.log('player ' + socket.myUid + ': speaker = ' + speaker);
        socket.leave(socket.mySpeaker);
        socket.mySpeaker = speaker;
        socket.join(socket.mySpeaker);
    });

    socket.on('heard', function (word) { // player heard a word
        word = word.toLowerCase();
        var tod = new Date().getTime();
        if (socket.myTod + throttleMs > tod) { // limit player to one heard every 2 seconds
            console.log('player ' + socket.myUid + ': throttled = ' + word);
        }
        else {
            console.log('player ' + socket.myUid + ': heard = ' + word);
            for (var i = 0; i < allSockets.length; i++) { // other players score from this player ...
                var other = allSockets[i];
                if (other.mySpeaker === socket.mySpeaker) { // .. who are listening to the same speaker ...
                    if (other.myWord === word) { // ... and just played the same word ...
                        if (other.myTod + throttleMs > tod) { // ... less than 2 seconds ago.
                            other.myScore++; // logically this cannot be the same as the player (2 second rule)
                            console.log('  player ' + other.myUid + ': scores');
                        }
                    }
                }
            }
            socket.myTod = tod; // save so this player can score from others who play this word in the next two seconds
            socket.myWord = word;
        }
    });

    socket.on('score', function () { // player wants to know their score
        console.log('player ' + socket.myUid + ': score = ' + socket.myScore);
        socket.emit('score', socket.myScore);
    });

    socket.on('scores', function (n) { // player wants to know the top n scores
        console.log('player ' + socket.myUid + ': scores = ' + n);

        var players = allSockets
            .map(function (s) { return { name: s.myName, score: s.myScore, speaker: s.mySpeaker }; })
            .filter(function (a) { return a.speaker === socket.mySpeaker; })
            .sort(function (a, b) { return b.score - a.score; })
            .slice(0, n - 1);

        socket.emit('scores', players);
    });

    socket.on('disconnect', function () { // player is bored
        allSockets.splice(allSockets.indexOf(socket), 1);
        console.log('player ' + socket.myUid + ': disconnected');
        console.log('players: ' + allSockets.length);
    });
});

server.listen(3000, function () {
    console.log('Server on port 3000');
});