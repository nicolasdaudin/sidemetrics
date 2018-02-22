var express = require('express');

var router = express.Router();

var async = require ('async');

var fx = require('money');
fx.base = "EUR";
fx.rates = {
	"USD" : 1.17933, // 1 EUR === 1.17933 USD on 18 december 2017
	"EUR" : 1        // always include the base rate (1:1)
};

var moment = require ('moment');
var request = require("request");

var User = require('../models/user');
var Income = require('../models/income');
var Credentials = require('../models/credentials');



//var Auth = require('../models/tradetrackerauth');




// should only be called when the user tries to connect for the first time
router.get('/earnings/:username',function(req,res){
	console.log('\n##### [%s] get /dgmax/earnings',req.params.username);
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
					console.log("Returned from getEarnings (DGMAX) with ERROR");
					res.send("Returned from getEarnings (DGMAX) with ERROR");
				} else {
					//console.log("FINAL  RESULT",result);
					res.send("<p>FINAL RESULT CALCULATING.... </p>");
				}
			});
		}
	});
});

var getEarnings = function(user_id,username,day,after){

	console.log("############### [%s] BEGIN DGMAX GET EARNINGS",username);

	var dgmaxApiDay = day.format('YYYY-MM-DD');

	async.waterfall([

		function findCredentials(callback){
			console.log('[%s] findCredentials',username);
			Credentials.Dgmax.findOne({user_id:user_id},function(err,credentials){
				if (err){
					console.log('err while getting Dgmax credentials',err);
					callback(err,null);
				} else if (!credentials || (credentials.length === 0)){
					// no credentials, this user is not connected to Dgmax
					console.log('user %s has no credentials for Dgmax, returning',username);
					callback('no credentials',null);
				} else {
					callback(null,credentials,process.env.PHANTOM_BUSTER_API_KEY);
				}	
			});
			//var credentials = { affiliate_id: '22307',api_key: 'RtZT2eY9eKYNbA8KVaqh5A'};
			//callback(null,credentials);
		},

		function retrieveDgmaxEarnings(credentials,header,callback){
			
			var totalEarnings = 0;

			var email = credentials.email;
			var password = credentials.password;
			console.log('[%s] Dgmax credentials:',username,credentials);
			
			//var email = 'jimena@123dinero.com';
			//var password = 'DBSgrds3d';
			
			var options = { method: 'POST',
			  	url: 'https://phantombuster.com/api/v1/agent/5310/launch',
			  	headers: {
					'X-Phantombuster-Key-1': header
				},
			  	qs: { 
			   		output: 'first-result-object',
			     	argument: '{ "email" : "' + email + '","password" : "' + password + '" }'
			    }
			};

			console.log('[%s] Dgmax : fetching results with Phantom Buster ........',username);

			request(options, function (err, response, body) {
				//console.log('[%s] Back from PhantomBuster call for Moolineo. Variable -body- is ',username,body);				

			  	if (err) {
			  		console.log('[%s] Error while retrieving Dgmax stuff',error);
			  		callback(err,null);		  		
			  	} 

			  	if (!body) {
			  		console.log('[%s] Error while retrieving Dgmax, body response is empty');
			  		callback('empty body',null);
			  	}

			  	var result = JSON.parse(body);
	
			  	var totalEarningsUSD = result.data.resultObject.dgmaxEarningsYesterday;
			  	console.log('[%s] Dgmax - Total earnings in USD: ',username,totalEarningsUSD);
			  	var totalEarningsEUR = fx.convert(totalEarningsUSD,{ from:"USD", to: "EUR"});
				console.log('[%s] Dgmax - Total earnings in EUR: ',username,totalEarningsEUR);
			  	callback(null,totalEarningsEUR.toFixed(2));	
			});	
		},

		function saveInDb(result,callback){
			console.log('##### [%s] saveDgmaxInDb',username);
			//var dgmaxIncome = new Income.Dgmax( { user_id: user_id, date: dgmaxApiDay, income : result});
			Income.Dgmax.findOneAndUpdate({ user_id: user_id, date: dgmaxApiDay},{ income : result},{upsert:true},function(err){
				if (err){
					console.log('[%s] Error while saving Dgmax earnings (%s,%s) into DB. Error : ',username,dgmaxApiDay,result,err.errmsg);
					callback(null,result);
				} else {
					console.log('[%s] Saved Dgmax earnings in DB:',username,dgmaxApiDay,result);
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
	console.log("[%s] #### getMonthEarnings for Dgmax",username);
	var monthNumber = day.month() + 1;
	//console.log("Month [%s] with number [%s]",day.format('MMMM'),monthNumber);
	Income.Dgmax.aggregate([
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