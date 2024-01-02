
import { Server } from 'socket.io'

const io = new Server();

const connectedUsers = {};


io.on("connect", (socket) => {
    console.log(`⚡: ${socket.id} just connected!`);

    socket.on('sendUserId', (user_id) => {
        console.log(`connecting user ${user_id} to socket ${socket.id}`);
        connectedUsers[user_id] = socket.id;
        console.log('connectedUsers: ', connectedUsers);
    });

    socket.on('sendMessage', ({ content, user2 }) => {
        const socket2 = connectedUsers[user2];
        if (socket2) {
            io.to(socket2).emit('message', { fromUserId: socket.id, content });
        } else {
            console.log(`User ${user2} is not connected, but they will see your message when they log in.`);
        }
    });


    socket.on('disconnect', () => {
        console.log('🔥: A user disconnected');

        // remove user from connected users:
        const userId = Object.keys(connectedUsers).find(key => connectedUsers[key] === socket.id);
        delete connectedUsers[userId];
        console.log(connectedUsers);
    });
});

export default io
