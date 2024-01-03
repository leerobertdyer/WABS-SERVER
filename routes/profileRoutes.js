import { Router } from "express";
import dbConfig from '../database/db.js'
const { db } = dbConfig
import dropboxConfig from '../services/dropbox.js'
import { authenticate } from "./authRoutes.js";
const { dbx, isAccessTokenValid, refreshToken } = dropboxConfig
import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
import io from "../sockets.js";

const profileRoutes = Router()

const getDatabaseLink = async (req) => {
  const user = req.body.user_id;
  const dbxTokenData = await db('dbx_tokens')
    .where('user_id', user)
    .select('token')
  let dbxToken = dbxTokenData[0]
  if (!(await isAccessTokenValid(dbxToken))) {
    dbxToken = await refreshToken(user, dbxToken);
  }

  await dbx.auth.setAccessToken(dbxToken);
  const uploadedPhoto = req.file;

  if (!uploadedPhoto) {
    return res.status(400).json({ error: 'No profile photo provided' });
  }

  const contents = uploadedPhoto.buffer;
  let databaseLink;
  try {
    const dropboxResponse = await dbx.filesUpload({
      path: `/uploads/photos/${uploadedPhoto.originalname}`,
      contents: contents
    });
    // console.log('dpx resp: ', dropboxResponse);
    const dropboxPath = dropboxResponse.result.id;
    // console.log('dpx path: ', dropboxPath)
    try {
      const existingLinkResponse = await dbx.sharingListSharedLinks({
        path: dropboxResponse.result.path_display
      });
      if (existingLinkResponse.result.links.length > 0) {
        databaseLink = existingLinkResponse.result.links[0].url.replace('https://www.dropbox.com', 'https://dl.dropboxusercontent.com');
        // console.log('Using existing shareable link:', databaseLink);
      } else {
        const linkResponse = await dbx.sharingCreateSharedLinkWithSettings({
          path: dropboxResponse.result.path_display,
          settings: { requested_visibility: { '.tag': 'public' } },
        });
        databaseLink = linkResponse.result.url.replace('https://www.dropbox.com', 'https://dl.dropboxusercontent.com');
        // console.log('Shareable link:', databaseLink);
      }
      return databaseLink
    } catch (error) {
      console.error('Error creating/shared link:', error);
    }
  } catch (err) {
    console.error(`Error getting databaseLink: ${err}`)
  }
}

profileRoutes.get('/get-notifications', authenticate, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const notifications = await db('notification').where('user_id', userId).select('*')
    if (notifications) {
      res.status(200).json({notifications: notifications})
    } else {
      res.status(200).json({notifications: []})
    }

  } catch (err) {
    console.error(`Error getting notifications (profileRoutes): ${err}`)
    res.status(500).json({error: 'INTERNAL SERVER ERROR'})
  }
});

profileRoutes.delete('/clear-notification', async (req, res) => {
  const userId = req.body.user_id;
  const type = req.body.type;
  try {
    await db('notification').where('user_id', userId).where('type', type).del();
    const newNotes = await db('notification').where('user_id', userId).where('type', type).select('*')
    res.status(200).json({newNotes: newNotes})
  } catch (error) {
    console.error(`Error clearing notification: ${error}`)
  }
});

profileRoutes.delete('/clear-notification-from-nav', async (req, res) => {
  const note_id = req.body.note_id;
  const user_id = req.body.user_id;
  console.log(note_id, user_id);
  try {
    await db('notification').where('notification_id', note_id).del();
    const newNotes = await db('notification').where('user_id', user_id)
    res.status(200).json({ newNotes: newNotes })
  } catch (error) {
    console.error(`Error deleting notification (profileRoutes): ${error}`)
    res.status(500).json({error: "internal sERVer ErrRor"})
  }
})


profileRoutes.put('/update-status', authenticate, async (req, res) => {
  try {
    const { id, newStatus } = req.body
    await db('users')
      .where('user_id', id)
      .update({ user_status: newStatus })
    await db('feed')
      .insert(
        {
          type: 'status',
          user_id: id,
          feed_status: newStatus
        })
    io.emit('updateFeed')
    res.status(200).json({ status: newStatus })
  } catch (error) {
    console.error('Error setting new status in Database', error);
    res.status(500).json({ error: 'Server Status Error' })
  }
});

profileRoutes.put('/upload-profile-pic', upload.single('photo'), async (req, res) => {
  const databaseLink = await getDatabaseLink(req);
  const user = req.body.user_id;
  try {
    await db('users')
      .where('user_id', user)
      .update({ user_profile_pic: databaseLink })
    await db('feed')
      .insert({
        type: 'profile_pic',
        user_id: user,
        feed_pic: databaseLink
      })
    io.emit('updateFeed')
    res.status(200).json({ newPhoto: databaseLink })
  } catch (error) {
    console.error('Error updating Database: ', error);
    res.status(500).json({ error: 'Server XXXX Error' })
  }
});

profileRoutes.put('/upload-background-pic', upload.single('photo'), async (req, res) => {
  const databaseLink = await getDatabaseLink(req);
  const user = req.body.user_id;
  try {
    await db('users')
      .where('user_id', user)
      .update({ profile_background: databaseLink })
    await db('feed')
      .insert({
        type: 'profile_background',
        user_id: user,
        feed_pic: databaseLink
      })
    io.emit('updateFeed')

    res.status(200).json({ newPhoto: databaseLink })
  } catch (err) {
    console.error(`Error uploading new Background to db: ${err}`)
  }
});

profileRoutes.get('/other-user', async(req, res) => {

});

export default profileRoutes