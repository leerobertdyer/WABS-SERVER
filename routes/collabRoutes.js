import e, { Router } from 'express'
import { createSharedLink } from './songRoutes.js';
import databaseConfig from '../database/db.js'
const { db } = databaseConfig
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
import { authenticate } from './authRoutes.js';

const collabRoutes = Router();

collabRoutes.get('/get-all', async (req, res) => {
  try {
    const collabUsers = await db('users')
      .select("*")
      .where('collab', '=', 'true')
    const allUsers = await db('users')
      .select('*')

    res.status(200).json({ collabUsers: collabUsers, allUsers: allUsers })
  } catch (err) {
    console.error(`Error getting collab users from db: ${err}`)
  }
})

collabRoutes.get('/collab-status', authenticate, (req, res) => {
  try {
    if (req.user.collab === 'true') {
      res.status(200).json({ collab: req.user.collab })
    } else if (req.user.collab === 'false') {
      res.status(200).json({ collab: req.user.collab })
    }
  } catch (err) {
    console.error(`Must be signed in: ${err}`)
  }
})

collabRoutes.put('/update-collab', async (req, res) => {
  const { id } = req.body
  let nextCollab = ''
  try {
    const currentCollab = await db('users')
      .where('user_id', id)
      .select('collab')
    if (currentCollab[0].collab === "false") {
      await db('users')
        .where('user_id', id)
        .update({
          collab: 'true'
        })
      nextCollab = 'true'
    } else {
      await db('users')
        .where('user_id', id)
        .update({
          collab: 'false'
        })
      nextCollab = 'false'
    }
    res.status(200).json({ nextCollab: nextCollab });
  } catch (err) {
    console.error(`Trouble setting collab boolean in db: ${err}`)
  }
})

collabRoutes.put('/submit-collab-music', upload.single('music'), async (req, res) => {
  try {
    const databaseLink = await createSharedLink(req);
    if (databaseLink) {
      res.status(200).json({ newMusic: databaseLink })
    }
  } catch (err) {
    console.error(`Error getting collab music database link: ${err}`)
  }
})

collabRoutes.put('/submit-collab-for-review', async (req, res) => {
  try {
    const updatedCollab = await db('collab')
      .where('user_id', req.body.user_id)
      .where('partner_id', req.body.partner_id)
      .where('feed_id', req.body.feed_id)
      .update({
        title: req.body.title,
        lyrics: req.body.lyrics,
        music: req.body.music,
        notes: req.body.notes
      })
    if (updatedCollab) {
      res.status(200).json({ message: 'updated collab!' })
    } else {
      try {
        await db('collab')
          .insert({
            user_id: req.body.user_id,
            partner_id: req.body.partner_id,
            feed_id: req.body.feed_id,
            title: req.body.title,
            lyrics: req.body.lyrics,
            music: req.body.music,
            notes: req.body.notes
          })
        res.status(200).json({ message: 'inserted new collab!' })
      }
      catch (err) {
        console.error(`Error inserting new collab: ${err}`)
      }
    }
  } catch (err) {
    console.error(`Error updating collab db: ${err}`)
  }
})

collabRoutes.get('/get-profile-collabs', authenticate, async (req, res) => {
  try {
    const user_id = req.user.user_id
    const userCollabs = await db('collab').select("*")
      .where('collab.user_id', user_id).orWhere('collab.partner_id', user_id)
      .innerJoin('feed', 'collab.feed_id', 'feed.feed_id')

    for (const song of userCollabs) {
      if (song.music_id) {
        const url = await db('music').where('music_id', song.music_id).select('song_file')
        song.music = url[0].song_file
      }
      const username = await db('users').where('user_id', song.user_id)
      song.username = username[0].username
      // console.log(song);
    }

    res.status(200).json({ userCollabs: userCollabs })
  } catch (err) {
    console.error(`Error Getting userCollabs from db: ${err}`)
  }
})

collabRoutes.post('/finalize', async (req, res) => {
  let databaseLink = req.body.song_file
  console.log(req.body);
  if (typeof databaseLink === 'number') {
    try {
      const databaseInfo = await db('music').select('song_file').where('music_id', req.body.song_file)
      databaseLink = databaseInfo[0].song_file
      // console.log(databaseLink);
    } catch (err) {
      console.err(`Error with song_file int replacer: ${err}`)
    }
  }
  try {
    await db.transaction(async trx => {
      const partnerData = await db('users').select('username')
        .where('user_id', req.body.partner_id)
      const partner_username = partnerData[0].username

      const songData = await trx('songs')
        .insert({
          user_id: req.body.user_id,
          partner_username: partner_username,
          title: req.body.title,
          lyrics: req.body.lyrics,
          song_file: databaseLink,
          votes: 0
        }).returning('song_id')
      const song_id = songData[0].song_id
      await trx('feed')
        .insert({
          type: "collab",
          user_id: req.body.user_id,
          partner_username: partner_username,
          song_id: song_id
        })

      const usersWhoHaveSubmitted = await db('scoreboard')
        .select('user_id')
        .distinct()
        .whereRaw('extract(month from "created") = ?', [new Date().getMonth() + 1])

      const hasSubmitted = await db('scoreboard')
        .where('user_id', req.body.user_id)
        .whereRaw('extract(month from "created") = ?', [new Date().getMonth() + 1])

      if (hasSubmitted.length === 0) {
        for (const user of usersWhoHaveSubmitted) {
          console.log(`${user.username} has submitted this month`);
          await db('scoreboard')
            .insert({
              user_id: user.user_id,
              type: 'bonus',
              amount: 10
            })
          const userAmountData = await db('scoreboard')
            .where('user_id', user.user_id)
            .whereRaw('extract(month from "created") = ?', [new Date().getMonth() + 1])
            .sum('amount')
          const userScore = userAmountData[0].sum
          await db('users')
            .where('user_id', user.user_id)
            .update('score', userScore)
        }
      }

      await trx('scoreboard')
        .insert({
          user_id: req.body.user_id,
          type: 'collab',
          amount: 100
        })

      await trx('scoreboard')
        .insert({
          user_id: req.body.partner_id,
          type: 'collab',
          amount: 100
        })

      const userAmountData = await db('scoreboard')
        .where('user_id', req.body.user_id)
        .whereRaw('extract(month from "created") = ?', [new Date().getMonth() + 1])
        .sum('amount')
        console.log('userAmountData: ', userAmountData);

      const partnerAmountData = await db('scoreboard')
        .where('user_id', req.body.partner_id)
        .whereRaw('extract(month from "created") = ?', [new Date().getMonth() + 1])
        .sum('amount')
      console.log('partnerAmountData: ', partnerAmountData);

      const userScore = userAmountData[0].sum
      console.log('userScore Collab: ', userScore);

      const partnerScore = partnerAmountData[0].sum
      console.log('partnerScore Collab: ', partnerScore);

      await trx('users')
        .where('user_id', req.body.user_id)
        .update('score', userScore)

      await trx('users')
        .where('user_id', req.body.partner_id)
        .update('score', partnerScore)

      await trx('collab')
        .where('title', req.body.title)
        .where('user_id', req.body.user_id)
        .del();
    })
    res.status(200).json({ message: `${req.body.title} posted to feed, and deleted from collab table` })
  } catch (err) {
    console.error(`Error inserting song or deleting collab: ${err}`)
    res.status(500).json({ error: "Internal Service Errororrooror" })
  }
})



export default collabRoutes