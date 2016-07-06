var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ip = require('ip');
var async = require('async');
var SerialPort = require('serialport');

app.use('/', express.static(__dirname + '/site'));

http.listen(3000, function () {
    console.log('Please connect to ' + ip.address() + ':3000');
});

var port, serialport;

io.on('connection', function (socket) {
    handleConnection(socket);
});


function handleConnection(socket) {
    async.waterfall([

        function (callback) {
            console.log('a user connected.');
            socket.on('disconnect', function () {
                console.log('User disconnected.');
            });
            SerialPort.list(function (err, ports) {
                if (err) {
                    return callback(err);
                }
                socket.emit('ports', JSON.stringify(ports));
                socket.on('portSelection', function (number) {
                    console.log('Selected port: ' + number);
                    if (!port) {
                        var index = parseInt(number);
                        if (index != NaN && index >= 0 && index < ports.length) {
                            port = ports[index];
                            return callback();
                        } else {
                            return callback('Invalid port selection');
                        }
                    } else {
                        return;
                    }
                });
            });
        },
        function (callback) {
            serialPort = new SerialPort(port.comName, {
                baudRate: 38400,
                parser: SerialPort.parsers.byteLength(18)
            });
            serialPort.on('open', function () {
                console.log('Port opened');
            });
            serialPort.on('data', function (data) {
                io.emit('data', true);
            });
            serialPort.on('error', function (err) {
                return callback(err.message);
            });
        }
    ], function (err) {
        if (err) {
            console.log(err);
        }
    });
}
process.on('SIGINT', function () {
    if (serialPort) {
        serialPort.close(function (err) {
            if (err) {
                console.log(err);
            }
            process.exit();
        });
    } else {
        process.exit();
    }
});