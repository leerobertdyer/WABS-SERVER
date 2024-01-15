import dotenv from 'dotenv'
dotenv.config();

export const ELEPHANTSQL_URL = process.env.ELEPHANTSQL_URL
export const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY
export const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET
export const REACT_APP_FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY