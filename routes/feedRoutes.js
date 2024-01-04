import { Router } from 'express'
import databaseConfig from '../database/db.js'
const { db } = databaseConfig
import io from '../sockets.js';

const feedRoutes = Router();

feedRoutes.get('/feed', async (req, res) => {
    try {
        const newFeed = await db('feed')
            .leftJoin('users', 'feed.user_id', '=', 'users.user_id')
            .leftJoin('songs', 'feed.song_id', '=', 'songs.song_id')
            .leftJoin('music', 'feed.music_id', '=', 'music.music_id')
            .leftJoin('lyrics', 'feed.lyric_id', '=', 'lyrics.lyric_id')
            .select('*')
            .orderBy('time', 'desc')
        const filteredFeed = [...newFeed].filter((post) => {
            return (post.type === "lyrics" || post.type === "music");
        });
        res.status(200).json({ newFeed: newFeed, filteredFeed: filteredFeed })
    } catch (error) {
        console.error(`Trouble getting feed from database: ${error}`)
    }
});

feedRoutes.get('/get-stars', async (req, res) => {
    const id = req.query.id;
    const stars = await db('stars').select('post_id').where('user_id', id)
    res.status(200).json({ userStars: stars })
});

feedRoutes.put('/update-stars', async (req, res) => {
    const postId = req.query.postId
    const userId = req.query.userId

    const existingStar = await db('stars')
        .where({ post_id: postId, user_id: userId })
        .first();

    if (existingStar) {
        await db('stars').where({ post_id: postId, user_id: userId }).del();
        await db('feed').where('feed_id', postId).decrement('stars', 1)
        io.emit('updateFeed')
        res.status(200).json({ message: 'un-starred', post: postId })
    } else {
        await db('stars').insert({ post_id: postId, user_id: userId })
        await db('feed').where('feed_id', postId).increment('stars', 1)
        io.emit('updateFeed')
        res.status(200).json({ message: 'starred', post: postId });
    }
});

feedRoutes.delete('/delete-post', async (req, res) => {
    const feed_id = req.query.feed_id;
    const feed_type = req.query.feed_type;
    const user_id = req.query.user_id;
        try {
            try {
                await db('stars')
                    .where('post_id', feed_id)
                    .del();
            } catch (err) {
                console.error(`Either no stars in db, or error deleting ${err.message}`)
            }
            if (feed_type === "song" || feed_type === "collab") {
                try {
                    let songIdData
                    if (feed_type === "collab") {
                        await db('collab')
                            .where('feed_id', feed_id)
                            .del()
                        await db('feed').where('feed_id', feed_id).del();
                    } else if (feed_type === "song") {
                        songIdData = await db('feed')
                        .where('feed_id', feed_id)
                        .returning('song_id')
                        .del()
                        songId = songIdData[0].song_id
                        if (songId) {
                            const dbx_url = await db('songs')
                                .where('song_id', songId)
                                .returning('song_file')
                                .del()
                            //*********** *********** *********** ***********//
                            //*********** Handle DBX DELETE HERE ***********//
                            //*********** *********** *********** ***********//
                        }
                    }
                    
                    io.emit('updateFeed')
                } catch (err) {
                    console.error(`Error deleting from feed or songs table, ${err.message}`)
                }
            } else if (feed_type === "status" || feed_type === "profile_pic" || feed_type === "profile_background") {
                try {
                    await db('feed')
                        .where('feed_id', feed_id)
                        .del()
                } catch (err) {
                    console.error(`Error deleting status from feed table: ${err}`)
                }
            } else if (feed_type === "music" || feed_type === "collab") {
                try {
                    const musicIdData = await db('collab')
                        .where('feed_id', feed_id)
                        .returning('music')
                        .del();
                    await db('feed')
                        .where('feed_id', feed_id)
                        .del();
                    console.log(musicIdData);
                    const musicId = musicIdData[0].music_id

                    if (musicId) {
                        const dbx_url = await db('music')
                            .where('music_id', musicId)
                            .returning('song_file')
                            .del()
                        //*********** *********** *********** ***********//
                        //*********** Handle DBX DELETE HERE ***********//
                        //*********** *********** *********** ***********//
                    }
                } catch (err) {
                    console.error(`Error deleting from feed or music table, ${err.message}`)
                }
            } else if (feed_type === "lyrics") {
                await db('collab')
                    .where('feed_id', feed_id)
                    .del();
                const lyricIdData = await db('feed')
                    .where('feed_id', feed_id)
                    .returning('lyric_id')
                    .del();
                const lyricId = lyricIdData[0].lyric_id
                await db('lyrics')
                    .where('lyric_id', lyricId)
                    .del();
            }
            io.emit('updateFeed')
            res.status(200).json({ message: `Post ${feed_id} deleted.` });
        } catch (err) {
            console.error(`Error deleting post: ${err}`)
        }
})

feedRoutes.put("/update-sortfeed", async (req, res) => {
    const userId = req.body.user_id;
    const sortfeed = req.body.sortfeed
    try {
        await db('users').where('user_id', userId).update({ sortfeed: sortfeed })
        res.status(200).json({ message: 'success' })
    } catch (error) {
        console.error(`Error updating user.sortfeed: ${error}`)
        res.status(500).json({error: "internal SErviCE erroR"})
    }
})


export default feedRoutes