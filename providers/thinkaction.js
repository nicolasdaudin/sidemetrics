var express = require('express');

var router = express.Router();

var soap = require ('soap');
var Cookie = require ('soap-cookie');
var async = require ('async');


var moment = require ('moment');

var User = require('../models/user');
var Income = require('../models/income');
var Credentials = require('../models/credentials');

//var Auth = require('../models/tradetrackerauth');


const SOAP_URL = 'https://login.thinkaction.com/affiliates/api/2/reports.asmx?WSDL';


// should only be called when the user tries to connect for the first time
router.get('/earnings/:username',function(req,res){
	console.log('\n##### [%s] get /thinkaction/earnings',req.params.username);
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
					console.log("Returned from getEarnings (ThinkAction) with ERROR");
					res.send("Returned from getEarnings (ThinkAction) with ERROR");
				} else {
					//console.log("FINAL  RESULT",result);
					res.send("<p>FINAL RESULT CALCULATING.... </p>");
				}
			});
		}
	});
});

var getEarnings = function(user_id,username,day,after){

	console.log("############### [%s] BEGIN THINKACTION GET EARNINGS",username);

	var thinkactionBeginDay = day.startOf('day').format('YYYY-MM-DDTHH:mm:ss');
	var thinkactionEndDay = day.endOf('day').format('YYYY-MM-DDTHH:mm:ss');
	var thinkactionInternalDay = day.format('YYYY-MM-DD');

	console.log("[%s] thinkActionday begin [%s] end [%s]",username,thinkactionBeginDay,thinkactionEndDay);

	async.waterfall([

		function findCredentials(callback){
			console.log('[%s] findCredentials',username);
			Credentials.Thinkaction.findOne({user_id:user_id},function(err,credentials){
				if (err){
					console.log('err while getting Thinkaction credentials',err);
					callback(err,null);
				} else if (!credentials || (credentials.length === 0)){
					// no credentials, this user is not connected to Thinkaction
					console.log('user %s has no credentials for Thinkaction, returning',username);
					callback('no credentials',null);
				} else {
					callback(null,credentials);
				}	
			});
		},

		function retrieveThinkactionEarnings(credentials,callback){
			
			var args = {
		  		affiliate_id : credentials.affiliate_id, //'117819',
		  		api_key : credentials.api_key, //'d5e28dcff286edb8a9ae135b1df7e07db4c85f87',
		  		start_date : thinkactionBeginDay,
		  		end_date : thinkactionEndDay,
		  		offer_id : 0
		  	};
		  	//console.log('[%s] SOAP_URL just before createSoapClient : ', username,SOAP_URL);
		  	soap.createClient(SOAP_URL, function createSoapClient(err, client) {
		  		if (err) {
		  			console.log('[%s] Error while createSoapClient : ',username,err);
		  			callback(err,null);
		  		}
		  		console.log('[%s] createSoapClient - about to call DailySummary with these args : ',username,args);
		      	client.DailySummary(args, function getDailySummary(err, result, raw, soapHeader) {
					if (err) {
		          		console.log('[%s] getDailySummary ERROR :',username,err.message);
		          		callback(err,null);
		          	} else {
		          		//console.log("[%s] getDailySummary result : ",username,JSON.stringify(result));
						totalEarnings = result.DailySummaryResult.days.day[0].revenue;
						console.log('[%s] Thinkaction - Total earnings : ',username,totalEarnings);
						callback(null,totalEarnings);						
		          	}
		         });
		    }); 	
		},

		function saveInDb(result,callback){
			//console.log('async retrieveEarnings');
			var thinkactionIncome = new Income.Thinkaction( { user_id: user_id, date: thinkactionInternalDay, income : result});
			thinkactionIncome.save(function(err){
			if (err){
					console.log('[%s] Error while saving thinkaction earnings into DB',username,err.errmsg);
					callback(null,result);
				} else {
					//console.log('[%s] Thinkaction earnings successfully saved in DB',username);
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
	console.log("[%s] #### getMonthEarnings for Thinkaction",username);
	var monthNumber = day.month() + 1;
	//console.log("Month [%s] with number [%s]",day.format('MMMM'),monthNumber);
	Income.Thinkaction.aggregate([
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
				
			//console.log("Success with getMonthEearnings THINKACTION. Result: ",result);
			after(null,result[0].total);
		}
	);
	//console.log("######### getMonthEarnings END");
};

module.exports = {router ,getEarnings, getMonthEarnings};