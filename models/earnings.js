var mongoose = require('mongoose');

var adsenseIncomeSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId },
  // default date is yesterday : 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
  date : { type : Date, default: function(){return +new Date() - 24*60*60*1000;} },
  income: Number
});



module.exports = mongoose.model('AdsenseIncome', adsenseIncomeSchema);