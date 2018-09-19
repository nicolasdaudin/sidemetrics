var mongoose = require('mongoose');


var analyticsSessionsSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId },
  date : { type : Date },
  sessions: Number
});

analyticsSessionsSchema.index({user_id:1,date:1}, {unique: true});



var Analytics = mongoose.model('AnalyticsSessions', analyticsSessionsSchema);


var getDaySessions = function(user_id,username, begin,end, callback){
  
	var beginDate = begin.format('YYYY-MM-DD');
	var endDate = end.format('YYYY-MM-DD');
	console.log('Income.getDaySessions - args: username[%s],begin[%s],end[%s]',username,beginDate,endDate);
	Analytics.find({user_id : user_id, date: {$gte : new Date(beginDate), $lte:new Date(endDate)}},function (err,result){
      // result is of type 'model'. Don't ask why, it's the way it appears when we debug...
      	if (err) {
      		console.log('[%s] ERROR for getDaySessions between %s and %s  :',username,beginDate,endDate, err);
      		callback(err,false);
      	} else {
      		//console.log('[%s] getDaySessions between %s and %s. Number of session is',username,beginDate,endDate,result);
      		callback(null,result);
      	} 
  	});
};

var getMonthSessions = function(user_id,username, day,callback){
  var monthNumber = day.month() + 1;
  console.log('Income.getMonthSessions - args: user_id[%s],username[%s],month[%s]',user_id,username,monthNumber);
  

  Analytics.aggregate([
      // $project permet de créer un nouveau champ juste pour cet aggregate, appelé month. Appliqué à tous les documents
      {$project:{user_id:1,date:1,sessions:1,month : {$month : "$date"}}},
      // $match va donc matcher que les documents de user_id pour le mois 'month' créé auparavant
      {$match: { user_id : user_id, month: monthNumber}},
      // $group: obligé de mettre un _id car permet de grouper sur ce champ. 
      // Peut être utilisé plus tard pour faire l'aggregate sur tous les users ou sur tous les mois, par exemple pour envoyer le total de chaque mois passé
      {$group: { _id: "$user_id", total: {$sum: "$sessions"}}}
    ],
    function(err,result){
      console.log("Income.getMonthSessions - aggreggate - err: %s - result: %s ",err,JSON.stringify(result));
      
      if (err){
        console.log("Error",err);
        callback(err,null);
      } 

      console.log("Success with getMonthSessions. Result: ",result);
      if (result && result[0]){
        callback(null,result[0].total);
      } else {
        callback(null,0);
      }
    }
  );
  //console.log("######### getMonthSessions END");
};

var findDayWithMostVisits = async function(user_id,username){
    //console.log('[%s] findDayWithMostVisits for user_id %s and username %s',username,user_id,username);
    try {
        var result = await Analytics.aggregate([
            // $project permet de créer un nouveau champ juste pour cet aggregate, appelé month. Appliqué à tous les documents
            {$project:{user_id:1,date:1,sessions:1}},
            // $match va donc matcher que les documents du user_id
            {$match: {user_id : user_id}},
            // $sort: ordonne les résultats sur le champ total, en DESC
            {$sort:{sessions:-1}},
            // $limit: ne prend que le premier résultat pour chacun
            {$limit:1}
        ]).exec();

        //console.log('[%s] findDayWithMostVisits result',username,result);
        return result[0];
    } catch (err){
        console.log("[%s] ERROR findDayWithMostVisits :",username, err);
        throw err;
    }
}

var orderDaysWithMostVisits = async function(user_id,username){
    //console.log('[%s] findDayWithMostVisits for user_id %s and username %s',username,user_id,username);
    try {
        var result = await Analytics.aggregate([
            // $project permet de créer un nouveau champ juste pour cet aggregate, appelé month. Appliqué à tous les documents
            {$project:{user_id:1,date:1,sessions:1}},
            // $match va donc matcher que les documents du user_id
            {$match: {user_id : user_id}},
            // $sort: ordonne les résultats sur le champ total, en DESC
            {$sort:{sessions:-1}}
        ]).exec();

        //console.log('[%s] findDayWithMostVisits result',username,result);
        return result;
    } catch (err){
        console.log("[%s] ERROR orderDaysWithMostVisits :",username, err);
        throw err;
    }
}


module.exports = { Analytics,getDaySessions,getMonthSessions,findDayWithMostVisits,orderDaysWithMostVisits} ;