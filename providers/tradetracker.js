var express = require('express');

var router = express.Router();

var soap = require ('soap');
var Cookie = require ('soap-cookie');

var moment = require ('moment');

var User = require('../models/user');
var Auth = require('../models/tradetrackerauth');


const SOAP_URL = 'https://ws.tradetracker.com/soap/affiliate?wsdl';


// should only be called when the user tries to connect for the first time
router.get('/earnings/:username',function(req,res){
	console.log('\n##### get /tradetracker/earnings');
	console.log('username',req.params.username);
	var username = req.params.username;

	User.findByUsername(username,function(err,user){
		if (err){
			console.log('Error while retrieving user',err);
			res.send('Error while retrieving user',err);
		} else {
			console.log('user',user);
			
			Auth.findOne({user_id:user._id},function(err,credentials){
				if (err){
					console.log('err while getting Tradetracker credentials',err);
					return;
				} 
				console.log('tradetracker credentials',credentials);
				if (credentials.length === 0){
					// no credentials, this user is not connected to Tradetracker
					console.log('user %s has no credentials for Tradetracker, returning',user.username);
					return;
				}
							 
			  	var args = {
			  		customerID : credentials.customerID, //'117819',
			  		passphrase : credentials.passphrase, //'d5e28dcff286edb8a9ae135b1df7e07db4c85f87',
			  		sandbox: false,
			  		locale: 'fr_FR',
			  		demo: false
			  	};

			  	soap.createClient(SOAP_URL, function(err, client) {
			      	client.authenticate(args, function(err, result, raw, soapHeader) {
			          	if (err) {
			          		console.log('Error while authenticating',err);
			          		return;
			          	} 


			          	//console.log('Tradetracker authenticate result',result);
			          	//console.log('Authenticate Client request',client.lastRequest);
			          	//console.log('Authenticate Client response headers',client.lastResponseHeaders);

			          	client.setSecurity(new Cookie(client.lastResponseHeaders));


			          	
			          	//var wsSecurity = new soap.BasicAuthSecurity('117819', 'd5e28dcff286edb8a9ae135b1df7e07db4c85f87');
			  			//client.setSecurity(wsSecurity);

			          	
			          	//console.log('Tradetracker authenticate raw',raw);
			          	//console.log('Tradetracker authenticate soapHeader',soapHeader);
			          	//console.log('Client describe',client.describe());


			          	
			          	var argsAS = {
			          		options: {}
			          	};

			          	client.getAffiliateSites(argsAS ,function(err,result){
			          		if (err){
			          			console.log('Error while getting affiliate sites',err);
			          			res.send(err);
			          			return;
			          		}


			          		console.log('AffiliateSites raw result',result);
			          		console.log('affiliatesites',result.affiliateSites);
			          		console.log('affiliatesites name',result.affiliateSites.item.name.$value);
			          		//console.log('AffiliateSites ok',affiliatesites.item);
			          	

				          	var yesterday = moment().subtract(1,'days'); 
							var tradetrackerApiDay = yesterday.format('YYYY-MM-DD');

				          	var argsRAS = {
				          	 	affiliateSiteID : 214395,
				          	 	options : {
									 dateFrom: tradetrackerApiDay,
									 dateTo: tradetrackerApiDay
				          		}
				          	};

				          	client.getReportAffiliateSite(argsRAS,function(err,report){
				          		if (err){
				          			//console.log('Error while getting conversion transactions',err);
				          			res.send(err);
				          			return;
				          		}

				          		var earnings = report.reportAffiliateSite.totalCommission.$value;
				          		console.log('Earned : ',earnings);
								//console.log('get Report Affiliate Site Client request',client.lastRequest);
								//console.log('get Report Affiliate Site Client response headers',client.lastResponseHeaders);

				          		res.setHeader('Content-Type', 'application/json');
				          		res.send(JSON.stringify(report,null,4));


				          	});
				        });
			      	});
			  	});	

				
			});

			
		}
	});
});

var getEarnings = function (user_id,username,day,after){

	

	var tradetrackerApiDay = day.format('YYYY-MM-DD');
	
	/**
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
		}, function saveInDb(result,callback){
			var adsenseIncome = new Income.Adsense ( { user_id: user_id, date: googleApiDay, income : result.totals[1]});
			adsenseIncome.save(function(err){
				if (err){
					console.log('[%s] Error while saving adsense earnings into DB',username,err);
					callback(null,result);
				} else {
					console.log('[%s] Successfully saved in DB',username);
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
	**/
};


module.exports = {router ,getEarnings};