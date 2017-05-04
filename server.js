var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var google = require('googleapis');

//var config = require('./config');
var async = require ('async');

var mongoose = require('mongoose');
var Token = require('./models/token');


var moment = require ('moment');

var database_url = process.env.DATABASE_URL;

mongoose.connect(database_url);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	// Node app started, only if and when successfully connected to DB 
	console.log('DB Connected');
	app.listen(app.get('port'), function () {
	  console.log('Example app listening on port ' + app.get('port'));
	});
});


var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(
		process.env.AUTH_GOOGLE_CLIENT_ID,
		process.env.AUTH_GOOGLE_CLIENT_SECRET,
		process.env.AUTH_GOOGLE_REDIRECT_URL);

console.log('oauth2Client',oauth2Client);
console.log('process.env',process.env);

app.set('port', process.env.PORT || 3000);

app.use(express.static('static'));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing 



app.get('/', function (req, res) {
  res.send('Hello World from SideMetrics');
});

// should only be called when the user tries to connect for the first time
app.get('/adsense/connect',function(req,res){
	console.log('\n##### get /adsense');
	
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
app.get('/adsense/oauth2callback',function(req,res){
	console.log('\n##### get /oauth2callback');

	var code = req.query.code;
	//console.log('code',code);

	oauth2Client.getToken(code,function(err,tokensOAuth){
		console.log('tokensOAuth',tokensOAuth);
		if (!err){
			oauth2Client.setCredentials(tokensOAuth);
			
			Token.find({user_id: 'nicdo77'}, function(err,tokensDB){
				if (err){
					console.log('err',err);
				} else {
					console.log('tokensDB',tokensDB);
					if (tokensDB.length === 0) {
						// create a new token
						console.log('No token retrieved from DB. We create a new one');						
						var token = new Token ({
							user_id : 'nicdo77',
							access_token : tokensOAuth.access_token,
							refresh_token : tokensOAuth.refresh_token
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
							{user_id:'nicdo77'}, 
							(tokensOAuth.refresh_token  ?  
								{access_token:  tokensOAuth.access_token, refresh_token : tokensOAuth.refresh_token}: 
								{access_token:  tokensOAuth.access_token}), {new:true}, function(err,token){
						    	if (err){
						    		console.log('error while updating tokens',err);
						    	} else {
						    		console.log('updated token saved in DB',token);
						    	}
						    });
					}
				}
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
app.get('/adsense/earnings',function(req,res){
	console.log('\n##### get /adsense/earnings');

	var adsense;
	var accountId;

	async.waterfall([

		function retrieveTokens(callback){
			console.log('##### Preparing tokens');
			Token.findOne({user_id:'nicdo77'}, function(err,tokenObject){
				if (err){
					console.log('No token found');
					callback(err);
				} else {
					console.log('token',tokenObject);

					oauth2Client.setCredentials({
						access_token : tokenObject.access_token,
						refresh_token : tokenObject.refresh_token,
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

	
		function first(callback){
			console.log('##### Before Calling list');
			adsense.accounts.list({maxResults:10},function(err,result){
				if (err){
					console.log('Error while retrieving accounts',err);
					callback(err, null);
				} else {
					//console.log('Accounts',result);
					//console.log('My account',result.items[0]);
					accountId = result.items[0].id;
					callback(null,accountId);
				}
			});
		},
		function second(accountId,callback){

			console.log('##### Before calling generate');

			var yesterday = moment().subtract(1,'days');
			var formattedYesterday = yesterday.format('YYYY-MM-DD');
			


			var params  = {
				startDate : formattedYesterday,
				endDate : formattedYesterday,
				accountId: accountId, 
				useTimezoneReporting : true,
				dimension: 'DATE',
				metric: 'EARNINGS'
			};   

			adsense.accounts.reports.generate(params,function(err,result){
				if (err){
					console.log('Error',err);
					callback(err, null);
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
			res.send('error');
		} else {
			console.log('final result',result);
			res.send("<p>Google earnings</p>" + JSON.stringify(result));
		}
	});
	/*
	adsense.accounts.list({maxResults:10},function(err,result){
		if (err){
			console.log('Error while retrieving accounts',err);
		} else {
			console.log('Accounts',result);
			console.log('My account',result.items[0]);
			accountId = result.items[0].id;
		}
	});

	

	console.log('Before calling generate');
	adsense.accounts.reports.generate(params,function(err,result){
		if (err){
			console.log('Error',err);
		} else {
			console.log('Successfull');
			console.log('result',result);
		}
	});*/

});

/*app.listen(app.get('port'), function () {
	console.log('Example app listening on port ' + app.get('port'));
});*/



/*
MongoClient.connect(url,function(err,mydb){
	assert.equal(null,err);
	db = mydb;
	console.log('DB Connected');
	app.listen(app.get('port'), function () {
	  console.log('Example app listening on port ' + app.get('port'));
	});
});*/

module.exports = app;