import express from 'express';
import cors from 'cors'
import profileRoutes from './routes/profileRoutes.js';
import songRoutes from './routes/songRoutes.js';
import authRoutes from './routes/authRoutes.js';
import dbConfig from './database/db.js'
import cookieParser from 'cookie-parser';
import feedRoutes from './routes/feedRoutes.js';
import collabRoutes from './routes/collabRoutes.js'

const { db } = dbConfig
const server = express();
const port = 4000;

/////////// Middleware ////////////
server.use(express.json());
const corsMiddleware = (req, res, next) => {
  const allowedOrigins = [
    process.env.REACT_APP_FRONTEND_URL,
    `${process.env.REACT_APP_FRONTEND_URL}/`,
  ];
  if (!allowedOrigins.includes(req.headers.origin)) {
    return res.sendStatus(403); 
  }
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE'); 
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', true); 
  next();
};

server.use(corsMiddleware);

server.use(cookieParser())

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


