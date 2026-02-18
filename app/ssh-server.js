const { Server } = require('socket.io');
const { Client } = require('ssh2');

function setupSSHWebSocket(server) {
    const io = new Server(server, {
        path: '/ssh-socket', // WebSocket endpoint
        cors: { origin: '*' }
    });

    io.on('connection', (socket) => {

        const sshClient = new Client();

        sshClient.on('ready', () => {

            sshClient.shell({ term: 'xterm' }, (err, stream) => {
                if (err) {
                    socket.emit('data', `\r\n*** SSH SHELL ERROR: ${err.message} ***\r\n`);
                    return;
                }

                // Relay data between socket and SSH stream
                socket.on('data', (data) => stream.write(data));
                stream.on('data', (data) => socket.emit('data', data.toString('utf-8')));
                stream.on('close', () => socket.disconnect());
            });
        });

        sshClient.on('error', (err) => {
            socket.emit('data', `\r\n*** SSH ERROR: ${err.message} ***\r\n`);
        });

        // Connect to local SSH server using environment variables
        sshClient.connect({
            host: 'localhost',
            port: 22,
            username: process.env.SSH_USER || 'root',
            password: process.env.SSH_PASSWORD, // Set this in Render
            // or privateKey: require('fs').readFileSync('/path/to/key')
        });

        socket.on('disconnect', () => {
            sshClient.end();
        });
    });
}

module.exports = setupSSHWebSocket;
