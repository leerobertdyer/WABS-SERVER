import { Router } from "express";
import dbConfig from '../database/db.js'
import { authenticate } from "./authRoutes.js";
const { db } = dbConfig
import io from "../sockets.js";

const messageRoutes = Router();

messageRoutes.get('/get-conversations', authenticate, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const conversations = await db('conversation').where('user1_id', userId).orWhere('user2_id', userId)
        let convo_ids = [];
        for (const convo of conversations){
            convo_ids.push(convo.conversation_id)
        }
        const messages = await db('messages').whereIn('conversation_id', convo_ids);
        // console.log('messages: ', messages);
        if (messages.length > 0) {
            for (const message of messages) {
                const receiver = await db('users').where('user_id', message.user2_id).select("username")
                const sender = await db('users').where('user_id', message.user1_id).select("username")
                // console.log(sender);
                message.sender = sender[0].username
                message.receiver = receiver[0].username
            }
            res.status(200).json({ messages: messages, conversations: conversations })
        } else {
            // console.log('no messages found');
            res.status(200).json({ messages: [], conversations: conversations })
        }
    } catch (err) {
        console.error(`Trouble getting messages from db: ${err}`)
    }
})

messageRoutes.post('/new-conversation', async (req, res) => {
    try {
        const user1_id = req.body.user1;
        const user2_id = req.body.user2
        const conversations = await db('conversation')
            .insert({
                user1_id: user1_id,
                user2_id: user2_id
            }).returning('*')

        res.status(200).json({ conversations: conversations })
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
        const content = req.body.content

        await db('messages')
        .insert({
            message_id: message_id,
            content: content,
            user1_id: user1_id,
            user2_id: user2_id,
            conversation_id: req.body.conversation_id
        })
        io.emit('messageReceived')
        res.status(200).json({message: 'shit yea'})

    } catch (err) {
        console.error(`Error inserting new message into db (messageRoutes): ${err}`)
    }
})


messageRoutes.delete('/delete-message', async (req, res) => { // REDO THIS IF USING
    const user_id = req.body.user_id;
    const message_id = req.body.note.message_id
    console.log(user_id, message_id);
    try {
        await db('messages').where('user_id', user_id).where('message_id', message_id).del();
        res.status(200)
    } catch (error) {
        console.error(`Error deleting message from db: ${error}`)
        res.status(500).json({ error: "internal SERVER error" })
    }
})

export default messageRoutes