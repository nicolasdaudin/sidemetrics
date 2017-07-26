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


const SOAP_URL = 'https://ws.tradetracker.com/soap/affiliate?wsdl';


// should only be called when the user tries to connect for the first time
router.get('/earnings/:username',function(req,res){
	console.log('\n##### [%s] get /tradetracker/earnings',req.params.username);
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
					console.log("Returned from getEarnings (Tradetracker) with ERROR");
					res.send("Returned from getEarnings (Tradetracker) with ERROR");
				} else {
					//console.log("FINAL  RESULT",result);
					res.send("<p>FINAL RESULT CALCULATING.... </p>");
				}
			});
		}
	});
});

var getEarnings = function(user_id,username,day,after){

	console.log("############### [%s] BEGIN TRADETRACKER GET EARNINGS",username);

	var tradetrackerApiDay = day.format('YYYY-MM-DD');

	async.waterfall([

		function findCredentials(callback){
			//console.log('[%s] async findCredentials',username);
			Credentials.Tradetracker.findOne({user_id:user_id},function(err,credentials){
				if (err){
					console.log('err while getting Tradetracker credentials',err);
					callback(err,null);
				} else if (!credentials || (credentials.length === 0)){
					// no credentials, this user is not connected to Tradetracker
					console.log('user %s has no credentials for Tradetracker, returning',username);
					callback('no credentials',null);
				} else {
					//console.log('after if credentials');
					callback(null,credentials);
				}	
			});
		},

		function authenticate(credentials,callback){
			//console.log('[%s] async authenticate',username);
			var args = {
		  		customerID : credentials.customerID, //'117819',
		  		passphrase : credentials.passphrase, //'d5e28dcff286edb8a9ae135b1df7e07db4c85f87',
		  		sandbox: false,
		  		locale: 'fr_FR',
		  		demo: false
		  	};
		  	soap.createClient(SOAP_URL, function createSoapClient(err, client) {
		  		//console.log('[%s] createSoapClient',username);
		      	client.authenticate(args, function authenticate(err, result, raw, soapHeader) {
		      		//console.log('back from authenticate');
		          	if (err) {
		          		console.log('[%s] ERROR while authenticating:',username);
		          		callback(err,null);
		          	} 

		          	client.setSecurity(new Cookie(client.lastResponseHeaders));

		          	callback(null,client);
		         });
		    }); 	
		},

		function getAffiliateSites(client,callback){
			//console.log('[%s] async getAffiliateSites',username);

			var argsAS = {
          		options: {}
          	};

          	client.getAffiliateSites(argsAS ,function retrieveAffiliateSites(err,result){
          		if (err){
          			console.log('Error while getting affiliate sites',err);
          			res.send(err);
          			return;
          		}


          		var affiliateSiteIds = [];
          		if (Array.isArray(result.affiliateSites.item)){
          			// several affiliate site ids
          			//console.log('affiliatesites item is an array');

          			// according to this article https://coderwall.com/p/kvzbpa/don-t-use-array-foreach-use-for-instead
          			// this basic 'for' is much faster than Array.forEach
          			for (var i = 0; i < result.affiliateSites.item.length; i++) {
          				//console.log('item %s, affiliate site id %s',i,result.affiliateSites.item[i].ID.$value);
          				affiliateSiteIds.push(result.affiliateSites.item[i].ID.$value);
          			}


          		} else {
          			// only one affiliate site id
          			//console.log('affiliatesites item is NOT an array');
          			//console.log('affiliateSite id is %s',result.affiliateSites.item.ID.$value);
          			affiliateSiteIds.push(result.affiliateSites.item.ID.$value);
          		}			          	

				callback(null,client,affiliateSiteIds);

			});
		},

		function retrieveTradetrackerEarnings(client,affiliateSiteIds,callback){
			//console.log('async retrieveEarnings');

			
			var totalEarnings = 0;      	
      	
			// for each affiliate site ids, get the earnings
			async.eachOf(affiliateSiteIds,function getReportAffiliateSite(affiliateSiteId,index,afterEachEarning){
			//affiliateSiteIds.forEach(function getReportAffiliateSite(affiliateSiteId,index){
			
				var argsRAS = {
	          	 	affiliateSiteID : affiliateSiteId,
	          	 	options : {
						 dateFrom: tradetrackerApiDay,
						 dateTo: tradetrackerApiDay
	          		}
	          	};

	          	console.log("[%s] retrieveTradetrackerEarnings - affiliate site id %s",username,affiliateSiteId);

	          	client.getReportAffiliateSite(argsRAS,function getEarningsForSite(err,report){
	          		if (err){
	          			console.log('Error while getting conversion transactions',err);
	          			//res.send(err)					          			
	          		} else {
		          		//console.log('value of index',index);
		          		//console.log('affiliateSiteIds array',affiliateSiteIds);
		          		//console.log("getReportAffiliateSite for site id [%s] : [%s]",affiliateSiteId,report);

		          		var earnings = 0;
		          		if (report){
		          			earnings = report.reportAffiliateSite.totalCommission.$value;
		          		}
		          		console.log('Earned for site ID %s : %s',affiliateSiteId,earnings);
		          		totalEarnings += earnings;
					}
					afterEachEarning();
	          	});
			},function (err){
				//console.log('After all earnings gotten');
				console.log('[%s] Tradetracker - Total earnings : ',username,totalEarnings);
				callback(null,totalEarnings);
			});
		}, 

		function saveInDb(result,callback){
			//console.log('async retrieveEarnings');
			var tradetrackerIncome = new Income.Tradetracker( { user_id: user_id, date: tradetrackerApiDay, income : result});
			tradetrackerIncome.save(function(err){
			if (err){
					console.log('[%s] Error while saving tradetracker earnings into DB',username,err.errmsg);
					callback(null,result);
				} else {
					//console.log('[%s] Tradetracker earnings successfully saved in DB',username);
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
	console.log("[%s] #### getMonthEarnings for Tradetracker",username);
	var monthNumber = day.month() + 1;
	//console.log("Month [%s] with number [%s]",day.format('MMMM'),monthNumber);
	Income.Tradetracker.aggregate([
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
				
			//console.log("Success with getMonthEearnings TRADETRACKER. Result: ",result);
			after(null,result[0].total);
		}
	);
	//console.log("######### getMonthEarnings END");
};

module.exports = {router ,getEarnings, getMonthEarnings};