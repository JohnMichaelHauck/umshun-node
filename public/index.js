var socket = io();
var intervalId = 0;
var words;

$(document).ready(function () {
    for (var i = 0; i < 9; i++) {
        $("#word-buttons").append("<button id='word" + i + "' type='button' class='btn btn-primary' onclick='heardWord(" + i + ");'>...</button>");
    };

    for (var i = 0; i < 9; i++) {
        $("#scores").append("<li class='list-group-item'><b>" + (i + 1) + ":&nbsp</b><text id='player" + i + "'>...</text><span id='score" + i + "' class='badge'>0</span></li>");
    }

    for (var i = 0; i < 9; i++) {
        $("#heards").append("<li class='list-group-item'><text id='heard" + i + "'>...</text><span id='count" + i + "' class='badge'>0</span></li>");
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
        $('.btn').prop('disabled', true);
        intervalId = setInterval(function () {
            socket.emit("score");
            clearInterval(intervalId);
            intervalId = 0;
            $('.btn').prop('disabled', false);
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

socket.on("heards", function (heards) {
    var i = 0;
    heards.forEach(function (heard) {
        $("#heard" + i).text(heard.heard);
        $("#count" + i).text(heard.count);
        i++;
    });
});