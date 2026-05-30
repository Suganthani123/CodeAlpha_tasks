const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// Add comment to task
router.post('/', auth, async (req, res) => {
  try {
    const { content, task, mentions } = req.body;
    
    const taskExists = await Task.findById(task);
    if (!taskExists) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const comment = new Comment({
      content,
      task,
      author: req.user.userId,
      mentions: mentions || []
    });
    
    await comment.save();
    
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'name email avatar')
      .populate('mentions', 'name email');
    
    // Create notifications for mentions
    if (mentions && mentions.length > 0) {
      for (const mentionedUser of mentions) {
        if (mentionedUser.toString() !== req.user.userId) {
          const notification = new Notification({
            user: mentionedUser,
            type: 'comment_mention',
            content: `${req.user.name} mentioned you in a comment on task "${taskExists.title}"`,
            relatedId: task
          });
          await notification.save();
        }
      }
    }
    
    const io = req.app.get('io');
    io.to(`project_${taskExists.project}`).emit('comment-added', populatedComment);
    
    res.json(populatedComment);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comments for task
router.get('/task/:taskId', auth, async (req, res) => {
  try {
    const comments = await Comment.find({ task: req.params.taskId })
      .populate('author', 'name email avatar')
      .populate('mentions', 'name email')
      .sort('-createdAt');
    
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
