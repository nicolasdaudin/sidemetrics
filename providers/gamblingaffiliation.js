var express = require('express');

var router = express.Router();

var async = require ('async');

var moment = require ('moment');
var request = require("request");

var User = require('../models/user');
var Income = require('../models/income');
var Credentials = require('../models/credentials');



//var Auth = require('../models/tradetrackerauth');




// should only be called when the user tries to connect for the first time
router.get('/earnings/:username',function(req,res){
	console.log('\n##### [%s] get /gamblingaffiliation/earnings',req.params.username);
	var username = req.params.username;

	User.findByUsername(username,function(err,user){
		if (err){
			console.log('Error while retrieving user',err);
			res.send('Error while retrieving user',err);
		} else {
			//console.log('user',user);
			var yesterday = moment().subtract(1,'days'); 
			getEarnings(user._id,username,yesterday,function(err,result){
				if (err){
					console.log("Returned from getEarnings (Gambling Affiliation) with ERROR");
					res.send("Returned from getEarnings (Gambling Affiliation) with ERROR");
				} else {
					//console.log("FINAL  RESULT",result);
					res.send("<p>FINAL RESULT CALCULATING.... </p>");
				}
			});
		}
	});
});

var getEarnings = function(user_id,username,day,after){

	console.log("############### [%s] BEGIN GAMBLING AFFILIATION GET EARNINGS",username);

	var gamblingAffiliationApiDay = day.format('YYYY-MM-DD');

	async.waterfall([

		function findCredentials(callback){
			console.log('[%s] findCredentials',username);
			Credentials.GamblingAffiliation.findOne({user_id:user_id},function(err,credentials){
				if (err){
					console.log('err while getting Gambling Affiliation credentials',err);
					callback(err,null);
				} else if (!credentials || (credentials.length === 0)){
					// no credentials, this user is not connected to Gambling Affiliation
					console.log('user %s has no credentials for Gambling Affiliation, returning',username);
					callback('no credentials',null);
				} else {
					callback(null,credentials,process.env.PHANTOM_BUSTER_API_KEY);
				}	
			});
			//var credentials = { affiliate_id: '22307',api_key: 'RtZT2eY9eKYNbA8KVaqh5A'};
			//callback(null,credentials);
		},

		function retrieveGamblingAffiliationEarnings(credentials,header,callback){
			
			var totalEarnings = 0;

			var user = credentials.username;
			var password = credentials.password;
			console.log('[%s] Gambling Affiliation credentials:',user,credentials);
			
			//var email = 'jimena@123dinero.com';
			//var password = 'DBSgrds3d';
			
			var options = { method: 'POST',
			  	url: 'https://phantombuster.com/api/v1/agent/5491/launch',
			  	headers: {
					'X-Phantombuster-Key-1': header
				},
			  	qs: { 
			   		output: 'first-result-object',
			     	argument: '{ "username" : "' + user + '","password" : "' + password + '" }'
			    }
			};

			console.log('[%s] Gambling Affiliation : fetching results with Phantom Buster ........',username);

			request(options, function (err, response, body) {
				//console.log('[%s] Back from PhantomBuster call for Moolineo. Variable -body- is ',username,body);				

			  	if (err) {
			  		console.log('[%s] Error while retrieving Gambling Affiliation stuff',error);
			  		callback(err,null);		  		
			  	} 

			  	if (!body) {
			  		console.log('[%s] Error while retrieving Gambling Affiliation , body response is empty');
			  		callback('empty body',null);
			  	}

			  	var result = JSON.parse(body);
	
			  	var totalEarnings = result.data.resultObject.gamblingEarningsYesterday;
			  	console.log('[%s] Gambling Affiliation - Total earnings : ',username,totalEarnings);
			  	//var totalEarningsEUR = fx.convert(totalEarningsUSD,{ from:"USD", to: "EUR"});
				//console.log('[%s] Gambling Affiliation - Total earnings in EUR: ',username,totalEarningsEUR);
			  	callback(null,totalEarnings.toFixed(2));	
			});	
		},

		function saveInDb(result,callback){
			//console.log('async retrieveEarnings');
			var gamblingAffiliationIncome = new Income.GamblingAffiliation( { user_id: user_id, date: gamblingAffiliationApiDay, income : result});
			gamblingAffiliationIncome.save(function(err){
			if (err){
					console.log('[%s] Error while saving Gambling Affiliation earnings into DB',username,err.errmsg);
					callback(null,result);
				} else {
					//console.log('[%s] Gambling Affiliation earnings successfully saved in DB',username);
					callback(null,result);
				}
			});
		}

	], function(err,result){
		if (err){
			console.log('[%s] async final function err',username,err);
			after('error',null);
		} else {
			// to add at the end of async.waterfall return funciton
			//console.log('[%s] async final result',username,result);
			after(null,result);
		}
	});
};

var getMonthEarnings = function(user_id,username,day,after){
	console.log("[%s] #### getMonthEarnings for Gambling Affiliation",username);
	var monthNumber = day.month() + 1;
	//console.log("Month [%s] with number [%s]",day.format('MMMM'),monthNumber);
	Income.GamblingAffiliation.aggregate([
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
				
			//console.log("Success with getMonthEearnings DGMAX. Result: ",result);
			after(null,result[0].total);
		}
	);
	//console.log("######### getMonthEarnings END");
};

module.exports = {router ,getEarnings, getMonthEarnings};