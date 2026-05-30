const express = require('express');
const Room = require('../models/Room');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/create', auth, async (req, res) => {
  try {
    const roomId = Math.random().toString(36).substring(2, 10);
    const room = new Room({ roomId, creator: req.user.id, participants: [req.user.id] });
    await room.save();
    res.json({ roomId });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.post('/join/:roomId', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId, isActive: true });
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    
    if (!room.participants.includes(req.user.id)) {
      room.participants.push(req.user.id);
      await room.save();
    }
    res.json({ roomId: room.roomId, participants: room.participants });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;