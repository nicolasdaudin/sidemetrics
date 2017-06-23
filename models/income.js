var mongoose = require('mongoose');

var adsenseIncomeSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId },
  date : { type : Date },
  income: Number
});

// with the following line, we can force the name of the collection
// but we'll do it later
// var dataSchema = new Schema({..}, { collection: 'data' })

var tradetrackerIncomeSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId },
  date : { type : Date },
  income: Number
});

adsenseIncomeSchema.index({user_id:1,date:1}, {unique: true});
tradetrackerIncomeSchema.index({user_id:1,date:1}, {unique: true});
var Adsense = mongoose.model('AdsenseIncome', adsenseIncomeSchema);
var Tradetracker = mongoose.model('TradetrackerIncome',tradetrackerIncomeSchema);



module.exports = { Adsense, Tradetracker } ;