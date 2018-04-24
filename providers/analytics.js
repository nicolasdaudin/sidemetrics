var express = require('express');

var google = require('googleapis');
var async = require ('async');
//var Token = require('../models/token');
var Credentials = require('../models/credentials');
var User = require('../models/user');
var Analytics = require('../models/analytics');
var moment = require ('moment');

var ObjectId = require('mongoose').Types.ObjectId; 

/** GOOGLE OAUTH 2 INIT **/
var OAuth2 = google.auth.OAuth2;


var router = express.Router();

// should only be called when the user tries to connect for the first time
router.get('/connect/:username',function(req,res){
	console.log('\n##### [%s] get /analytics/connect',req.params.username);
	
	var scopes = ['https://www.googleapis.com/auth/analytics'];
	var user = { username: req.params.username };  

	var oauth2Client = new OAuth2(
		process.env.AUTH_GOOGLE_CLIENT_ID,
		process.env.AUTH_GOOGLE_CLIENT_SECRET,
		process.env.AUTH_GOOGLE_ANALYTICS_REDIRECT_URL);

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
	console.log('\n##### [%s] get /analytics/oauth2callback',username);

	var oauth2Client = new OAuth2(
		process.env.AUTH_GOOGLE_CLIENT_ID,
		process.env.AUTH_GOOGLE_CLIENT_SECRET,
		process.env.AUTH_GOOGLE_ANALYTICS_REDIRECT_URL);

	oauth2Client.getToken(code,function(err,tokensOAuth){
		//console.log('tokensOAuth',tokensOAuth);
		if (!err){
			oauth2Client.setCredentials(tokensOAuth);

			User.findByUsername(username,function(err,user){
				if (err){
					console.log('err',err);
					return;
				}
			
				Credentials.Analytics.find({user_id: user._id}, function(err,tokensDB){
					if (err){
						console.log('err',err);
					} else {
						//console.log('tokensDB',tokensDB);
						if (tokensDB.length === 0) {
							// create a new token
							// BE CAREFUL WITH THE REFRESH TOKEN. IT IS ONLY SET ON THE FIRST CONNECTION. 
							// AFTERWARDS NO REFRESH TOKEN, YOU NEED TO REVOKE THE ACCESS FROM THE GOOGLE ADMIN PANEL
							console.log(' Analytics -No token retrieved from DB (for ANALYTICS). We create a new one');						
							var token = new Credentials.Analytics ({
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
							console.log('[%s]  Analytics -Credentials.Analytics retrieved from DB (for ANALYTICS). We will update it.',username);
							Credentials.Analytics.findOneAndUpdate(
								{user_id: user._id}, 
								(tokensOAuth.refresh_token  ?  
									{accessToken:  tokensOAuth.access_token, refreshToken : tokensOAuth.refresh_token}: 
									{accessToken:  tokensOAuth.access_token}), {new:true}, function(err,token){
							    	if (err){
							    		console.log(' Analytics -error while updating tokens',err);
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

	var html = "<p>authenticated in Analytics</p><a href='/analytics/usersessions/" + username + "'>get analytics usersessions</a>";

	res.send(html);
});

// to be called once authentified. 
// can be called directly if we already have a refresh token (for example from the cron or someting...)
router.get('/usersessions/:username',function(req,res){
	console.log('\n##### [%s] get /analytics/usersessions',req.params.username);	
	var username = req.params.username;

	User.findByUsername(username,function(err,user){
		if (err){
			console.log('Analytics - Error while retrieving user',err);
			callback(err,null);
		} else {
			//console.log('user',user);
			var yesterday = moment().subtract(1,'days'); 
			getUserSessionsSeveralDays(user._id,username,yesterday,yesterday,function(err,result){
				if (err){
					console.log("Analytics - Returned from getUserSessions (Analytics) with ERROR");
					res.send("Returned from getUserSessions (Analytics) with ERROR");
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
	console.log('\n##### [%s] trying to get Analytics historic visits for the past %s months',username,months);

	User.findByUsername(username,function(err,user){
		if (err){
			console.log('Analytics - Error while retrieving user',err);
			callback(err,null);
		
		} else {
			
			var yesterday = moment().subtract(1,'days'); 
			var beginDay = moment().subtract(months,'months');

			getUserSessionsSeveralDays(user._id,username,beginDay,yesterday,function(err,result){
				if (err){
					console.log("Analytics - Returned from getUserSessions (Analytics) with ERROR");
					res.send("Returned from getUserSessions (Analytics)  with ERROR");
				} else {
					//console.log("FINAL  RESULT",result);
					res.send("<p>FINAL RESULT</p>" + JSON.stringify(result));
				}
			});

		}
	});	
});

var getUserSessions = function (user_id,username,day,after){
	getUserSessionsSeveralDays(user_id,username,day,day,after);
}


var getUserSessionsSeveralDays = function (user_id,username,startDay,endDay,after){

	console.log("############### [%s] BEGIN ANALYTICS GET USER SESSIONS",username);

	var analyticsreporting;
	var accountId;
	

	var googleApiStartDay = startDay.format('YYYY-MM-DD');
	var googleApiEndDay = endDay.format('YYYY-MM-DD');
	
	async.waterfall([	

		function retrieveTokens(callback){
			console.log('[%s] Analytics - retrieveTokens',username);
			Credentials.Analytics.findOne({user_id: user_id}, function(err,tokenObject){
				if (err || !tokenObject){
					console.log('[%s] Analytics - No token found',username);
					callback("error", null);
				} else {
					//console.log('[%s] token: ',username, tokenObject);

					var oauth2Client = new OAuth2(
						process.env.AUTH_GOOGLE_CLIENT_ID,
						process.env.AUTH_GOOGLE_CLIENT_SECRET,
						process.env.AUTH_GOOGLE_ANALYTICS_REDIRECT_URL);

					oauth2Client.setCredentials({
						access_token : tokenObject.accessToken,
						refresh_token : tokenObject.refreshToken,
						expiry_date : true
					});

					analyticsreportingapi = google.analyticsreporting({
						version:'v4',
						auth:oauth2Client
					});
					var viewId = tokenObject.viewId;
					// logs to be removed una vez que está todo bien
					console.log('[%s] Google Analytics - viewId : ',username,viewId);
					callback(null,viewId);
				}
			});
		},	
		

		function retrieveAnalyticsUserSessions(viewId,callback){

			console.log('[%s] ##### retrieveAnalyticsUserSessions',username);

			var params  = { 
				resource : {
					"reportRequests" : [ 
						{	
							dateRanges: [
								{
						          	startDate: googleApiStartDay,
						          	endDate: googleApiEndDay
						        }
						    ],
					      	metrics: [
						        {
						          	expression: "ga:sessions"
						        }
					    	],
					    	dimensions: [
						    	{
						          	name: "ga:date"
						        }
						    ],
					      	viewId: viewId
					    }
				    ]
				}
			};
   

			//console.log('[%s] oauth2Client',username,oauth2Client);
			// examples of use : https://developers.google.com/analytics/devguides/reporting/core/v4/samples
			// examples of methods : https://developers.google.com/analytics/devguides/reporting/core/v4/rest/v4/reports/batchGet
			// le viewId correspond à l'internal id quand on récupère la liste des profiles, not the account id...c'est aussi le viewId sur Google Analytics
			// pour le récupérer programmatiquement j'imagine qu'il faut passer par autre chose que anayticsreporting.reports.batchGet... 
			// https://developers.google.com/analytics/devguides/config/mgmt/v3/mgmtReference/
			analyticsreportingapi.reports.batchGet(params,function(err,result){
				if (err){
					console.log('[%s] Analytics - Error while getting user sessions',username,err);
					callback(err, null);
				} else {
					callback(null, result);
				}
			});
		}, 

		function saveAnalyticsInDb(result,callback){

			/*result.reports["0"].data.rows["0"]
			Object
				dimensions: Array[1]
					0: "20180223"
					length: 1
					__proto__: Array[0]
				metrics: Array[1]
					0: Object
						values: Array[1]
							0: "4573"
							length: 1
							__proto__: Array[0]
						__proto__: Object
						length: 1
					__proto__: Array[0]
				__proto__: Object
			*/


			if (result && result.reports && result.reports.length>0 && result.reports[0].data && result.reports[0].data.rowCount > 0) {
				result.reports[0].data.rows.forEach( function (item){
					//console.log(JSON.stringify(item));
					var itemDate = item.dimensions[0];
					var itemDateFormatted = moment(itemDate).format('YYYY-MM-DD');
					var itemUserSessions = item.metrics[0].values[0];
					//console.log(itemDate,itemDateFormatted,itemUserSessions);
					
					Analytics.Analytics.findOneAndUpdate({ user_id: user_id, date: itemDateFormatted},{ sessions : itemUserSessions},{upsert:true},function(err){
					
						if (err){
							console.log('[%s] Analytics -Error while saving Analytics user sessions (%s) into DB. Error : ',username,JSON.stringify(item),err.errmsg);
							//callback(null,result);
						} else {
							console.log('[%s] Analytics - Saved Analytics user sessions in DB:',username,[itemDateFormatted,itemUserSessions]);
							//callback(null,result);
						}
					});
				});
				callback(null,result);
			} else {
				callback(null,null);
			}
			
		}
	], function(err,result){
		if (err){
			console.log('[%s] Analytics - final function err',username,err);
			after('error',null);
		} else {
			//console.log('[%s] Analytics - final result',username,result);
			after(null,result);
		}
	});
};

/**var getMonthUserSessions = function(user_id,username,day,after){
	console.log("[%s] ####getMonthUserSessions for Analytics",username);
	var monthNumber = day.month() + 1;
	//console.log("Month [%s] with number [%s]",day.format('MMMM'),monthNumber);
	Income.   .aggregate([
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
				
			console.log("Success with getMonthEarnings ADSENSE. Result: ",result);
			if (result && result[0]){
				after(null,result[0].total);
			} else {
				after(null,0);
			}
		}
	);
	//console.log("######### getMonthEarnings END");
};*/

module.exports = {router, getUserSessions};