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

var daisyconIncomeSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId },
  date : { type : Date },
  income: Number
});

var gamblingAffiliationIncomeSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId },
  date : { type : Date },
  income: Number
});

var awinIncomeSchema = new mongoose.Schema({
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
daisyconIncomeSchema.index({user_id:1,date:1}, {unique: true});
gamblingAffiliationIncomeSchema.index({user_id:1,date:1}, {unique: true});
awinIncomeSchema.index({user_id:1,date:1}, {unique: true});


var Adsense = mongoose.model('AdsenseIncome', adsenseIncomeSchema);
var Tradetracker = mongoose.model('TradetrackerIncome',tradetrackerIncomeSchema);
var Moolineo = mongoose.model('MoolineoIncome',moolineoIncomeSchema);
var Loonea = mongoose.model('LooneaIncome',looneaIncomeSchema);
var Thinkaction = mongoose.model('ThinkactionIncome',thinkactionIncomeSchema);
var Dgmax = mongoose.model('DgmaxIncome',dgmaxIncomeSchema);
var Daisycon = mongoose.model('DaisyconIncome',daisyconIncomeSchema);
var GamblingAffiliation = mongoose.model('GamblingAffiliationIncome',gamblingAffiliationIncomeSchema);
var Awin = mongoose.model('AwinIncome',awinIncomeSchema);

var getDayEarnings = async function(user_id,username, begin,end, incomesource, incomemodel){
  
	var beginDate = begin.format('YYYY-MM-DD');
	var endDate = end.format('YYYY-MM-DD');
	//console.log('Income.getDayEarnings - args: username[%s],begin[%s],end[%s],incomesource[%s]',username,beginDate,endDate,incomesource);
	try {
    var result = await incomemodel.find({user_id : user_id, date: {$gte : new Date(beginDate), $lte:new Date(endDate)}}).exec(); 
    // result is of type 'model'. Don't ask why, it's the way it appears when we debug...
    console.log('[%s#%s] SUCCESSFULLY finished incomemodel.find for getDayEarnings between %s and %s',username,incomesource,beginDate,endDate);
    return result;
  } catch (err) {    
    console.log('[%s#%s] ERROR for incomemodel.find for getDayEarnings between %s and %s',username,incomesource,beginDate,endDate, err);
    throw err;
  }
};

var getMonthEarnings = async function(user_id,username, day, incomesource, incomemodel){
  var monthNumber = day.month() + 1;
  var yearNumber = day.year();
  //console.log('[%s] Income.getMonthEarnings - args: user_id[%s],username[%s],month[%s],incomesource[%s]',username,user_id,username,monthNumber,incomesource);
  //console.log('year',yearNumber);

  try {
    var result = await incomemodel.aggregate([
      // $project permet de créer un nouveau champ juste pour cet aggregate, appelé month. Appliqué à tous les documents
      {$project:{user_id:1,date:1,income:1,month : {$month : "$date"},year : {$year : "$date"}}},
      // $match va donc matcher que les documents de user_id pour le mois 'month' créé auparavant
      {$match: { user_id : user_id, month: monthNumber,year:yearNumber}},
      // $group: obligé de mettre un _id car permet de grouper sur ce champ. 
      // Peut être utilisé plus tard pour faire l'aggregate sur tous les users ou sur tous les mois, par exemple pour envoyer le total de chaque mois passé
      {$group: { _id: "$user_id", total: {$sum: "$income"}}}
    ]).exec();

    console.log("[%s#%s] SUCCESSFULLY finished incomemodel.aggregate for getMonthEarnings for day %s : ",username, incomesource,day,result);
    if (result && result[0]){
      return result[0].total;
    } else {
      return 0;
    }
  } catch (err){
    console.log("[%s#%s] ERROR for incomemodel.aggregate for getMonthEarnings for day %s :",username,incomesource,day, err);
    throw err;
  }
};


module.exports = { Adsense, Tradetracker, Moolineo, Loonea, Thinkaction, Dgmax, Daisycon, GamblingAffiliation, Awin,getDayEarnings,getMonthEarnings} ;