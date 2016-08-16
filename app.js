var Express = require('express');
var Server = require('http').Server;
var Sio = require('socket.io');
var Path = require('path');
var port = process.env.PORT || 3000;

var app = Express();
var server = Server(app);
var sio = Sio(server);

app.use(Express.static(Path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.sendFile(Path.join(__dirname, 'public', 'index.html'));
});

var throttleMs = 2000;
var Speakers = {};

function addPlayerToSpeaker(socket) {
    var speakerName = socket.speakerName;
    socket.join(speakerName);
    if (socket.speakerName in Speakers === false) {
        Speakers[speakerName] = { players: [], heards: {}, broadcastScores: false, broadcastHeards: false };
    }
    Speakers[speakerName].players.push(socket);
}

function removePlayerFromSpeaker(socket) {
    var speakerName = socket.speakerName;
    socket.leave(speakerName);
    Speakers[speakerName].players.splice(Speakers[speakerName].players.indexOf(socket), 1);
    if (Speakers[speakerName].players.length === 0) {
        delete Speakers[speakerName];
    }
}

sio.on('connection', function (socket) {
    socket.score = 0;
    socket.heardWord = '';
    socket.heardTime = new Date().getTime() - throttleMs; // keep the player from being throttled right away
    socket.playerName = 'player';
    socket.speakerName = socket.id; // create a unique speaker name by defaul to allow the serious mode to work without any setup

    addPlayerToSpeaker(socket);

    socket.on('name', function (playerName) { // player tells us their name
        console.log('player : name = ' + playerName);
        socket.playerName = playerName;
    });

    socket.on('speaker', function (speakerName) { // player is listening to a specific speaker
        speakerName = speakerName.toLowerCase();
        console.log('player ' + socket.playerName + ': speaker = ' + speakerName);
        removePlayerFromSpeaker(socket);
        socket.speakerName = speakerName;
        addPlayerToSpeaker(socket);
    });

    socket.on('heard', function (word) { // player heard a word
        word = word.toLowerCase();
        var now = new Date().getTime();
        if (socket.heardTime + throttleMs > now) { // limit player to one heard every 2 seconds
            console.log('player ' + socket.playerName + ': throttled = ' + word);
        }
        else {
            console.log('player ' + socket.playerName + ': heard = ' + word);
            Speakers[socket.speakerName].heards[word] = (Speakers[socket.speakerName].heards[word]) ? Speakers[socket.speakerName].heards[word] + 1 : 1;
            Speakers[socket.speakerName].broadcastHeards = true;
            for (var i = 0; i < Speakers[socket.speakerName].players.length; i++) { // other players score from this player ...
                var other = Speakers[socket.speakerName].players[i];
                if (other.heardWord === word) { // ... and just played the same word ...
                    if (other.heardTime + throttleMs > now) { // ... less than 2 seconds ago.
                        other.score++; // logically this cannot be the same as the player (2 second rule)
                        Speakers[socket.speakerName].broadcastScores = true;
                        console.log('  player ' + other.playerName + ': scores');
                    }
                }
            }
            socket.heardTime = now; // save so this player can score from others who play this word in the next two seconds
            socket.heardWord = word;
        }
    });

    socket.on('score', function () { // player wants to know their score
        console.log('player ' + socket.playerName + ': score = ' + socket.score);
        socket.emit('score', socket.score);
    });

    socket.on('disconnect', function () { // player is bored
        removePlayerFromSpeaker(socket);
    });
});

var interval = setInterval(function () {
    for (var speakerName in Speakers) {
        var speaker = Speakers[speakerName];
        
        if (speaker.broadcastHeards === true) {
            speaker.broadcastHeards = false;
            var heards = Object.keys(speaker.heards)
                .map(function (s) { return { heard: s, count: speaker.heards[s] }; })
                .sort(function (a, b) { return b.count - a.count; })
                .slice(0, 8);
            sio.to(speakerName).emit('heards', heards);
        }

        if (speaker.broadcastScores === true) {
            speaker.broadcastScores = false;
            var players = speaker.players
                .map(function (s) { return { name: s.playerName, score: s.score }; })
                .sort(function (a, b) { return b.score - a.score; })
                .slice(0, 8);
            sio.to(speakerName).emit('scores', players);
        }
    }
}, 5000);

server.listen(port, function () {
    console.log('listening on port ' + port);
});