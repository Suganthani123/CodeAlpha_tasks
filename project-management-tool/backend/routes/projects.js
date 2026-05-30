const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Create project
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const project = new Project({
      name,
      description,
      owner: req.user.userId,
      members: [{ user: req.user.userId, role: 'admin' }]
    });
    
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all projects for user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      'members.user': req.user.userId
    }).populate('owner', 'name email')
      .populate('members.user', 'name email avatar');
    
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatar');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const isMember = project.members.some(m => m.user._id.toString() === req.user.userId);
    if (!isMember && project.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const isAdmin = project.members.some(m => m.user.toString() === req.user.userId && m.role === 'admin');
    if (project.owner.toString() !== req.user.userId && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { name, description, status } = req.body;
    if (name) project.name = name;
    if (description) project.description = description;
    if (status) project.status = status;
    project.updatedAt = Date.now();
    
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member to project
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { email, role } = req.body;
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const isAdmin = project.members.some(m => m.user.toString() === req.user.userId && m.role === 'admin');
    if (project.owner.toString() !== req.user.userId && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const alreadyMember = project.members.some(m => m.user.toString() === user._id.toString());
    if (alreadyMember) {
      return res.status(400).json({ message: 'User already in project' });
    }
    
    project.members.push({ user: user._id, role: role || 'member' });
    await project.save();
    
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;