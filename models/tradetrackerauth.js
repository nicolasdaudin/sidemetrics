var mongoose = require('mongoose');

var tradetrackerAuthSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  customerID : String,
  passphrase : String
});

module.exports = mongoose.model('TradetrackerAuth', tradetrackerAuthSchema);