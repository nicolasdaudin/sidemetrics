var express = require('express');

var google = require('googleapis');
var async = require ('async');
var Token = require('../models/token');
var User = require('../models/user');
var Income = require('../models/income');
var moment = require ('moment');

var ObjectId = require('mongoose').Types.ObjectId; 

/** GOOGLE OAUTH 2 INIT **/
var OAuth2 = google.auth.OAuth2;


var router = express.Router();

// should only be called when the user tries to connect for the first time
router.get('/connect/:username',function(req,res){
	console.log('\n##### get /adsense/connect');
	
	/*var OAuth2 = google.auth.OAuth2;

	oauth2Client = new OAuth2(
		config.auth.google.client_id,
		config.auth.google.client_secret,
		config.auth.google.redirect_url);
		*/

	console.log('username',req.params.username);
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



	console.log('auth url',url);

	res.redirect(url);
});

// should only be called when the user tries to connect for the first time (after the oauth on Google side)
router.get('/oauth2callback',function(req,res){
	var code = req.query.code;
	var user = JSON.parse(decodeURIComponent(req.query.state));
	var username = user.username;
	//console.log('code',code);
	console.log('\n##### get /adsense/oauth2callback for username',username);

	var oauth2Client = new OAuth2(
		process.env.AUTH_GOOGLE_CLIENT_ID,
		process.env.AUTH_GOOGLE_CLIENT_SECRET,
		process.env.AUTH_GOOGLE_REDIRECT_URL);

	oauth2Client.getToken(code,function(err,tokensOAuth){
		console.log('tokensOAuth',tokensOAuth);
		if (!err){
			oauth2Client.setCredentials(tokensOAuth);

			User.findByUsername(username,function(err,user){
				if (err){
					console.log('err',err);
					return;
				}
			
				Token.find({user_id: user._id}, function(err,tokensDB){
					if (err){
						console.log('err',err);
					} else {
						console.log('tokensDB',tokensDB);
						if (tokensDB.length === 0) {
							// create a new token
							// BE CAREFUL WITH THE REFRESH TOKEN. IT IS ONLY SET ON THE FIRST CONNECTION. 
							// AFTERWARDS NO REFRESH TOKEN, YOU NEED TO REVOKE THE ACCESS FROM THE GOOGLE ADMIN PANEL
							console.log('No token retrieved from DB. We create a new one');						
							var token = new Token ({
								user_id : user._id,
								accessToken : tokensOAuth.access_token,
								refreshToken : tokensOAuth.refresh_token
							});
							token.save(function (err, savedToken) {
	    						if (err) { 
	    							console.log('err',err); 
	    						} else {
	    							console.log('New token saved');
	    						}
	    						
	  						});
						} else {
							// update the token
							console.log('Token retrieved from DB. We will update it.');
							Token.findOneAndUpdate(
								{user_id: user._id}, 
								(tokensOAuth.refresh_token  ?  
									{accessToken:  tokensOAuth.access_token, refreshToken : tokensOAuth.refresh_token}: 
									{accessToken:  tokensOAuth.access_token}), {new:true}, function(err,token){
							    	if (err){
							    		console.log('error while updating tokens',err);
							    	} else {
							    		console.log('updated token saved in DB',token);
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
	console.log('\n##### get /adsense/earnings');	
	console.log('username',req.params.username);
	var username = req.params.username;

	User.findByUsername(username,function(err,user){
		if (err){
			console.log('Error while retrieving user',err);
			callback(err,null);
		} else {
			console.log('user',user);
			var yesterday = moment().subtract(1,'days'); 
			getEarnings(user._id,username,yesterday,function(err,result){
				if (err){
					console.log("Returned from getAdsenseEarnings with ERROR");
					res.send("Returned from getAdsenseEarnings with ERROR");
				} else {
					console.log("FINAL  RESULT",result);
					res.send("<p>FINAL RESULT</p>" + JSON.stringify(result));
				}
			});
		}
	});	
});

var getMonthEarnings = function(user_id,username,day,after){
	console.log("######### getMonthEarnings BEGIN");
	var monthNumber = day.month() + 1;
	//console.log("Month [%s] with number [%s]",day.format('MMMM'),monthNumber);
	Income.Adsense.aggregate([
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
				
			console.log("Success with getMonthEearnings. Result: ",result);
			after(null,result[0].total);
		}
	);
	//console.log("######### getMonthEarnings END");
};



var getEarnings = function (user_id,username,day,after){

	var adsense;
	var accountId;
	

	var googleApiDay = day.format('YYYY-MM-DD');
	console.log('googleApiDay',googleApiDay);
	//var dbDay = new Date(day);
	//console.log('dbDay',dbDay);

	async.waterfall([
		

		function retrieveTokens(callback){
			console.log('##### [%s] Preparing tokens for user_id :',username,user_id);
			Token.findOne({user_id: user_id}, function(err,tokenObject){
				if (err){
					console.log('[%s] No token found',username);
					after(err, null);
				} else {
					console.log('[%s] token: ',username, tokenObject);

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
	
		function retrieveAccountId(callback){
			console.log('[%s] ##### Before Calling list',username);
			adsense.accounts.list({maxResults:10},function(err,result){
				if (err){
					console.log('[%s] Error while retrieving accounts',username, err);
					after(err, null);
				} else {
					//console.log('Accounts',result);
					//console.log('My account',result.items[0]);
					accountId = result.items[0].id;
					console.log('[%s] AccountId retrieved: ',username,accountId);

					callback(null,accountId);
				}
			});
		},

		function retrieveEarnings(accountId,callback){

			console.log('[%s] ##### Before calling generate',username);

			var params  = {
				startDate : googleApiDay,
				endDate : googleApiDay,
				accountId: accountId, 
				useTimezoneReporting : true,
				dimension: 'DATE',
				metric: 'EARNINGS'
			};   

			//console.log('[%s] oauth2Client',username,oauth2Client);
			adsense.accounts.reports.generate(params,function(err,result){
				if (err){
					console.log('[%s] Error while getting earnings',username,err);
					after(err, null);
				} else {
					console.log('[%s] Successfull',username);
					//console.log('result',result);
					callback(null, result);
				}
			});
		}, 

		function saveInDb(result,callback){
			var adsenseIncome = new Income.Adsense ( { user_id: user_id, date: googleApiDay, income : result.totals[1]});
			adsenseIncome.save(function(err){
				if (err){
					console.log('[%s] Error while saving adsense earnings into DB',username,err);
					callback(null,result);
				} else {
					console.log('[%s] Adsense earnings successfully saved in DB',username);
					callback(null,result);
				}
			});
		}
	], function(err,result){
		if (err){
			console.log('[%s] final function err',username,err);
			after('error',null);
		} else {
			console.log('[%s] final result',username,result);
			after(null,result);
		}
	});
};

module.exports = {router, getEarnings, getMonthEarnings};