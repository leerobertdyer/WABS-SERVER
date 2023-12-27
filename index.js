import express from 'express';
import cors from 'cors'
import profileRoutes from './routes/profileRoutes.js';
import {songRoutes} from './routes/songRoutes.js';
import authRoutes from './routes/authRoutes.js';
import dbConfig from './database/db.js'
import cookieParser from 'cookie-parser';
import feedRoutes from './routes/feedRoutes.js';
import collabRoutes from './routes/collabRoutes.js'
import admin from 'firebase-admin';

const fireBaseApp = admin.initializeApp();
export const dbf = admin.firestore();

const { db } = dbConfig
const server = express();
const port = 4000;


/////////// Middleware ////////////
const corsOptions = {
  origin: [process.env.REACT_APP_FRONTEND_URL, `${process.env.REACT_APP_FRONTEND_URL}/`],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
};
server.use(cors(corsOptions));

server.use(express.json());
server.use(cookieParser(process.env.COOKIE_SECRET, { sameSite: 'None', secure: true, domain: '.writeabadsong.com' })); 



            //////ROUTES//////
server.use('/profile', profileRoutes)
server.use('/', songRoutes)
server.use('/auth', authRoutes)
server.use('/', feedRoutes)
server.use('/collab', collabRoutes)

process.on('exit', () => {
  db.destroy();
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


