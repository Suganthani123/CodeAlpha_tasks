const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// Create task
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, project, assignedTo, priority, dueDate, labels } = req.body;
    
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const taskCount = await Task.countDocuments({ project });
    const task = new Task({
      title,
      description,
      project,
      assignedTo,
      createdBy: req.user.userId,
      priority,
      dueDate,
      labels,
      order: taskCount
    });
    
    await task.save();
    
    // Create notification for assigned user
    if (assignedTo && assignedTo.toString() !== req.user.userId) {
      const notification = new Notification({
        user: assignedTo,
        type: 'task_assigned',
        content: `You have been assigned to task: ${title}`,
        relatedId: task._id
      });
      await notification.save();
      
      // Emit socket event
      const io = req.app.get('io');
      io.to(`user_${assignedTo}`).emit('new-notification', notification);
    }
    
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email');
    
    // Emit to project room
    const io = req.app.get('io');
    io.to(`project_${project}`).emit('task-added', populatedTask);
    
    res.json(populatedTask);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tasks for project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort('order');
    
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const { status, assignedTo, priority, dueDate, title, description, order } = req.body;
    
    if (status) task.status = status;
    if (assignedTo) task.assignedTo = assignedTo;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = dueDate;
    if (title) task.title = title;
    if (description) task.description = description;
    if (order !== undefined) task.order = order;
    task.updatedAt = Date.now();
    
    await task.save();
    
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email');
    
    // Create notification for status change
    if (status && task.assignedTo) {
      const notification = new Notification({
        user: task.assignedTo,
        type: 'task_updated',
        content: `Task "${task.title}" status changed to ${status}`,
        relatedId: task._id
      });
      await notification.save();
    }
    
    const io = req.app.get('io');
    io.to(`project_${task.project}`).emit('task-updated', populatedTask);
    
    res.json(populatedTask);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    await task.remove();
    
    const io = req.app.get('io');
    io.to(`project_${task.project}`).emit('task-deleted', task._id);
    
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;