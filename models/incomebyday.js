var mongoose = require('mongoose');


var incomeByDaySchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId },
  date : { type : Date },
  source : String,
  income: Number
});



incomeByDaySchema.index({user_id:1,date:1,source:1}, {unique: true});


var IncomeByDay = mongoose.model('IncomeByDay', incomeByDaySchema);

var getDayEarnings = async function(user_id,username, begin,end, source){
  
	var beginDate = begin.format('YYYY-MM-DD');
	var endDate = end.format('YYYY-MM-DD');
	//console.log('Income.getDayEarnings - args: username[%s],begin[%s],end[%s],incomesource[%s]',username,beginDate,endDate,incomesource);
	try {
    var result = await IncomeByDay.find({user_id : user_id, date: {$gte : new Date(beginDate), $lte:new Date(endDate)},source:source}).exec(); 
    // result is of type 'model'. Don't ask why, it's the way it appears when we debug...
    console.log('[%s#%s] SUCCESSFULLY finished IncomeByDay.find for getDayEarnings between %s and %s',username,source,beginDate,endDate);
    return result;
  } catch (err) {    
    console.log('[%s#%s] ERROR for IncomeByDay.find for getDayEarnings between %s and %s',username,incomesource,beginDate,endDate, err);
    throw err;
  }
};

var getMonthEarnings = async function(user_id,username, day, source){
  var monthNumber = day.month() + 1;
  var yearNumber = day.year();
  //console.log('[%s] Income.getMonthEarnings - args: user_id[%s],username[%s],month[%s],incomesource[%s]',username,user_id,username,monthNumber,incomesource);
  //console.log('year',yearNumber);

  try {
    var result = await IncomeByDay.aggregate([
      // $project permet de créer un nouveau champ juste pour cet aggregate, appelé month. Appliqué à tous les documents
      {$project:{user_id:1,date:1,income:1,source:1,month : {$month : "$date"},year : {$year : "$date"}}},
      // $match va donc matcher que les documents de user_id pour le mois 'month' créé auparavant
      {$match: { user_id : user_id, source:source,month: monthNumber,year:yearNumber}},
      // $group: obligé de mettre un _id car permet de grouper sur ce champ. 
      // Peut être utilisé plus tard pour faire l'aggregate sur tous les users ou sur tous les mois, par exemple pour envoyer le total de chaque mois passé
      {$group: { _id: "$user_id", total: {$sum: "$income"}}}
    ]).exec();

    //console.log("[%s#%s] SUCCESSFULLY finished IncomeByDay.aggregate for getMonthEarnings for day %s : ",username, source,day,result);
    if (result && result[0]){
      return result[0].total;
    } else {
      return 0;
    }
  } catch (err){
    console.log("[%s#%s] ERROR for IncomeByDay.aggregate for getMonthEarnings for day %s :",username,source,day, err);
    throw err;
  }
};

var findMonthWithHighestIncome = async function(user_id,username){
    //console.log('[%s] findMonthWithHighestIncome for user_id %s and username %s',username,user_id,username);
    try {
        var result = await IncomeByDay.aggregate([
            // $project permet de créer un nouveau champ juste pour cet aggregate, appelé month. Appliqué à tous les documents
            {$project:{user_id:1,month : {$month : "$date"},year : {$year : "$date"},income:1}},
            // $match va donc matcher que les documents du user_id
            {$match: {user_id : user_id}},
            // $group: l'_id permet de dire sur quels champs on groupe            
            {$group: { _id: {user_id:"$user_id",month:"$month",year:"$year"}, total: {$sum: "$income"}}},
            // $sort: ordonne les résultats sur le champ total, en DESC
            {$sort:{total:-1}},
            // $limit: ne prend que le premier résultat pour chacun
            {$limit:1}
        ]).exec();

        //console.log('[%s] findMonthWithHighestIncome result',username,result);
        return result[0];
    } catch (err){
        console.log("[%s] ERROR findMonthWithHighestIncome :",username, err);
        throw err;
    }

}

var getAllIncomeByMonth = async function(user_id,username){
  //console.log('[%s] findMonthWithHighestIncome for user_id %s and username %s',username,user_id,username);
    try {
        var result = await IncomeByDay.aggregate([
            // $project permet de créer un nouveau champ juste pour cet aggregate, appelé month. Appliqué à tous les documents
            {$project:{user_id:1,month : {$month : "$date"},year : {$year : "$date"},income:1}},
            // $match va donc matcher que les documents du user_id
            {$match: {user_id : user_id}},
            // $group: l'_id permet de dire sur quels champs on groupe            
            {$group: { _id: {user_id:"$user_id",month:"$month",year:"$year"}, total: {$sum: "$income"}}},
            // $sort: ordonne les résultats par année puis mois, le mois en cours en premier
            {$sort:{"_id.year":-1,"_id.month":-1}}
        ]).exec();

        //console.log('[%s] getAllIncomeByMonth result',username,result);
        return result;
    } catch (err){
        console.log("[%s] ERROR getAllIncomeByMonth :",username, err);
        throw err;
    }
}

var findDayWithHighestIncome = async function(user_id,username){
    //console.log('[%s] findDayWithHighestIncome for user_id %s and username %s',username,user_id,username);
    try {
        var result = await IncomeByDay.aggregate([
            // $project permet de créer un nouveau champ juste pour cet aggregate, appelé month. Appliqué à tous les documents
            {$project:{user_id:1,date:1,income:1}},
            // $match va donc matcher que les documents du user_id
            {$match: {user_id : user_id}},
            // $group: l'_id permet de dire sur quels champs on groupe            
            {$group: { _id: {user_id:"$user_id",date:"$date"}, total: {$sum: "$income"}}},
            // $sort: ordonne les résultats sur le champ total, en DESC
            {$sort:{total:-1}},
            // $limit: ne prend que le premier résultat pour chacun
            {$limit:1}
        ]).exec();

        //console.log('[%s] findDayWithHighestIncome result',username,result);
        return result[0];
    } catch (err){
        console.log("[%s] ERROR findDayWithHighestIncome :",username, err);
        throw err;
    }
}

var orderDaysByHighestIncome = async function(user_id,username){
    //console.log('[%s] orderDaysByHighestIncome for user_id %s and username %s',username,user_id,username);
    try {
        var result = await IncomeByDay.aggregate([
            // $project permet de créer un nouveau champ juste pour cet aggregate, appelé month. Appliqué à tous les documents
            {$project:{user_id:1,date:1,income:1}},
            // $match va donc matcher que les documents du user_id
            {$match: {user_id : user_id}},
            // $group: l'_id permet de dire sur quels champs on groupe            
            {$group: { _id: {user_id:"$user_id",date:"$date"}, total: {$sum: "$income"}}},
            // $sort: ordonne les résultats sur le champ total, en DESC
            {$sort:{total:-1}}
        ]).exec();

        //console.log('[%s] orderDaysByHighestIncome result',username,result);
        return result;
    } catch (err){
        console.log("[%s] ERROR orderDaysByHighestIncome :",username, err);
        throw err;
    }
}

module.exports = { IncomeByDay,getDayEarnings,getMonthEarnings,findDayWithHighestIncome,findMonthWithHighestIncome,orderDaysByHighestIncome,getAllIncomeByMonth} ;