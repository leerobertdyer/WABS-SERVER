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
import messageRoutes from './routes/messageRoutes.js';
import { createServer } from 'http'
import io from './sockets.js';
import promptRoutes from './routes/promptRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';


let serviceAccount
if (process.env.RENDER) {
  try {
    serviceAccount = '/etc/secrets/GOOGLE_APPLICATION_CREDENTIALS';
  } catch (error) {
    console.log('error finding service account: ', error)
  }
} else {
  serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const credential = admin.credential.cert(serviceAccount);

const firebaseApp = admin.initializeApp({
    credential
});

export const dbf = admin.firestore();

const { db } = dbConfig

const server = express();
const port = 4000;

/////////// Middleware ////////////
const allowedOrigins = [
  'https://www.leedyer.com',
  'https://www.auntvicki.rocks',
  process.env.REACT_APP_FRONTEND_URL,
  `${process.env.REACT_APP_FRONTEND_URL}/`,
  '/socket.io'
];

// Define CORS options
const corsOptions = {
  origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
      } else {
          callback(new Error('Not allowed by CORS'));
      }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS,CONNECT,TRACE',
  allowedHeaders: 'Content-Type, Authorization, X-Content-Type-Options, Accept, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 7200 
};

server.use(cors(corsOptions));

server.use(express.json());
server.use(cookieParser(process.env.COOKIE_SECRET, { sameSite: 'None', secure: true, domain: '.writeabadsong.com' })); 


///////////   SOCKETS   ////////////
const httpServer = createServer(server);
io.attach(httpServer)


            ///////////   ROUTES   ///////////
server.use('/profile', profileRoutes)
server.use('/', songRoutes)
server.use('/auth', authRoutes)
server.use('/', feedRoutes)
server.use('/collab', collabRoutes)
server.use('/messages', messageRoutes)
server.use('/', promptRoutes)
server.use('/portfolio', portfolioRoutes)

process.on('exit', () => {
  db.destroy();
});

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
