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

var throttleMs = 2000;
var speakers = {};

function addPlayerToSpeaker(socket) {
    socket.join(socket.mySpeaker);
    if (socket.mySpeaker in speakers === false) {
        var speaker = {};
        speaker.players = [];
        speaker.heards = {};
        speaker.scoresChanged = false;
        speakers[socket.mySpeaker] = speaker;
    }
    speakers[socket.mySpeaker].players.push(socket);
}

function removePlayerFromSpeaker(socket) {
    socket.leave(socket.mySpeaker);
    speakers[socket.mySpeaker].players.splice(speakers[socket.mySpeaker].players.indexOf(socket), 1);
    if (speakers[socket.mySpeaker].players.length === 0) {
        delete speakers[socket.mySpeaker];
    }
}

sio.on('connection', function (socket) {
    socket.myScore = 0;
    socket.myWord = '';
    socket.myTod = new Date().getTime() - throttleMs; // keep the player from being throttled right away
    socket.myName = 'player';
    socket.mySpeaker = 'speaker';

    addPlayerToSpeaker(socket);

    socket.on('name', function (name) { // player tells us their name
        console.log('player : name = ' + name);
        socket.myName = name;
    });

    socket.on('speaker', function (speaker) { // player is listening to a specific speaker
        speaker = speaker.toLowerCase();
        console.log('player ' + socket.myName + ': speaker = ' + speaker);
        removePlayerFromSpeaker(socket);
        socket.mySpeaker = speaker;
        addPlayerToSpeaker(socket);
    });

    socket.on('heard', function (word) { // player heard a word
        word = word.toLowerCase();
        var tod = new Date().getTime();
        if (socket.myTod + throttleMs > tod) { // limit player to one heard every 2 seconds
            console.log('player ' + socket.myName + ': throttled = ' + word);
        }
        else {
            console.log('player ' + socket.myName + ': heard = ' + word);
            if (speakers[socket.mySpeaker].heards[word]) {
                speakers[socket.mySpeaker].heards[word]++;
            } else {
                speakers[socket.mySpeaker].heards[word] = 1;
            }
            speakers[socket.mySpeaker].scoresChanged = true;
            for (var i = 0; i < speakers[socket.mySpeaker].players.length; i++) { // other players score from this player ...
                var other = speakers[socket.mySpeaker].players[i];
                if (other.myWord === word) { // ... and just played the same word ...
                    if (other.myTod + throttleMs > tod) { // ... less than 2 seconds ago.
                        other.myScore++; // logically this cannot be the same as the player (2 second rule)
                        console.log('  player ' + other.myName + ': scores');
                    }
                }
            }
            socket.myTod = tod; // save so this player can score from others who play this word in the next two seconds
            socket.myWord = word;
        }
    });

    socket.on('score', function () { // player wants to know their score
        console.log('player ' + socket.myName + ': score = ' + socket.myScore);
        socket.emit('score', socket.myScore);
    });

    socket.on('disconnect', function () { // player is bored
        removePlayerFromSpeaker(socket);
    });
});

var interval = setInterval(function () {
    for (var speakerName in speakers) {
        var speaker = speakers[speakerName];
        if (speaker.scoresChanged === true) {
            speaker.scoresChanged = false;

            var players = speaker.players
                .map(function (s) { return { name: s.myName, score: s.myScore }; })
                .sort(function (a, b) { return b.score - a.score; })
                .slice(0, 9);
            sio.to(speakerName).emit('scores', players);

            var heards = Object.keys(speaker.heards)
                .map(function (s) { return { heard: s, count: speaker.heards[s] }; })
                .sort(function (a, b) { return b.count - a.count; });
            sio.to(speakerName).emit('heards', heards);
        }
    }
}, 5000);

server.listen(3000, function () {
    console.log('Server on port 3000');
});