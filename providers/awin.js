var express = require('express');


var async = require('async');
//var Token = require('../models/token');
var Credentials = require('../models/credentials');
var User = require('../models/user');
var Income = require('../models/income');
var IncomeByDay = require('../models/incomebyday');
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




	console.log("############### [%s] Begin Awin getEarningsSeveralDays for days BETWEEN %s and %s",username,startDay,endDay);

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
		

		function retrieveAwinEarnings(credentials,callbackFromRetrieve){

			console.log('[%s] ##### retrieveAwinEarnings',username);
			var publisherId = credentials.publisherId;
			var token = credentials.accessToken;

			var earningsObject = {};
			
			
			// if date range > 31 days
			

			var tempstart = moment(startDay);
			var tempend = moment(endDay);

			async.doWhilst(
				function iteratee(callbackiteratee){
					//console.log('retrieveAwinEarnings - doWhilst - iteratee');


					if (tempend.diff(tempstart,'days') > 31){
						tempend = moment(tempstart).add(31,'days');
					}

					var awinApiStartDay = tempstart.startOf("day").format('YYYY-MM-DD[T]HH:mm:ss');
					var awinApiEndDay = tempend.endOf("day").format('YYYY-MM-DD[T]HH:mm:ss');
					//awinApiEndDay='2018-04-23T23:59:59'
					//console.log('awinApiStartDay  ',awinApiStartDay);
					//console.log('awinApiEndDay    ',awinApiEndDay);


					var curl = new Curl();			
					const url = `https://api.awin.com/publishers/${publisherId}/transactions/?startDate=${awinApiStartDay}&endDate=${awinApiEndDay}&timezone=UTC&accessToken=${token}`;
					console.log('[%s] retrieveAwinEarnings - calling AWin url with curl',username,url);


					curl.setOpt(Curl.option.URL,url);
					
					//curl.setOpt(Curl.option.VERBOSE, true );

					
					curl.on('end', function(statusCode,body,headers){
						//console.log('[%s] Result from CURL call: ',username,body);
						//console.log('[%s] statuscode from CURL call: ',username,statusCode);

						if (body && statusCode !== 200){
							console.log('[%s] retrieveAwinEarnings - Error when calling AWin: ',username,body);
						} else {

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
							} else {
								console.log('[%s] retrieveAwinEarnings - Nothing earned in that AWin curl request',username);

							}
						} 
						//console.log('retrieveAwinEarnings - doWhilst - before callbackiterateee');
						// timeout is because Awin does not accept more than 20 calls in one minute, so we separate each call by 3000ms in case of historic earning calls.
						setTimeout(callbackiteratee,3000);
							
					});

					curl.on('error',function(err,errCode){
						console.log('[%s] retrieveAwinEarnings - Error while retrieving AWin earnings',username,err);
						callback(err,null);
					});

					curl.perform();

				},
				function test(){
					//console.log('retrieveAwinEarnings - doWhilst - test');
					// we have to split the days if the difference between tempend and endDay is bigger than 31 days 
					// (in which case we know we need at least 2 api calls)
					var split = endDay.diff(tempend,'days')>31;

					// we go on, only if tempend is different than endday
					var testcontinue = endDay.diff(tempend,'days') > 0;
					if (split){
						tempstart = moment(tempend).add(1,'day');
						tempend = moment(tempstart).add(31,'days');
					} else {
						tempstart = moment(tempend).add(1,'day');
						tempend = moment(endDay);
					}
					return testcontinue;


				},
				function final(){
					console.log('[%s] retrieveAwinEarnings - finished with all the CURLs',username);
					callbackFromRetrieve(null,earningsObject);	
					


				}
			);

			
		}, 

		function saveAwinInDb(earningsObject,callback){

			console.log('[%s] ##### saveAwinInDb',username);
			//console.log('earningsObject',earningsObject);
			
			var error = "";
			
			if (earningsObject){
				
			
				var earningsDays = Object.keys(earningsObject);
				
				earningsDays.forEach(function (earningsDay){
					var commission = earningsObject[earningsDay];

					IncomeByDay.IncomeByDay.findOneAndUpdate({ user_id: user_id, date: earningsDay,source:'awin'}, {income : commission},{upsert:true},(function(err){
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


module.exports = {router, getEarnings};//, getMonthEarnings};