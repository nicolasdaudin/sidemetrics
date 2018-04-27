var express = require('express');


var async = require('async');
//var Token = require('../models/token');
var Credentials = require('../models/credentials');
var User = require('../models/user');
var Income = require('../models/income');
var moment = require('moment');

var ObjectId = require('mongoose').Types.ObjectId;

var Curl = require( 'node-libcurl' ).Curl;


var router = express.Router();

//const AUTH_URL = 'https://services.daisycon.com/authenticate';
//const PUBLISHERS_URL = 'https://services.daisycon.com/publishers?page=1&per_page=1000';




// should only be called when the user tries to connect for the first time
router.get('/earnings/:username',function(req,res){
	console.log('\n##### [%s] get /awin/earnings',req.params.username);	
	var username = req.params.username;

	User.findByUsername(username,function(err,user){
		if (err){
			console.log('Error while retrieving user',err);
			callback(err,null);
		} else {
			//console.log('user',user);
			var yesterday = moment().subtract(1,'days'); 
			getEarningsSeveralDays(user._id,username,yesterday,yesterday,function(err,result){
				if (err){
					console.log("Returned from getEarnings (Awin) with ERROR");
					res.send("Returned from getEarnings (Awin) with ERROR");
				} else {
					//console.log("FINAL  RESULT",result);
					res.send("<p>FINAL RESULT</p>" + JSON.stringify(result));
				}
			});
		}
	});	
});


router.get('/historic/:username/:months',function(req,res){
	
	var username = req.params.username;
	var months = req.params.months;
	console.log('\n##### [%s] trying to get Awin historic earnings for the past %s months',username,months);

	User.findByUsername(username,function(err,user){
		if (err){
			console.log('Error while retrieving user',err);
			callback(err,null);
		} else {
			//console.log('user',user);
			var yesterday = moment().subtract(1,'days'); 
			var beginDay = moment().subtract(months,'months');

			getEarningsSeveralDays(user._id,username,beginDay,yesterday,function(err,result){
				if (err){
					console.log("Returned from getEarnings (Awin) with ERROR");
					res.send("Returned from getEarnings (AWin) with ERROR");
				} else {
					//console.log("FINAL  RESULT",result);
					res.send("<p>FINAL RESULT</p>" + JSON.stringify(result));
				}
			});
		}
	});	
});

var getEarnings = function (user_id,username,day,after){
	getEarningsSeveralDays(user_id,username,day,day,after);
}

var getEarningsSeveralDays = function (user_id,username,startDay,endDay,after){

	var awinApiStartDay = startDay.startOf("day").format('YYYY-MM-DD[T]HH:mm:ss');

	//awinApiStartDay = '2018-04-22T00:00:00';

	var awinApiEndDay = endDay.endOf("day").format('YYYY-MM-DD[T]HH:mm:ss');
	//awinApiEndDay='2018-04-23T23:59:59'
	console.log('awinApiStartDay',awinApiStartDay);
	console.log('awinApiEndDay',awinApiEndDay);
	



	console.log("############### [%s] Begin Awin getEarningsSeveralDays for days BETWEEN %s and %s",username,awinApiStartDay,awinApiEndDay);

	async.waterfall([	

		function findCredentials(callback){
			console.log('[%s] Awin - findCredentials',username);
			Credentials.Awin.findOne({user_id:user_id},function(err,credentials){
				if (err){
					console.log('err while getting Awin credentials',err);
					callback(err,null);
				} else if (!credentials || (credentials.length === 0)){
					// no credentials, this user is not connected to Awin
					console.log('user %s has no credentials for AWin, returning',username);
					callback('no credentials',null);
				} else {
					callback(null,credentials);
				}	
			});
		},
		

		function retrieveAwinEarnings(credentials,callback){

			console.log('[%s] ##### retrieveAwinEarnings',username);
			var publisherId = credentials.publisherId;
			var token = credentials.accessToken;

			var earningsObject = {};

			var curl = new Curl();			
			const url = `https://api.awin.com/publishers/${publisherId}/transactions/?startDate=${awinApiStartDay}&endDate=${awinApiEndDay}&timezone=UTC&accessToken=${token}`;
			console.log(url);


			curl.setOpt(Curl.option.URL,url);
			
			//curl.setOpt(Curl.option.VERBOSE, true );

			
			curl.on('end', function(statusCode,body,headers){
				//console.log('[%s] Result from CURL call: ',username,body);
				var result = JSON.parse(body);

				if (result && result.length>0){
					result.forEach(function(transaction){
						var commission = new Number(transaction.commissionAmount.amount);
						var formatDate = moment(transaction.transactionDate).format('YYYY-MM-DD');
						
						if (earningsObject[formatDate.toString()]) {
					    	earningsObject[formatDate.toString()] += commission;
					    } else {
					    	earningsObject[formatDate.toString()] = 0 + commission;
					    }
					});
				}
				
				callback(null,earningsObject);		
			});

			curl.on('error',function(err,errCode){
				console.log('[%s] Error while retrieving AWin earnings',username,err);
				callback(err,null);
			});

			curl.perform();
		}, 

		function saveAwinInDb(earningsObject,callback){

			console.log('[%s] ##### saveAwinInDb',username);
			//console.log('earningsObject',earningsObject);
			
			var error = "";
			
			if (earningsObject){
				
			
				var earningsDays = Object.keys(earningsObject);
				
				earningsDays.forEach(function (earningsDay){
					var commission = earningsObject[earningsDay];

					Income.Awin.findOneAndUpdate({ user_id: user_id, date: earningsDay}, {income : commission},{upsert:true},(function(err){
						if (err){
							console.log('[%s] Error while saving Awin earnings (%s,%s) into DB. Error : ',username,earningsDay,commission,err.errmsg);
							error = error.concat(err.errmsg+ '\n');								
						} else {
							console.log('[%s] Saved Awin earnings in DB: (%s,%s) ',username,earningsDay,commission);
							//callback(null,result);
						}						
					}));
				});		
				callback(null,earningsObject);		
			}

		}
	], function(err,result){
		if (err){
			console.log('[%s] final function err',username,err);
			after('error',null);
		} else {
			//console.log('[%s] final result',username,result);
			after(null,result);
		}
	});
};

var getMonthEarnings = function(user_id,username,day,after){
	console.log("[%s] #### getMonthEarnings for Awin",username);
	var monthNumber = day.month() + 1;
	//console.log("Month [%s] with number [%s]",day.format('MMMM'),monthNumber);
	Income.Awin.aggregate([
			// $project permet de créer un nouveau champ juste pour cet aggregate, appelé month. Appliqué à tous les documents
			{$project:{user_id:1,date:1,income:1,month : {$month : "$date"}}},
			// $match va donc matcher que les documents de user_id pour le mois 'month' créé auparavant
			{$match: { user_id : user_id, month: monthNumber}},
			// $group: obligé de mettre un _id car permet de grouper sur ce champ. 
			// Peut être utilisé plus tard pour faire l'aggregate sur tous les users ou sur tous les mois, par exemple pour envoyer le total de chaque mois passé
			{$group: { _id: "$user_id", total: {$sum: "$income"}}}
		],
		function(err,result){
			if (err){
				console.log("Error",err);
				after(err,null);
			} 
				
			
			after(null,result[0].total);
		}
	);
	//console.log("######### getMonthEarnings END");
};

module.exports = {router, getEarnings, getMonthEarnings};