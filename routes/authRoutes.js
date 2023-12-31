import bcrypt from 'bcrypt'
import databaseConfig from '../database/db.js'
import { Router } from 'express'
import dropboxConfig from '../services/dropbox.js'
const { dbx, REDIRECT_URI, isAccessTokenValid, refreshToken } = dropboxConfig
const { db } = databaseConfig
const authRoutes = Router()
import admin from 'firebase-admin';


 export const authenticate = async (req, res, next) => {
  const headerToken = req.headers.authorization;
  if (!headerToken || !headerToken.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = headerToken.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.uid = decodedToken.uid;
    const userData = await db('users')
    .where('uid', req.uid)
    .select('*')
    req.user = userData[0]
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ error: 'Authenticate Failed' });
  }
};

let userId

////////////////    session    ////////////////
authRoutes.get('/check-session', authenticate, async(req, res) => {
  if(req.headers) {
  const token = req.headers.authorization.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(token);
  const uid = decodedToken.uid; 
  const userData = await db('users').where('uid', uid).select('*')
  const user = userData[0]
  userId = user.user_id
  res.status(200).json({user: user})
  } else {
    console.log('no user logged in');
    res.status(204); //need to respond better so there is no error on a guest load
  }
});
////////////////    DBX    ////////////////

authRoutes.post('/dbx-auth', authenticate, async (req, res) => {
    try {
      const authUrl = await dbx.auth.getAuthenticationUrl(REDIRECT_URI, null, 'code', 'offline', null, 'none', false);
      // console.log('Authorization URL:', authUrl);
      res.json({ authUrl: authUrl })
    } catch (error) {
      console.error('Error generating authentication URL:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

let tempAuthToken = ''

authRoutes.get('/dbx-auth-callback', async (req, res) => {
  const { code } = req.query;

  try {
    console.log('received auth code: ', code)
    if (tempAuthToken === '') {
      const tokenResponse = await dbx.auth.getAccessTokenFromCode(REDIRECT_URI, code);
      // console.log('token response: ', tokenResponse)
      tempAuthToken = tokenResponse.result.access_token;
      const refreshToken = tokenResponse.result.refresh_token;
      // console.log('accessToken: ', tempAuthToken);
      // console.log('refreshToken: ', refreshToken);
      await db('dbx_tokens')
      .insert({
        user_id: userId,
        token: tempAuthToken,
        refresh: refreshToken
      })
      tempAuthToken = ''
      res.redirect(`${process.env.REACT_APP_FRONTEND_URL}/profile`)
    }
  } catch (error) {
    console.error('Error obtaining access token:', error);
    res.status(500).json({ error: 'Failed to obtain access token' });
  }
});


authRoutes.get('/get-all-emails', async(req, res) => {
  try {
    const allUsersData = await db('users').select(['user_email', 'username'])
    const allUsers = []
    for (const user of allUsersData) {
      allUsers.push(user.user_email)
      allUsers.push(user.username)
    }
    res.status(200).json({allUsers: allUsers})
  } catch (error) {
    console.error(`Error fetching users from db: ${error}`)
    res.status(500).json({error: "internal SERVER error"})
  }
})

////////////////    Register    ////////////////

  authRoutes.post('/register', async(req, res) => {
    const { username, UID, email, status, profile_pic, background_pic } = req.body;

   try {
     const user = await db('users')
         .returning("*")
         .insert({
           username: username,
           uid: UID,
           user_email: email,
           date_user_joined: new Date(),
           user_status: status,
           user_profile_pic: profile_pic,
           profile_background: background_pic
         })
           const userData = user[0];
           userId=userData.user_id
               res.json(userData);
   }
          catch(err) {
            console.error(`Error with new register: ${err}`)
            res.status(400).json({ error: 'Unable to register1', message: err.message });
          }
      })

  export default authRoutes 
  