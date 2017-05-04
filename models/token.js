var mongoose = require('mongoose');

var tokenSchema = new mongoose.Schema({
  user_id: { type: String, unique: true, index: true },
  access_token : String,
  refresh_token : String
});

module.exports = mongoose.model('Token', tokenSchema);