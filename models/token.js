var mongoose = require('mongoose');

var tokenSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  accessToken : String,
  refreshToken : String
});

module.exports = mongoose.model('Token', tokenSchema);