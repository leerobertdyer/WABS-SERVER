import { Router } from 'express'
import multer from 'multer'
import dropboxConfig from '../services/dropbox.js'
import databaseConfig from '../database/db.js'
const { db } = databaseConfig
const { dbx, isAccessTokenValid, refreshToken } = dropboxConfig
const songRoutes = Router()
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
import io from '../sockets.js'

const createSharedLink = async(req) => {
  const user = req.body.user_id
  let token = await db('dbx_tokens')
  .where('user_id', user) 
  token = token[0].token
  if (!(await isAccessTokenValid(token))) {
    token = await refreshToken(user, token);
  }
  await dbx.auth.setAccessToken(token)
  const uploadedSong = req.file;
  const content = uploadedSong.buffer;
  let databaseLink;
  const dropboxResponse = await dbx.filesUpload({
    path: `/uploads/songs/${uploadedSong.originalname}`,
    contents: content
  });
  const dropboxPath = dropboxResponse.result.id;
  try {
    const existingLinkResponse = await dbx.sharingListSharedLinks({
      path: dropboxResponse.result.path_display
    });

    if (existingLinkResponse.result.links.length > 0) {
      databaseLink = existingLinkResponse.result.links[0].url.replace('https://www.dropbox.com', 'https://dl.dropboxusercontent.com');
      return databaseLink
    } else {
      const linkResponse = await dbx.sharingCreateSharedLinkWithSettings({
        path: dropboxResponse.result.path_display,
        settings: { requested_visibility: { '.tag': 'public' } },
      });

      databaseLink = linkResponse.result.url.replace('https://www.dropbox.com', 'https://dl.dropboxusercontent.com');
      return databaseLink
    }
  } catch (error) {
    console.error('Error creating/shared link:', error);
  }
}

songRoutes.post('/submit-song', upload.single('song'), async (req, res) => {
  const databaseLink = await createSharedLink(req);

  try {
    const [newSongId] = await db('songs')
      .insert({
        title: req.body.title,
        lyrics: req.body.lyrics,
        user_id: req.body.user_id,
        song_file: databaseLink,
        votes: 0})
      .returning('song_id');
    await db('feed')
    .insert({
      type: 'song',
      user_id: req.body.user_id,
      song_id: newSongId.song_id
    })

    const usersWhoHaveSubmitted = await db('scoreboard')
      .select('user_id')
      .distinct()
      .whereRaw('extract(month from "created") = ?', [new Date().getMonth() + 1])

      const hasSubmitted = await db('scoreboard')
      .where('user_id', req.body.user_id)
      .whereRaw('extract(month from "created") = ?', [new Date().getMonth() + 1])

      if (hasSubmitted.length === 0) {
        for (const user of usersWhoHaveSubmitted){
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
    
    await db('scoreboard')
    .insert({
      user_id: req.body.user_id,
      type: 'song',
      amount: 50
    })

    const userAmountData = await db('scoreboard')
    .where('user_id', req.body.user_id)
    .whereRaw('extract(month from "created") = ?', [new Date().getMonth() + 1])
    .sum('amount')

    const userScore = userAmountData[0].sum

    await db('users')
    .where('user_id', req.body.user_id)
    .update('score', userScore)
    
    io.emit('updateFeed')
    res.status(200).json({ newSong: databaseLink })
  }
  catch (error) {
    console.error('Error submitting new song in Database', error);
    res.status(500).json({ error: 'Server Status  Error' })
  }
});

songRoutes.post('/submit-music', upload.single('song'), async(req, res) => {
  const databaseLink = await createSharedLink(req);
  try {
    const [newMusicId] = await db('music')
      .insert({
        title: req.body.title,
        user_id: req.body.user_id,
        song_file: databaseLink})
      .returning('music_id');
    await db('feed')
    .insert({
      type: 'music',
      user_id: req.body.user_id,
      music_id: newMusicId.music_id
    })
    io.emit('updateFeed')
    res.status(200).json({ newMusic: databaseLink })
  }
  catch (error) {
    console.error('Error submitting new music in Database', error);
    res.status(500).json({ error: 'Server Status  Error' })
  }
});

songRoutes.post('/submit-lyrics', async(req, res) => {
const title = req.body.title;
const lyrics = req.body.lyrics;
const id = req.body.user_id
try {
  const [newLyricId] = await db('lyrics').insert({
    title: title,
    user_id: id,
    lyrics: lyrics})
    .returning('lyric_id');

    await db('feed')
    .insert({
      type: 'lyrics',
      user_id: req.body.user_id,
      lyric_id: newLyricId.lyric_id
    })
    io.emit('updateFeed')
   res.status(200).json({ newLyrics: req.body.lyrics })
} catch (error) {
  console.error('Error submitting new lyrics in Database', error);
  res.status(500).json({ error: 'Server Status  Error' })
}
});


export { createSharedLink, songRoutes };