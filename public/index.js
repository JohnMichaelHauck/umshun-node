var socket = io();
var intervalId = 0;

function myclick(word) {

    if (intervalId == 0) {
        
        socket.emit('heard', word);

        intervalId = setInterval(function () {
            socket.emit('score');
            clearInterval(intervalId);
            intervalId = 0;
        }, 2000);
    }
}

socket.on('score', function(score) {
     $('#score').text(score);
});
