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

const AUTH_URL = 'https://services.daisycon.com/authenticate';
const PUBLISHERS_URL = 'https://services.daisycon.com/publishers?page=1&per_page=1000';




// should only be called when the user tries to connect for the first time
router.get('/earnings/:username',function(req,res){
	console.log('\n##### [%s] get /daisycon/earnings',req.params.username);	
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
					console.log("Returned from getEarnings (Daisycon) with ERROR");
					res.send("Returned from getEarnings (Daisycon) with ERROR");
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
	console.log('\n##### [%s] trying to get Daisycon historic earnings for the past %s months',username,months);

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
					console.log("Returned from getEarnings (Daisycon) with ERROR");
					res.send("Returned from getEarnings (Daisycon) with ERROR");
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

	var daisyconApiStartDay = startDay.format('YYYY-MM-DD');
	var daisyconApiEndDay = endDay.format('YYYY-MM-DD');
	
	console.log("############### [%s] Begin DAISYCON getEarningsSeveralDays for days BETWEEN %s and %s",username,daisyconApiStartDay,daisyconApiEndDay);

	async.waterfall([	

		function findCredentials(callback){
			console.log('[%s] Daisycon - findCredentials',username);
			Credentials.Daisycon.findOne({user_id:user_id},function(err,credentials){
				if (err){
					console.log('err while getting Daisycon credentials',err);
					callback(err,null);
				} else if (!credentials || (credentials.length === 0)){
					// no credentials, this user is not connected to Daisycon
					console.log('user %s has no credentials for Daisycon, returning',username);
					callback('no credentials',null);
				} else {
					callback(null,credentials);
				}	
			});
		},

		
		function getDaisyconToken(credentials,callback){
			console.log('[%s] getDaisyconToken',username);

			var curl = new Curl();

			//var userpwd = { username : 'nicolas@abcargent.com', password : 'qud8WIEJ' };
			var userpwd = { username : credentials.username, password: credentials.password };

			curl.setOpt(Curl.option.URL,AUTH_URL);
			//curl.setOpt('body',userpwd);
			curl.setOpt(Curl.option.POSTFIELDS,JSON.stringify(userpwd));
			//curl.setOpt(Curl.option.PASSWORD,'qud8WIEJ');

			curl.on('end', function(statusCode,body,headers){
				var token = JSON.parse(body);	
				//console.log('[%s] Auth token is ',username,token);	
				callback(null,token);			
			});

			curl.on('error',function(err,errCode){
				console.log('[%s] Error while authenticating',username,err);
				callback(err,null);
			});

			curl.perform();


		},
		function getDaisyconPublisherId(token,callback){
			console.log('[%s] getDaisyconPublisherId',username);

			var authheader = 'Authorization: Bearer '.concat(token);
			console.log('[%s] header : ', username, authheader);

			var curl = new Curl();
			curl.setOpt(Curl.option.URL, PUBLISHERS_URL);
			curl.setOpt(Curl.option.HTTPHEADER, [authheader,'Accept: application/json'] );
			//curl.setOpt(Curl.option.VERBOSE, true );

			curl.on('end', function(statusCode,body,headers){
				var publisherId = JSON.parse(body)[0].id;
				console.log('[%s] publisherId found: ',username,publisherId);	
				callback(null,publisherId,authheader);		
			});

			curl.on('error',function(err,errCode){
				console.log('[%s] Error while getting publisher id',username,err);
				callback(err,null);
			});

			curl.perform();

		},
		

		function retrieveDaisyconEarnings(publisherId,authheader,callback){

			console.log('[%s] ##### retrieveDaisyconEarnings',username);

			var curl = new Curl();
			// be careful, this is ES2015/ES6 notation (see https://stackoverflow.com/questions/3304014/javascript-variable-inside-string-without-concatenation-like-php)
			
			// https://services.daisycon.com/publishers/369190/statistics/date?start=2017-10-29&end=2017-11-02&page=1&per_page=1000&smartview=transaction
			// docs at https://developers.daisycon.com/api/resources/publisher-resources/ + statistics/date
			// JSON.parse(body) below is 
			/*[nicdo77] result found:  [ { date: '2017-11-24',
					click_raw: 141,
click_unique: 134,
cpc_raw: 0,
cpc_unique: 0,
clickout_raw: 0,
clickout_unique: 0,
transaction_unique: 3,
transaction_open: 3,
transaction_open_parts: 3,
transaction_approved: 0,
transaction_approved_parts: 0,
transaction_disapproved: 0,
transaction_disapproved_parts: 0,
transaction_revenue: 0,
cpc_amount: 0,
clickout_amount: 0,
transaction_open_amount: 2.15,
transaction_approved_amount: 0,
transaction_disapproved_amount: 0 } ]*/

			const url = `https://services.daisycon.com/publishers/${publisherId}/statistics/date?start=${daisyconApiStartDay}&end=${daisyconApiEndDay}&page=1&per_page=1000&smartview=transaction`;
			console.log(url);


			curl.setOpt(Curl.option.URL,url);
			curl.setOpt(Curl.option.HTTPHEADER, [authheader,'Accept: application/json'] );
			//curl.setOpt(Curl.option.VERBOSE, true );

			//http://localhost:5000/daisycon/earnings/jimena123
			//16:27:32 debug.1   |  https://services.daisycon.com/publishers/382126/statistics/date?start=2018-02-04&end=2018-02-04&page=1&per_page=100&smartview=transaction
			//CRON
			//16:28:25 debug.1   |  https://services.daisycon.com/publishers/382126/statistics/date?start=2018-02-06&end=2018-02-06&page=1&per_page=100&smartview=transaction

			curl.on('end', function(statusCode,body,headers){
				//console.log('[%s] Result from CURL call: ',username,body);
				var result = JSON.parse(body);
				
				//var totalDay = result[0].transaction_open_amount + result[0].transaction_approved_amount + result[0].transaction_disapproved_amount;
				//console.log('[%s] Earned with Daisycon : ',username,totalDay);	
				callback(null,result);		
			});

			curl.on('error',function(err,errCode){
				console.log('[%s] Error while retrieving daisycon earnings',username,err);
				callback(err,null);
			});

			curl.perform();
		}, 

		function saveDaisyconInDb(result,callback){


//https://services.daisycon.com/publishers/369190/statistics/date?start=2017-12-26&end=2018-01-25&page=1&per_page=100&smartview=transaction
//[nicdo77] Result from CURL call:  [ { date: '2017-12-26',
//    click_raw: 137,
//    click_unique: 131,
//    cpc_raw: 0,
//    cpc_unique: 0,
//    clickout_raw: 0,
//    clickout_unique: 0,
//    transaction_unique: 4,
//    transaction_open: 0,
//    transaction_open_parts: 0,
//    transaction_approved: 4,
//    transaction_approved_parts: 4,
//    transaction_disapproved: 0,
//    transaction_disapproved_parts: 0,
//    transaction_revenue: 0,
//    cpc_amount: 0,
//    clickout_amount: 0,
//    transaction_open_amount: 0,
//    transaction_approved_amount: 3.74,
//    transaction_disapproved_amount: 0 },
//  { date: '2017-12-27',
//    click_raw: 141,

			var error = "";
			var daysProcessed = 0;
			if (result && result.length > 0) {
				result.forEach( function (item){
				
					var tempDay = item.date;
					var tempEarning = item.transaction_open_amount + item.transaction_approved_amount + item.transaction_disapproved_amount;
					//console.log('[%s] Daisycon Earnings - About to add in DB:',username,tempDay,tempEarning);
					//var daisyconIncome = new Income.Daisycon ( { user_id: user_id, date: tempDay, income : tempEarning});
					//daisyconIncome.save(function(err){
					Income.Daisycon.findOneAndUpdate({ user_id: user_id, date: tempDay},{income: tempEarning},{upsert:true},function(err){	
						if (err){
							console.log('[%s] Error while saving Daisycon earnings (%s) into DB. Error : ',username,JSON.stringify(item),err.errmsg);
							error = error.concat('Error while saving Daisycon earnings into DB for item ' + JSON.stringify(item) + '\n');							
						} else {
							console.log('[%s] Saved Daisycon earnings in DB:',username,tempDay,tempEarning);
							//callback(null,result);
						}

						// this part is because forEach is asynch
						daysProcessed++;
						if(daysProcessed === result.length) {
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
				console.log('[%s] Nothing saved for Daisycon earnings in DB between [%s] and [%s]',username,daisyconApiStartDay,daisyconApiEndDay);
				callback(null,0);
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

/*
var getMonthEarnings = function(user_id,username,day,after){
	console.log("[%s] #### getMonthEarnings for Daisycon",username);
	var monthNumber = day.month() + 1;
	//console.log("Month [%s] with number [%s]",day.format('MMMM'),monthNumber);
	Income.Daisycon.aggregate([
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
				
			//console.log("Success with getMonthEearnings ADSENSE. Result: ",result);
			after(null,result[0].total);
		}
	);
	//console.log("######### getMonthEarnings END");
};
*/

module.exports = {router, getEarnings};//, getMonthEarnings};