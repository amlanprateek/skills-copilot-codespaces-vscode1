// Create web server
const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')
const cors = require('cors')
const morgan = require('morgan')

const app = express()
app.use(bodyParser.json())
app.use(cors())
app.use(morgan('combined'))

// Create comment object
const commentsByPostId = {}

// Create endpoints
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || [])
})

app.post('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes(4).toString('hex')
  const { content } = req.body

  // Get existing comments (if any) for the post
  const comments = commentsByPostId[req.params.id] || []

  // Add new comment to existing comments array
  comments.push({ id: commentId, content, status: 'pending' })

  // Update comments for the post
  commentsByPostId[req.params.id] = comments

  // Emit event
  await axios.post('http://localhost:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending'
    }
  })

  // Return response
  res.status(201).send(comments)
})

app.post('/events', async (req, res) => {
  console.log('Received event', req.body.type)

  const { type, data } = req.body

  if (type === 'CommentModerated') {
    const { id, postId, status, content } = data

    // Get existing comments for the post
    const comments = commentsByPostId[postId]

    // Find comment with matching id
    const comment = comments.find((comment) => {
      return comment.id === id
    })

    // Update comment status
    comment.status = status

    // Emit event
    await axios.post('http://localhost:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        postId,
        status,
        content
      }
    })
  }

  // Return response
  res.send({})
})

// Start server
app.listen(4001, () => {
  console.log('Listening on 4001')
})