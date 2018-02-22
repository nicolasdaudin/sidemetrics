var express = require('express');

var router = express.Router();

var async = require('async');

var moment = require('moment');
var request = require("request");

var User = require('../models/user');
var Income = require('../models/income');
var Credentials = require('../models/credentials');


// should only be called when the user tries to connect for the first time
router.get('/earnings/:username', function (req, res) {
	console.log('\n##### get /moolineo/earnings for username %s',req.params.username);
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
					console.log("Returned from getEarnings (Moolineo) with ERROR");
					res.send("Returned from getEarnings (Moolineo) with ERROR");
				} else {
					//console.log("FINAL  RESULT",result);
					res.send("<p>FINAL RESULT CALCULATING.... </p>");
				}
			});
		}
	});
});

var getEarnings = function(user_id,username,day,after){

	console.log("############### [%s] BEGIN Moolineo GET EARNINGS",username);

	// curl https://phantombuster.com/api/v1/agent/1236/launch --data 'output=first-result-object' --header 'X-Phantombuster-Key-1: nVA5dTzZHsNxvSTWQOGaiV40DjF7ZHXg'
	var moolineoApiDay = day.format('YYYY-MM-DD');
	
	async.waterfall([

		function retrieveMoolineoUrl(callback){
			// Fake function, at the moment we force the moolineo url
			console.log('##### [%s] retrieveMoolineoUrl',username);
			//var moolineo_url = 'http://www.moolineo.com/Backoffice/stats_editeur.php?ide=102&mdp=7656';			

			Credentials.Moolineo.findOne({user_id:user_id},function(err,credentials){
				if (err){
					console.log('err while getting Moolineo URL',err);
					callback(err,null);
				} else if (!credentials || (credentials.length === 0)){
					// no credentials, this user is not connected to Moolineo
					console.log('user %s has no credentials for Moolineo, returning',username);
					callback('no credentials',null);
				} else {
					//console.log('after if credentials');
					callback(null,credentials,process.env.PHANTOM_BUSTER_API_KEY);
				}
			});
		},


		function retrieveMoolineoEarnings(credentials,header,callback){
			var url = credentials.access_url;
			console.log('##### [%s] retrieveMoolineoEarnings (URL is %s)',username,url);
			
			var totalEarnings = 0;      	
      	
				

			var options = { method: 'POST',
			  	url: 'https://phantombuster.com/api/v1/agent/1236/launch',
			  	headers: {
					'X-Phantombuster-Key-1': header
				},
			  	qs: { 
			   		output: 'first-result-object',
			     	//argument: '{ \t"url" : "http://www.moolineo.com/Backoffice/stats_editeur.php?ide=102&mdp=7656" }' } };
			     	argument: '{ "url" : "' + url + '" }'
			    }
			};

			console.log('[%s] Moolineo : fetching results with Phantom Buster ........',username);

			request(options, function (err, response, body) {
				//console.log('[%s] Back from PhantomBuster call for Moolineo. Variable -body- is ',username,body);				

			  	if (err) {
			  		console.log('[%s] Error while retrieving Moolineo stuff',error);
			  		callback(err,null);		  		
			  	} 

			  	if (!body) {
			  		console.log('[%s] Error while retrieving Moolineo, body response is empty');
			  		callback('empty body',null);
			  	}

			  	var result = JSON.parse(body);
	
			  	totalEarnings = result.data.resultObject.moolineoEarningsYesterday;
			  	console.log('[%s] Earned with Moolineo',username,totalEarnings);
			  	callback(null,totalEarnings);
			});
		}, 

		function saveMoolineoInDb(result,callback){
			console.log('##### [%s] saveMoolineoInDb',username);
			//MoolineoIncome = new Income.Moolineo( { user_id: user_id, date: moolineoApiDay, income : result});
			Income.Moolineo.findOneAndUpdate({ user_id: user_id, date: moolineoApiDay},{income : result},{upsert:true},function(err){
			if (err){
					console.log('[%s] Error while saving Moolineo earnings (%s,%s) into DB. Error : ',username,moolineoApiDay,result,err.errmsg);
					callback(null,result);
				} else {
					console.log('[%s] Saved Moolineo earnings in DB',username,moolineoApiDay,result);
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
	console.log("[%s] #### getMonthEarnings for Moolineo",username);
	var monthNumber = day.month() + 1;
	//console.log("Month [%s] with number [%s]",day.format('MMMM'),monthNumber);
	Income.Moolineo.aggregate([
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
			//console.log("Success with getMonthEearnings Moolineo. Result: ",result);
			after(null,result[0].total);
		}
	);
	//console.log("######### getMonthEarnings END");
};

module.exports = {router ,getEarnings, getMonthEarnings};