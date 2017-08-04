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

var moolineoIncomeSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId },
  date : { type : Date },
  income: Number
});

var looneaIncomeSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId },
  date : { type : Date },
  income: Number
});

var thinkactionIncomeSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId },
  date : { type : Date },
  income: Number
});

var dgmaxIncomeSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId },
  date : { type : Date },
  income: Number
});

adsenseIncomeSchema.index({user_id:1,date:1}, {unique: true});
tradetrackerIncomeSchema.index({user_id:1,date:1}, {unique: true});
moolineoIncomeSchema.index({user_id:1,date:1}, {unique: true});
looneaIncomeSchema.index({user_id:1,date:1}, {unique: true});
thinkactionIncomeSchema.index({user_id:1,date:1}, {unique: true});
dgmaxIncomeSchema.index({user_id:1,date:1}, {unique: true});


var Adsense = mongoose.model('AdsenseIncome', adsenseIncomeSchema);
var Tradetracker = mongoose.model('TradetrackerIncome',tradetrackerIncomeSchema);
var Moolineo = mongoose.model('MoolineoIncome',moolineoIncomeSchema);
var Loonea = mongoose.model('LooneaIncome',looneaIncomeSchema);
var Thinkaction = mongoose.model('ThinkactionIncome',thinkactionIncomeSchema);
var Dgmax = mongoose.model('DgmaxIncome',dgmaxIncomeSchema);

module.exports = { Adsense, Tradetracker, Moolineo, Loonea, Thinkaction, Dgmax} ;