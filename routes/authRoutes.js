import bcrypt from 'bcrypt'
import databaseConfig from '../database/db.js'
import { Router } from 'express'
import dropboxConfig from '../services/dropbox.js'
const { dbx, REDIRECT_URI, isAccessTokenValid, refreshToken } = dropboxConfig
const { db } = databaseConfig
const authRoutes = Router()
import { dbf } from '../index.js'

////////////////    session    ////////////////
authRoutes.get('/check-session', (req, res) => {
  if (req.body){ 
console.log(req.body);
// save req.body.UID to a temp variable to use in next route
    res.status(200)
  } else {
    console.log('no cookie');
    res.status(204); //need to respond better so there is no error on a guest load
  }
});
////////////////    DBX    ////////////////

authRoutes.post('/dbx-auth', async (req, res) => {
    try {
      const authUrl = await dbx.auth.getAuthenticationUrl(REDIRECT_URI, null, 'code', 'offline', null, 'none', false);
      console.log('Authorization URL:', authUrl);
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
    
  } catch (err) {
    console.error(`error reloading user after dbx auth: ${err}`)
  }
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
      res.cookie('token', tempAuthToken, { maxAge: 30000000, path: '/', sameSite: 'none', secure: true });
      tempAuthToken = ''
      res.redirect(process.env.REACT_APP_FRONTEND_URL)
    }
  } catch (error) {
    console.error('Error obtaining access token:', error);
    res.status(500).json({ error: 'Failed to obtain access token' });
  }
});

////////////////    login    ////////////////

authRoutes.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.select('*')
      .from('users')
      .where('user_email', '=', email.toLowerCase())
      .then(userData => {
        if (userData.length === 0) {
          return res.status(400).json('no email Creds Bro');
        }
        const user = userData[0];
        return db.select('hash')
          .from('login')
          .where('user_id', '=', user.user_id)
          .then(loginData => {
            if (loginData.length === 0) {
              return res.status(400).json('Insufficient Creds Bro, database err');
            }
            bcrypt.compare(password, loginData[0].hash, (err, result) => {
              if (result) {
                db.select('token')
                .from('dbx_tokens')
                .where('user_id', user.user_id)
                .then(dbxTokenData => {
                  const dbxToken = dbxTokenData.length > 0 
                  ? dbxTokenData[0].token
                  : null

                  res.cookie('user', userData[0], { maxAge: 30000000, path: '/', sameSite: 'none', secure: true });
                  if (dbxToken) {
                    res.cookie('token', dbxToken, { maxAge: 30000000, path: '/', sameSite: 'none', secure: true });
                  }
                  // console.log('user logged in: ', userData[0])
                  // console.log('user token generated: ', dbxToken)
                  res.json(userData[0]);
                })
              } else {
                res.status(400).json('Very Much Wrong Creds Bro');
              }
            });
          });
      })
      .catch(err => {
        console.log(err)
        res.status(400).json({ error: 'Wrong Creds Bro', details: err });
      });
  });

////////////////    Register    ////////////////

  authRoutes.post('/register', async(req, res) => {
    const { username, UID, email } = req.body;
    console.log(username, UID);

   try {
     const user = await db('users')
         .returning("*")
         .insert({
           username: username,
           uid: UID,
           user_email: email,
           date_user_joined: new Date(),
           user_status: 'New in town...',
           user_profile_pic: 'https://dl.dropboxusercontent.com/scl/fi/y7kg02pndbzra2v0hlg15/logo.png?rlkey=wzp1tr9f2m1z9rg1j9hraaog6&dl=0'
         })
           const userData = user[0];
               res.json(userData);
   }
          catch(err) {
            console.error(`Error with new register: ${err}`)
            res.status(400).json({ error: 'Unable to register1', message: err.message });
          }
      })
  

////////////////    Signout    ////////////////

  authRoutes.post('/signout', (req, res) => {
    res.clearCookie('user'); 
    res.clearCookie('token')
    res.status(204).send(); 
  });
  

  export default authRoutes 
  