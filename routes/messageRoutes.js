import { Router } from "express";
import { authenticate } from "./authRoutes.js";
import dbConfig from '../database/db.js'
const { db } = dbConfig
import io from "../sockets.js";
import { getConnectedUsers } from "../sockets.js";

const messageRoutes = Router();

messageRoutes.get('/get-conversations', authenticate, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const unsorted = await db('conversation').where('user1_id', userId).orWhere('user2_id', userId)
        const conversations = unsorted.sort((a, b) => new Date(b.time) - new Date(a.time))
        const convo_ids = conversations.map(convo => convo.conversation_id);
        const messages = await db('messages').whereIn('conversation_id', convo_ids);
        res.status(200).json({ messages: messages, conversations: conversations })
    } catch (err) {
        console.error(`Trouble getting messages from db: ${err}`)
    }
})

messageRoutes.post('/new-conversation', async (req, res) => {
    try {
        const { user1username, user2username, user1_id, user2_id } = req.body
        const conversation = await db('conversation')
            .insert({
                user1username: user1username,
                user2username: user2username,
                user1_id: user1_id,
                user2_id: user2_id
            }).returning('*');
        io.emit('getConversations');
        res.status(200).json({ conversation: conversation })
    } catch (err) {
        console.error(`Error inserting new convo (messageRoutes): ${err}`)
        res.status(500).json({ error: 'internal SERVER error' })
    }
})

messageRoutes.post('/new-message', async (req, res) => {
    try {
        const user1_id = req.body.user1_id;
        const user2_id = req.body.user2_id;
        const message_id = req.body.id;
        const content = req.body.content;
        const user2username = req.body.user2username;
        console.log(user2username);
        await db('messages')
            .insert({
                message_id: message_id,
                content: content,
                user1_id: user1_id,
                user2_id: user2_id,
                conversation_id: req.body.conversation_id
            })
        await db('conversation')
            .where('conversation_id', req.body.conversation_id)
            .update({
                time: db.raw('current_timestamp')
            });
        io.emit('getConversations')
        await db('notification').insert({
            user_id: user2_id,
            type: 'message',
            content: user2username
        })
        const currentUsers = getConnectedUsers();
        const socket2 = currentUsers[user2_id];
        io.to(socket2).emit('getNotifications')
        res.status(200).json({ message: 'success' })
    } catch (err) {
        console.error(`Error inserting new message into db (messageRoutes): ${err}`)
    }
})

messageRoutes.get('/get-connected-users', async(req, res) => {
    try {
        let connectedUsers = getConnectedUsers()
        const connectedUsersIds = Object.keys(connectedUsers)
        connectedUsers = await db('users').select('username').whereIn('user_id', connectedUsersIds)
        connectedUsers = connectedUsers.map(user => user.username)
        res.status(200).json({ connectedUsers: connectedUsers })
    } catch (error) {
        console.error(`Trouble getting connectedUsers (mssgRoutes): ${error}`)
        res.status(500).json({ error: 'interNalServIceErroR' })
    }
})


messageRoutes.delete('/delete-message', async (req, res) => { // REDO THIS IF USING
    const user_id = req.body.user_id;
    const message_id = req.body.note.message_id
    try {
        await db('messages').where('user_id', user_id).where('message_id', message_id).del();
        res.status(200)
    } catch (error) {
        console.error(`Error deleting message from db: ${error}`)
        res.status(500).json({ error: "internal SERVER error" })
    }
})

export default messageRoutes