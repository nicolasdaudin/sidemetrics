var express = require('express');

var router = express.Router();

var soap = require ('soap');
var Cookie = require ('soap-cookie');
var async = require ('async');


var moment = require ('moment');

var User = require('../models/user');
var Income = require('../models/income');
var Credentials = require('../models/credentials');

//var Auth = require('../models/tradetrackerauth');
var Curl = require( 'node-libcurl' ).Curl;

const SOAP_URL = 'https://login.thinkaction.com/affiliates/api/2/reports.asmx?WSDL';


// should only be called when the user tries to connect for the first time
router.get('/earnings/:username',function(req,res){
	console.log('\n##### [%s] get /thinkaction/earnings',req.params.username);
	var username = req.params.username;

	User.findByUsername(username,function(err,user){
		if (err){
			console.log('Error while retrieving user',err);
			res.send('Error while retrieving user',err);
		} else {
			//console.log('user',user);
			var yesterday = moment().subtract(1,'days'); 
			getEarningsSeveralDays(user._id,username,yesterday,yesterday,function(err,result){
				if (err){
					console.log("Returned from getEarnings (ThinkAction) with ERROR");
					res.send("Returned from getEarnings (ThinkAction) with ERROR");
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
	console.log('\n##### [%s] trying to get Thinkaction historic earnings for the past %s months',username,months);

	User.findByUsername(username,function(err,user){
		if (err){
			console.log('Error while retrieving user',err);
			callback(err,null);
		
		} else {
			
			var yesterday = moment().subtract(1,'days'); 
			var beginDay = moment().subtract(months,'months');

			getEarningsSeveralDays(user._id,username,beginDay,yesterday,function(err,result){
				if (err){
					console.log("Returned from getEarnings (ThinkAction) with ERROR");
					res.send("Returned from getEarnings (Thinkaction) with ERROR");
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

var getEarningsSeveralDays = function(user_id,username,startDay,endDay,after){

	console.log("############### [%s] BEGIN THINKACTION GET EARNINGS",username);

	var thinkactionBeginDay = startDay.startOf('day').format('YYYY-MM-DDTHH:mm:ss');
	var thinkactionEndDay = endDay.endOf('day').format('YYYY-MM-DDTHH:mm:ss');
	//var thinkactionInternalDay = startDay.format('YYYY-MM-DD');

	console.log("[%s] thinkActionday begin [%s] end [%s]",username,thinkactionBeginDay,thinkactionEndDay);

	async.waterfall([

		function findCredentials(callback){
			console.log('[%s] Thinkaction - findCredentials',username);
			Credentials.Thinkaction.findOne({user_id:user_id},function(err,credentials){
				if (err){
					console.log('err while getting Thinkaction credentials',err);
					callback(err,null);
				} else if (!credentials || (credentials.length === 0)){
					// no credentials, this user is not connected to Thinkaction
					console.log('user %s has no credentials for Thinkaction, returning',username);
					callback('no credentials',null);
				} else {
					callback(null,credentials);
				}	
			});
		},

		function retrieveThinkactionEarnings(credentials,callback){
			console.log('[%s] #### retrieveThinkactionEarnings', username);
		    var curl = new Curl();

			// be careful, this is ES2015/ES6 notation (see https://stackoverflow.com/questions/3304014/javascript-variable-inside-string-without-concatenation-like-php)
			// https://login.thinkaction.com/affiliates/api/Reports/DailySummary?start_date=2018-01-07&end_date=2018-01-08&api_key=HBPXuA72h0pNVW16Dzsuw&affiliate_id=50008425
			// docs at https://login.thinkaction.com/affiliates/api/docs#!/DailySummary/Daily_Get


			const url = `https://login.thinkaction.com/affiliates/api/Reports/DailySummary?start_date=${thinkactionBeginDay}&end_date=${thinkactionEndDay}&api_key=${credentials.api_key}&affiliate_id=${credentials.affiliate_id}`
			console.log('[%s] thinkAction url', username, url);


			curl.setOpt(Curl.option.URL,url);
			//curl.setOpt(Curl.option.HTTPHEADER, [authheader,'Accept: application/json'] );
			//curl.setOpt(Curl.option.VERBOSE, true );

			curl.on('end', function(statusCode,body,headers){
				var result = JSON.parse(body);
				//console.log('[%s] Result from CURL call: ',username,result);
				//var totalDay = result[0].transaction_open_amount + result[0].transaction_approved_amount + result[0].transaction_disapproved_amount;
				//console.log('[%s] Earned with Daisycon : ',username,totalDay);	
				callback(null,result);		
			});

			curl.on('error',function(err,errCode){
				console.log('[%s] Error while getting publisher id',username,err);
				callback(err,null);
			});

			curl.perform();


		},

		function saveInDb(result,callback){
			//console.log('async retrieveEarnings');


			var error = "";
			var daysProcessed = 0;
			if (result && result.data && result.data.length > 0) {
				result.data.forEach( function (item){
				
					var tempDay = item.date;
					var formatDay = moment(tempDay).format('YYYY-MM-DD');
					var tempEarning = item.revenue;
					//console.log('[%s] About to add in DB:',username,tempDay,formatDay,tempEarning);
					var thinkactionIncome = new Income.Thinkaction ( { user_id: user_id, date: formatDay, income : tempEarning});
					thinkactionIncome.save(function(err){
						if (err){
							
							if (err.name && err.name === 'MongoError' && err.code === 11000){ 
								console.log('[%s] DUPLICATE record while saving Thinkaction earnings (%s) into DB.',username,JSON.stringify(item));
							} else {
								console.log('[%s] Error while saving Thinkaction earnings (%s) into DB. Error : ',username,JSON.stringify(item),err.errmsg);
								error = error.concat('Error while saving Thinkaction earnings into DB for item ' + JSON.stringify(item) + '\n');
								//callback(null,result);
							}
						} else {
							console.log('[%s] Saved Thinkaction earnings in DB:',username,formatDay,tempEarning);
							//callback(null,result);
						}

						daysProcessed++;
						if(daysProcessed === result.data.length) {
							//  ############# 
							//      TODO
							// ##############
							// This is wrong: only callbacks with the last earning. This would not work for several days
							// but that's not the point. 
							// once we separate cron to retrieve earnings and cron to send emails, we will be muuuuch better
					      	callback(error,tempEarning);
					    }
					});
					
				});
			} else {
				console.log('[%s] Nothing saved for Thinkaction earnings in DB beteen [%s] and [%s]',username,thinkactionBeginDay,thinkactionEndDay);
				callback(null,0);
			}
			

		}

	], function(err,result){
		if (err){
			console.log('[%s] async final function err',username,err);
			after('error',result);
		} else {
			// to add at the end of async.waterfall return funciton
			//console.log('[%s] async final result',username,result);
			after(null,result);
		}
	});
};

var getMonthEarnings = function(user_id,username,day,after){
	console.log("[%s] #### getMonthEarnings for Thinkaction",username);
	var monthNumber = day.month() + 1;
	//console.log("Month [%s] with number [%s]",day.format('MMMM'),monthNumber);
	Income.Thinkaction.aggregate([
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
				
			//console.log("Success with getMonthEearnings THINKACTION. Result: ",result);
			after(null,result[0].total);
		}
	);
	//console.log("######### getMonthEarnings END");
};

module.exports = {router ,getEarnings, getMonthEarnings};