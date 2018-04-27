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

var getDayEarnings = function(user_id,username, begin,end, incomesource, incomemodel,callback){
  
	var beginDate = begin.format('YYYY-MM-DD');
	var endDate = end.format('YYYY-MM-DD');
	//console.log('Income.getDayEarnings - args: username[%s],begin[%s],end[%s],incomesource[%s]',username,beginDate,endDate,incomesource);
	incomemodel.find({user_id : user_id, date: {$gte : new Date(beginDate), $lte:new Date(endDate)}},function (err,result){
      // result is of type 'model'. Don't ask why, it's the way it appears when we debug...
      	if (err) {
      		console.log('[%s] ERROR for getDayEarnings between %s and %s, for source %s :',username,beginDate,endDate,incomesource, err);
      		callback(err,false);
      	} else {
      		console.log('[%s] SUCCESSFULLY finished getDayEarnings between %s and %s, for source %s',username,beginDate,endDate,incomesource);
      		callback(null,result);
      	} 
  	});
};

var getMonthEarnings = function(user_id,username, day, incomesource, incomemodel,callback){
  var monthNumber = day.month() + 1;
  //console.log('[%s] Income.getMonthEarnings - args: user_id[%s],username[%s],month[%s],incomesource[%s]',username,user_id,username,monthNumber,incomesource);
  

  incomemodel.aggregate([
      // $project permet de créer un nouveau champ juste pour cet aggregate, appelé month. Appliqué à tous les documents
      {$project:{user_id:1,date:1,income:1,month : {$month : "$date"}}},
      // $match va donc matcher que les documents de user_id pour le mois 'month' créé auparavant
      {$match: { user_id : user_id, month: monthNumber}},
      // $group: obligé de mettre un _id car permet de grouper sur ce champ. 
      // Peut être utilisé plus tard pour faire l'aggregate sur tous les users ou sur tous les mois, par exemple pour envoyer le total de chaque mois passé
      {$group: { _id: "$user_id", total: {$sum: "$income"}}}
    ],
    function(err,result){
      //console.log("[%s] Income.getMonthEarnings - aggreggate - err: %s - result: %s ",username,err,JSON.stringify(result));
      
      if (err){
        console.log("Error",err);
        callback(err,null);
      } 

      console.log("[%s] Success with getMonthEearnings. Result: ",username, result);
      if (result && result[0]){
        callback(null,result[0].total);
      } else {
        callback(null,0);
      }
    }
  );
  //console.log("######### getMonthEarnings END");
};


module.exports = { Adsense, Tradetracker, Moolineo, Loonea, Thinkaction, Dgmax, Daisycon, GamblingAffiliation, Awin,getDayEarnings,getMonthEarnings} ;