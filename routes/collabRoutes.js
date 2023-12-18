import { Router } from 'express'
import databaseConfig from '../database/db.js'
const { db } = databaseConfig

const collabRoutes = Router();

collabRoutes.get('/get-all', async(req, res) => {
    try {
       const collabUsers = await db('users')
        .select("*")
        .where('collab', '=', 'true')
        
        res.status(200).json({ collabUsers: collabUsers })
    } catch(err) {
        console.error(`Error getting collab users from db: ${err}`)
    }
})

collabRoutes.get('/collab-status', (req, res) => {
    try {
      const user = req.cookies.user
    if (user.collab === 'true'){
      res.status(200).json({collab: user.collab})
    }} catch (err) {
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
      if (currentCollab[0].collab === "false"){
        await db('users')
        .where('user_id', id)
        .update({
        collab: 'true'})
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
      res.cookie('user', req.cookies.user, { maxAge: 3000000, httpOnly: true, path: '/' });
      res.status(200).json({nextCollab: nextCollab});
      console.log('this: ', req.cookies.user)
    } catch (err) {
      console.error(`Trouble setting collab boolean in db: ${err}`)
    }
  })
  

  export default collabRoutes