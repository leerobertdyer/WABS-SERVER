import { Router } from 'express'
import databaseConfig from '../database/db.js'
const { db } = databaseConfig
import OpenAI from 'openai'
import { authenticate } from "./authRoutes.js";
import io from '../sockets.js';

const promptRoutes = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

promptRoutes.post('/get-prompt', async (req, res) => {
  const userId = req.body.userId
  const prompt = `You are a creative song prompt builder. You use a variety of topics to furnish short thoughtful song prompts that can later be checked against lyrics to see wether a user has followed the prompt or not. Pull from a wide variety of themes including but not limited to: Nature, Nostalgia, Romance, Family, Future, Other Environments, Fantasy, Sci-Fi, Silliness, Seriousness, Sadness. Only give one prompt at a time.`
  try {
    const prompts = await db('prompt').select('prompt').where('user_id', userId).whereRaw('EXTRACT(MONTH FROM created) = EXTRACT(MONTH FROM CURRENT_DATE)')
    if (prompts && prompts.length < 2) {

      try {
        const stream = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        });
        let gptResponse = ''
        for await (const chunk of stream) {
          if (chunk.choices[0]?.delta?.content) {
            gptResponse += chunk.choices[0].delta.content;
          }
        }

        try {
          await db('prompt').insert({
            user_id: userId,
            prompt: gptResponse
          })
        } catch (error) {
          console.log(`Error updating db with new prompt: ${error}`);
        }

        res.status(200).json({ gptResponse: gptResponse });
      } catch (error) {
        console.error(`Error getting song prompt from GPT: ${error}`)
      }
    }
    else {
      console.log("Two prompts already");
      res.status(200).json({ message: "full" })
    }

  } catch (error) {
    console.log(`Error getting prompts: ${error}`);
  }

})

promptRoutes.get('/user-prompts', authenticate, async (req, res) => {
  const userId = req.user.user_id
  try {
    const prompts = await db('prompt').select('prompt').where('user_id', userId)
    res.status(200).json({ prompts: prompts })
  } catch (error) {
    console.error(`Error getting prompts from DB: ${error}`)
  }
})

promptRoutes.put('/check-prompt', async (req, res) => {
  try {
    const prompt = req.body.prompt
    const songTitle = req.body.songTitle
    const songLyrics = req.body.songLyrics
    const userId = req.body.userId

    const checkPrompt = `Here is a song prompt you gave me earlier: "${prompt}". 
    Please read through the song titled "${songTitle}" with the following lyrics: "${songLyrics}". 
    First, indicate if the song adheres to the prompt by typing "YES" or "NO". 
    Then, provide constructive feedback focusing on [adherence to the prompt, lyrical structure, creativity].`

    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: checkPrompt }],
      stream: true,
    });
    let gptResponse = ''
    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        gptResponse += chunk.choices[0].delta.content;
      }
    }


    if (gptResponse.slice(0, 5).toLowerCase().includes('yes')) {
      console.log('submission accepted')
      await db.transaction(async trx => {
        await trx('scoreboard').insert({
          user_id: userId,
          type: "prompt",
          amount: 100
        })

        await trx('prompt').where('user_id', userId).where('prompt', prompt).del();

      })
      io.emit('updateFeed')

      res.status(200).json({ gptResponse: gptResponse.slice(4), pass: true })
    } else if (gptResponse.slice(0, 5).toLowerCase().includes('no')) {
      console.log('song rejected')
      res.status(200).json({ gptResponse: gptResponse.slice(3), pass: false })
    }

  } catch (error) {
    console.error(`Error checking prompt: ${error}`)
  }
})

export default promptRoutes