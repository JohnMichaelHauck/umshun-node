var socket = io();
var intervalId = 0;
var words;

$(document).ready(function () {
    for (var i = 0; i < 9; i++) {
        $("#word-buttons").append("<button id='word" + i + "' class='btn btn-primary' onclick='heardWord(" + i + ");'>...</button>");
    };

    for (var i = 0; i < 9; i++) {
        $("#scores").append("<li class='list-group-item'><b>" + i + ":&nbsp</b><text id='player" + i + "'>...</text><span id='score" + i + "' class='badge'>0</span></li>");
    }

    wordsChanged();
});

function nameChanged() {
    socket.emit("name", $('#name')[0].value);
};

function speakerChanged() {
    socket.emit("speaker", $('#speaker')[0].value);
};

function wordsChanged() {
    words = $('#words')[0].value.split(",");
    for (var i = 0; i < 9; i++) {
        $("#word" + i).text(words[i]);
    };
};

function heardWord(index) {
    var word = words[index];
    if (intervalId == 0) {
        socket.emit("heard", word);
        intervalId = setInterval(function () {
            socket.emit("score");
            socket.emit("scores", 9);
            clearInterval(intervalId);
            intervalId = 0;
        }, 2000);
    }
}

socket.on("score", function (score) {
    $("#score").text(score);
});

socket.on("scores", function (players) {
    var i = 0;
    players.forEach(function (player) {
        $("#player" + i).text(player.name);
        $("#score" + i).text(player.score);
        i++;
    });
});
