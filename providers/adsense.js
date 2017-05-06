var express = require('express');

var google = require('googleapis');
var async = require ('async');
var Token = require('../models/token');
var User = require('../models/user');
var moment = require ('moment');

var ObjectId = require('mongoose').Types.ObjectId; 

/** GOOGLE OAUTH 2 INIT **/
var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(
		process.env.AUTH_GOOGLE_CLIENT_ID,
		process.env.AUTH_GOOGLE_CLIENT_SECRET,
		process.env.AUTH_GOOGLE_REDIRECT_URL);

var router = express.Router();

// should only be called when the user tries to connect for the first time
router.get('/connect',function(req,res){
	console.log('\n##### get /adsense/connect');
	
	/*var OAuth2 = google.auth.OAuth2;

	oauth2Client = new OAuth2(
		config.auth.google.client_id,
		config.auth.google.client_secret,
		config.auth.google.redirect_url);
		*/

	var scopes = ['https://www.googleapis.com/auth/adsense'];

	var url = oauth2Client.generateAuthUrl({
		access_type : 'offline',
		scope: scopes
	});



	console.log('auth url',url);

	res.redirect(url);
});

// should only be called when the user tries to connect for the first time (after the oauth on Google side)
router.get('/oauth2callback',function(req,res){
	console.log('\n##### get /adsense/oauth2callback');

	var code = req.query.code;
	//console.log('code',code);

	oauth2Client.getToken(code,function(err,tokensOAuth){
		console.log('tokensOAuth',tokensOAuth);
		if (!err){
			oauth2Client.setCredentials(tokensOAuth);

			User.findByUsername("nicdo77",function(err,user){
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

	

	res.send("<p>authenticated in Adsense</p><a href='/adsense/earnings/'>get adsense earnings</a>");
});

// to be called once authentified. 
// can be called directly if we already have a refresh token (for example from the cron or someting...)
router.get('/earnings',function(req,res){
	console.log('\n##### get /adsense/earnings');	

	User.findByUsername("nicdo77",function(err,user){
		if (err){
			console.log('Error while retrieving user',err);
			callback(err,null);
		} else {
			console.log('user',user);
			var yesterday = moment().subtract(1,'days'); 
			getEarnings(user._id,yesterday,function(err,result){
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

var getEarnings = function (user_id,day,after){

	var adsense;
	var accountId;

	var googleApiDay = day.format('YYYY-MM-DD');
	

	async.waterfall([
		

		function retrieveTokens(callback){
			console.log('##### Preparing tokens for user_id',user_id);
			Token.findOne({user_id: user_id}, function(err,tokenObject){
				if (err){
					console.log('No token found');
					after(err, null);
				} else {
					console.log('token',tokenObject);

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
			console.log('##### Before Calling list');
			adsense.accounts.list({maxResults:10},function(err,result){
				if (err){
					console.log('Error while retrieving accounts',err);
					after(err, null);
				} else {
					//console.log('Accounts',result);
					//console.log('My account',result.items[0]);
					accountId = result.items[0].id;
					callback(null,accountId);
				}
			});
		},
		function retrieveEarnings(accountId,callback){

			console.log('##### Before calling generate');

			var params  = {
				startDate : googleApiDay,
				endDate : googleApiDay,
				accountId: accountId, 
				useTimezoneReporting : true,
				dimension: 'DATE',
				metric: 'EARNINGS'
			};   

			adsense.accounts.reports.generate(params,function(err,result){
				if (err){
					console.log('Error',err);
					after(err, null);
				} else {
					console.log('Successfull');
					//console.log('result',result);
					callback(null, result);
				}
			});
		}
	], function(err,result){
		if (err){
			console.log('final function err',err);
			after('error',null);
		} else {
			console.log('final result',result);
			after(null,result);
		}
	});
};

module.exports = {router, getEarnings};