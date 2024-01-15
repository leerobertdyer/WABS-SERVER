import { Router } from 'express'
import databaseConfig from '../database/db.js'
const { db } = databaseConfig
import OpenAI from 'openai'

const gptRoutes = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

gptRoutes.post('/get-prompt', async(req, res) => {
    try {
        const stream = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: req.body.prompt }],
            stream: true,
          });
        
          for await (const chunk of stream) {
            process.stdout.write(chunk.choices[0]?.delta?.content || '');
          }
        
        Completion = await stream.finalChatCompletion();
        console.log(chatCompletion);
        res.status(200).json({ gptResponse: gptResponse.data });
    } catch (error) {
        console.error(`Error getting song prompt from GPT: ${error}`)
    }
})

export default gptRoutes