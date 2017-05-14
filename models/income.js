var mongoose = require('mongoose');

var adsenseIncomeSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId },
  date : { type : Date },
  income: Number
});

adsenseIncomeSchema.index({user_id:1,date:1}, {unique: true});
var Adsense = mongoose.model('AdsenseIncome', adsenseIncomeSchema);



module.exports = { Adsense } ;