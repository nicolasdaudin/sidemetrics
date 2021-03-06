var express = require('express');

var google = require('googleapis');
var async = require ('async');
//var Token = require('../models/token');
var Credentials = require('../models/credentials');
var User = require('../models/user');
var Income = require('../models/income');
var IncomeByDay = require('../models/incomebyday');
var moment = require ('moment');

var ObjectId = require('mongoose').Types.ObjectId; 

/** GOOGLE OAUTH 2 INIT **/
var OAuth2 = google.auth.OAuth2;


var router = express.Router();

// should only be called when the user tries to connect for the first time
router.get('/connect/:username',function(req,res){
	console.log('\n##### [%s] get /adsense/connect',req.params.username);
	
	var scopes = ['https://www.googleapis.com/auth/adsense'];
	var user = { username: req.params.username };  

	var oauth2Client = new OAuth2(
		process.env.AUTH_GOOGLE_CLIENT_ID,
		process.env.AUTH_GOOGLE_CLIENT_SECRET,
		process.env.AUTH_GOOGLE_REDIRECT_URL);

	var url = oauth2Client.generateAuthUrl({
		access_type : 'offline',
		scope: scopes,
		state: encodeURIComponent(JSON.stringify(user))
	});



	//console.log('auth url',url);

	res.redirect(url);
});

// should only be called when the user tries to connect for the first time (after the oauth on Google side)
router.get('/oauth2callback',function(req,res){
	var code = req.query.code;
	var user = JSON.parse(decodeURIComponent(req.query.state));
	var username = user.username;
	//console.log('code',code);
	console.log('\n##### [%s] get /adsense/oauth2callback',username);

	var oauth2Client = new OAuth2(
		process.env.AUTH_GOOGLE_CLIENT_ID,
		process.env.AUTH_GOOGLE_CLIENT_SECRET,
		process.env.AUTH_GOOGLE_REDIRECT_URL);

	oauth2Client.getToken(code,function(err,tokensOAuth){
		//console.log('tokensOAuth',tokensOAuth);
		if (!err){
			oauth2Client.setCredentials(tokensOAuth);

			User.findByUsername(username,function(err,user){
				if (err){
					console.log('err',err);
					return;
				}
			
				Credentials.Adsense.find({user_id: user._id}, function(err,tokensDB){
					if (err){
						console.log('err',err);
					} else {
						//console.log('tokensDB',tokensDB);
						if (tokensDB.length === 0) {
							// create a new token
							// BE CAREFUL WITH THE REFRESH TOKEN. IT IS ONLY SET ON THE FIRST CONNECTION. 
							// AFTERWARDS NO REFRESH TOKEN, YOU NEED TO REVOKE THE ACCESS FROM THE GOOGLE ADMIN PANEL
							console.log(' Adsense - No token retrieved from DB. We create a new one');						
							var token = new Credentials.Adsense ({
								user_id : user._id,
								accessToken : tokensOAuth.access_token,
								refreshToken : tokensOAuth.refresh_token
							});
							token.save(function (err, savedToken) {
	    						if (err) { 
	    							console.log('err',err); 
	    						} else {
	    							//console.log('New token saved');
	    						}
	    						
	  						});
						} else {
							// update the token
							console.log('[%s] Adsense - Credentials.Adsense retrieved from DB. We will update it.',username);
							Credentials.Adsense.findOneAndUpdate(
								{user_id: user._id}, 
								(tokensOAuth.refresh_token  ?  
									{accessToken:  tokensOAuth.access_token, refreshToken : tokensOAuth.refresh_token}: 
									{accessToken:  tokensOAuth.access_token}), {new:true}, function(err,token){
							    	if (err){
							    		console.log('Adsense - error while updating tokens',err);
							    	} else {
							    		//console.log('updated token saved in DB',token);
							    	}
							    });
						}
					}
				});
			});

			google.options({
				auth: oauth2Client
			});
			
		}
	});

	var html = "<p>authenticated in Adsense</p><a href='/adsense/earnings/" + username + "'>get adsense earnings</a>";

	res.send(html);
});

// to be called once authentified. 
// can be called directly if we already have a refresh token (for example from the cron or someting...)
router.get('/earnings/:username',function(req,res){
	console.log('\n##### [%s] get /adsense/earnings',req.params.username);	
	var username = req.params.username;

	User.findByUsername(username,function(err,user){
		if (err){
			console.log('Adsense - Error while retrieving user',err);
			callback(err,null);
		} else {
			//console.log('user',user);
			var yesterday = moment().subtract(1,'days'); 
			getEarningsSeveralDays(user._id,username,yesterday,yesterday,function(err,result){
				if (err){
					console.log("Adsense - Returned from getEarnings (Adsense) with ERROR");
					res.send("Returned from getEarnings (Adsense) with ERROR");
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
	console.log('\n##### [%s] trying to get Adsense historic earnings for the past %s months',username,months);

	User.findByUsername(username,function(err,user){
		if (err){
			console.log('Adsense - Error while retrieving user',err);
			callback(err,null);
		
		} else {
			
			var yesterday = moment().subtract(1,'days'); 
			var beginDay = moment().subtract(months,'months');

			getEarningsSeveralDays(user._id,username,beginDay,yesterday,function(err,result){
				if (err){
					console.log("Adsense - Returned from getEarnings (Adsense) with ERROR");
					res.send("Returned from getEarnings (Adsense) with ERROR");
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

	console.log("############### [%s] BEGIN ADSENSE GET EARNINGS",username);

	var adsense;
	var accountId;
	

	var googleApiStartDay = startDay.format('YYYY-MM-DD');
	var googleApiEndDay = endDay.format('YYYY-MM-DD');
	
	async.waterfall([	

		function retrieveAdsenseTokens(callback){
			console.log('[%s] Adsense - retrieveAdsenseTokens',username);
			Credentials.Adsense.findOne({user_id: user_id}, function(err,tokenObject){
				if (err){
					console.log('[%s] Adsense - No token found',username);
					callback(err, null);
				} else {
					//console.log('[%s] token: ',username, tokenObject);

					var oauth2Client = new OAuth2(
						process.env.AUTH_GOOGLE_CLIENT_ID,
						process.env.AUTH_GOOGLE_CLIENT_SECRET,
						process.env.AUTH_GOOGLE_REDIRECT_URL);

					oauth2Client.setCredentials({
						access_token : tokenObject.accessToken,
						refresh_token : tokenObject.refreshToken,
						expiry_date : true
					});

					adsense = google.adsense({
						version:'v1.4',
						auth:oauth2Client
					});

					callback(null);
				}
			});
		},		
	
		function retrieveAdsenseAccountId(callback){
			//console.log('[%s] ##### Before Calling list',username);
			adsense.accounts.list({maxResults:10},function(err,result){
				if (err){
					console.error('[%s] Adsense - Error while retrieving accounts',username, err);
					callback(err, null);
				} else {
					//console.log('Accounts',result);
					//console.log('My account',result.items[0]);
					accountId = result.items[0].id;
					console.log('[%s] Adsense - AccountId retrieved: ',username,accountId);

					callback(null,accountId);
				}
			});
		},

		function retrieveAdsenseEarnings(accountId,callback){

			console.log('[%s] ##### retrieveAdsenseEarnings',username);

			var params  = {
				startDate : googleApiStartDay,
				endDate : googleApiEndDay,
				accountId: accountId, 
				useTimezoneReporting : true,
				dimension: 'DATE',
				metric: 'EARNINGS'
			};   

			//console.log('[%s] oauth2Client',username,oauth2Client);
			adsense.accounts.reports.generate(params,function(err,result){
				if (err){
					console.log('[%s] Adsense - Error while getting earnings',username,err);
					callback(err, null);
				} else {
					//console.log('[%s] Successfull',username);
					//console.log('result',result);
					//console.log('rows',result.rows[0]);
					callback(null, result);
				}
			});
		}, 

		function saveAdsenseInDb(result,callback){
			if (result && result.rows && result.rows.length>0) {
				result.rows.forEach( function (item){
					var tempDay = item[0];
					var tempEarning = item[1];
					//var adsenseIncome = new Income.Adsense ( { user_id: user_id, date: tempDay, income : tempEarning});
					
					IncomeByDay.IncomeByDay.findOneAndUpdate({ user_id: user_id, date: tempDay,source:'adsense'},{ income : tempEarning},{upsert:true},function(err){
					
						if (err){
							console.log('[%s] Adsense - Error while saving Adsense earnings (%s) into DB. Error : ',username,item,err.errmsg);
							//callback(null,result);
						} else {
							console.log('[%s] Adsense - Saved Adsense earnings in DB:',username,item);
							//callback(null,result);
						}
					});
				});
				callback(null,result);
			} else {
				callback(null,{totals:['',null]});
			}
			
		}
	], function(err,result){
		if (err){
			console.log('[%s] final function err',username,err);
			after('error',null);
		} else {
			var total = 0;
			if (result && result.totals && result.totals.length > 1 && result.totals[1]) {
				total = result.totals[1];
			}
			//console.log('[%s] final result',username,result);
			after(null,total);
		}
	});
};



module.exports = {router, getEarnings};//, getMonthEarnings};