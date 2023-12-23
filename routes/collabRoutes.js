import e, { Router } from 'express'
import { createSharedLink } from './songRoutes.js';
import databaseConfig from '../database/db.js'
const { db } = databaseConfig
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


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

collabRoutes.get('/collab-status', (req, res) => {
  try {
    const user = req.cookies.user
    if (user.collab === 'true') {
      res.status(200).json({ collab: user.collab })
    }
  } catch (err) {
    console.error(`Must be signed in: ${err}`)
  }
})

collabRoutes.put('/update-collab', async (req, res) => {
  const { id } = req.body
  console.log('cookie: ', req.cookies.user)
  let nextCollab = ''
  try {
    const currentCollab = await db('users')
      .where('user_id', id)
      .select('collab')
    console.log('currentCollab: ', currentCollab);
    if (currentCollab[0].collab === "false") {
      await db('users')
        .where('user_id', id)
        .update({
          collab: 'true'
        })
      nextCollab = 'true'
      req.cookies.user.collab = 'true'
    } else {
      await db('users')
        .where('user_id', id)
        .update({
          collab: 'false'
        })
      nextCollab = 'false'
      req.cookies.user.collab = 'false'
    }
    res.cookie('user', req.cookies.user, { maxAge: 3000000, path: '/', sameSite: 'none', secure: true });
    res.status(200).json({ nextCollab: nextCollab });
    console.log('this: ', req.cookies.user)
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

collabRoutes.get('/get-profile-collabs', async (req, res) => {
  try {
    const user_id = req.cookies.user.user_id
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
      console.log(song);
    }

    res.status(200).json({ userCollabs: userCollabs })
  } catch (err) {
    console.error(`Error Getting userCollabs from db: ${err}`)
  }
})

collabRoutes.post('/finalize', async(req, res) => {
  if (typeof req.body.song_file === 'number'){
    try {
      const databaseInfo = await db('music').select('song_file').where('music_id', req.body.song_file)
      const databaseLink = databaseInfo[0].song_file
      //// 
      /////
      ///    *** THIS IS WHERE I LEFT OFF AS WELL AS NEXT ROUTE AND DELETE
    } catch (err) {
      console.err(`Error with song_file int replacer: ${err}`)
    }

  }
  try {
    console.log(req.body);
    res.status(200).json({message: 'hell yea'})
  } catch (err) {
    console.error(`Error loading new final Collab Song: ${err}`)
    
  }
})

collabRoutes.delete('/cleanup', async(req, res) => {
  try {
    await db('collab').select("*").where('collab_id', req.body.collab_id).del();
    res.status(200).json({message: 'successsss'})
  } catch (err) {
    console.error(`Error Deleting Collab After Song Posted: ${err}`)
  }
})

export default collabRoutes