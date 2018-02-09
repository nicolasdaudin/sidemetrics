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

adsenseIncomeSchema.index({user_id:1,date:1}, {unique: true});
tradetrackerIncomeSchema.index({user_id:1,date:1}, {unique: true});
moolineoIncomeSchema.index({user_id:1,date:1}, {unique: true});
looneaIncomeSchema.index({user_id:1,date:1}, {unique: true});
thinkactionIncomeSchema.index({user_id:1,date:1}, {unique: true});
dgmaxIncomeSchema.index({user_id:1,date:1}, {unique: true});
daisyconIncomeSchema.index({user_id:1,date:1}, {unique: true});
gamblingAffiliationIncomeSchema.index({user_id:1,date:1}, {unique: true});


var Adsense = mongoose.model('AdsenseIncome', adsenseIncomeSchema);
var Tradetracker = mongoose.model('TradetrackerIncome',tradetrackerIncomeSchema);
var Moolineo = mongoose.model('MoolineoIncome',moolineoIncomeSchema);
var Loonea = mongoose.model('LooneaIncome',looneaIncomeSchema);
var Thinkaction = mongoose.model('ThinkactionIncome',thinkactionIncomeSchema);
var Dgmax = mongoose.model('DgmaxIncome',dgmaxIncomeSchema);
var Daisycon = mongoose.model('DaisyconIncome',daisyconIncomeSchema);
var GamblingAffiliation = mongoose.model('GamblingAffiliationIncome',gamblingAffiliationIncomeSchema);

var getDayEarnings = function(user_id,username, day, incomesource, incomemodel,callback){
  
  var date = day.format('YYYY-MM-DD');
  console.log('Income.getDayEarnings - args: user_id[%s],username[%s],day[%s],incomesource[%s]',user_id,username,date,incomesource);
  incomemodel.findOne({user_id : user_id, date: new Date(date)},function (err,result){
    // result is of type 'model'. Don't ask why, it's the way it appears when we debug...
    if (err) {
      console.log('[%s] ERROR for getDayEarnings for day %s and source %s :',username,day,incomesource, err);
      callback(err,false);
    } else if (result && result._doc){

      console.log('[%s] getDayEarnings for day %s and source %s is',username,day,incomesource,result);
      callback(null,result._doc);
    } else {
      //result is empty
      console.log('[%s] getDayEarnings for day %s and source %s is 0',username,day,incomesource);
      callback(null,{income:0});
    }
  });
};

var getMonthEarnings = function(user_id,username, day, incomesource, incomemodel,callback){
  var monthNumber = day.month() + 1;
  console.log('Income.getMonthEarnings - args: user_id[%s],username[%s],month[%s],incomesource[%s]',user_id,username,monthNumber,incomesource);
  

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
      console.log("Income.getMonthEarnings - aggreggate - err: %s - result: %s ",err,JSON.stringify(result));
      
      if (err){
        console.log("Error",err);
        callback(err,null);
      } 

      console.log("Success with getMonthEearnings. Result: ",result);
      if (result && result[0]){
        callback(null,result[0].total);
      } else {
        callback(null,0);
      }
    }
  );
  //console.log("######### getMonthEarnings END");
};


module.exports = { Adsense, Tradetracker, Moolineo, Loonea, Thinkaction, Dgmax, Daisycon, GamblingAffiliation,getDayEarnings,getMonthEarnings} ;