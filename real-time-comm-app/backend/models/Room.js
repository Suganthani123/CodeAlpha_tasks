const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  settings: {
    whiteboardData: { type: String, default: '' },
    chatHistory: [{
      user: String,
      message: String,
      fileUrl: String,
      timestamp: Date
    }]
  }
});

module.exports = mongoose.model('Room', RoomSchema);