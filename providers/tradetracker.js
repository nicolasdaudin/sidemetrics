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
			getEarningsSeveralDays(user._id,username,yesterday,yesterday,function(err,result){
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

router.get('/historic/:username/:months',function(req,res){
	
	var username = req.params.username;
	var months = req.params.months;
	console.log('\n##### [%s] trying to get Tradetracker historic earningsArray for the past %s months',username,months);

	User.findByUsername(username,function(err,user){
		if (err){
			console.log('Error while retrieving user',err);
			callback(err,null);
		} else {
			//console.log('user',user);
			var yesterday = moment().subtract(1,'days'); 
			var beginDay = moment().subtract(months,'months');

			getEarningsSeveralDays(user._id,username,beginDay,yesterday,function(err,result){
				if (err){
					console.log("Returned from getEarnings (Tradetracker) with ERROR");
					res.send("Returned from getEarnings (Tradetracker) with ERROR");
				} else {
					//console.log("FINAL  RESULT",result);
					res.send("<p>FINAL RESULT</p>" + JSON.stringify(result));
				}
			});
		}
	});	
});

var getEarnings = function (user_id,username,day,after){	
	getEarningsSeveralDays(user_id,username,day,day,after);
}

var getEarningsSeveralDays = function (user_id,username,startDay,endDay,after){

	console.log("############### [%s] BEGIN TRADETRACKER GET EARNINGS",username);

	var tradetrackerApiStartDay = startDay.format('YYYY-MM-DD');

	// Tradetracker takes the day before end day so we have to force one day more.
	var tradetrackerApiEndDay = endDay.clone().add(1,'days').format('YYYY-MM-DD');

	async.waterfall([

		function findCredentials(callback){
			console.log('[%s] Tradetracker findCredentials',username);
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
			console.log('[%s] Tradetracker authenticate',username);
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
			console.log('[%s] Tradetracker getAffiliateSites',username);

			var argsAS = {
          		options: {}
          	};

          	client.getAffiliateSites(argsAS ,function retrieveAffiliateSites(err,result){
          		if (err){
          			console.log('Error while getting affiliate sites',err);
          			res.send(err);
          			return;
          		}

          		console.log('[%s] Tradetracker retrieveAffiliateSites',username);


          		var affiliateSiteIds = [];
          		if (Array.isArray(result.affiliateSites.item)){
          			// several affiliate site ids
          			

          			// according to this article https://coderwall.com/p/kvzbpa/don-t-use-array-foreach-use-for-instead
          			// this basic 'for' is much faster than Array.forEach
          			for (var i = 0; i < result.affiliateSites.item.length; i++) {
          				//console.log('item %s, affiliate site id %s',i,result.affiliateSites.item[i].ID.$value);
          				affiliateSiteIds.push(result.affiliateSites.item[i].ID.$value);
          			}


          		} else {
          			// only one affiliate site id
          			
          			//console.log('affiliateSite id is %s',result.affiliateSites.item.ID.$value);
          			affiliateSiteIds.push(result.affiliateSites.item.ID.$value);
          		}			          	

				callback(null,client,affiliateSiteIds);

			});
		},

		function retrieveTradetrackerEarnings(client,affiliateSiteIds,callback){
			console.log('[%s] Tradetracker retrieveEarnings',username);

			
			var earningsArray = [];
      	
			// for each affiliate site ids, get the earningsArray
			async.eachOf(affiliateSiteIds,function getConversionTransactions(affiliateSiteId,index,afterEachEarning){
			
			
				var argsCT = {
	          	 	affiliateSiteID : affiliateSiteId,
	          	 	options : {
						 registrationDateFrom: tradetrackerApiStartDay,
						 registrationDateTo: tradetrackerApiEndDay
	          		}
	          	};
	          	
	          	console.log("[%s] retrieveTradetrackerEarnings - affiliate site id %s",username,affiliateSiteId);

	          	client.getConversionTransactions(argsCT,function getEarningsForSite(err,report){
	          		if (err){
	          			console.log('Error while getting conversion report',err);
	          			//res.send(err)					          			
	          		} else {
		          		//console.log('value of index',index);
		          		//console.log('affiliateSiteIds array',affiliateSiteIds);
		          		//console.log("getConversionTransactions for site id [%s] : [%s]",affiliateSiteId,JSON.stringify(report));

		          		// TODO : on vient de rajouter && Report.conversionTransactions.item car sinon le earnings/nicdo77 (pour un seul jour) ne fonctionne pas
		          		if (report && report.conversionTransactions && report.conversionTransactions.item && report.conversionTransactions.item.length > 0){
		          			report.conversionTransactions.item.forEach(function(transaction) {
		          				var commission = new Number(transaction.commission.$value);
		          				var formatDate = moment(transaction.registrationDate.$value).format('YYYY-MM-DD');
							    //console.log('transaction - commission [%s] raw date [%s] formatted date [%s]',commission,trdate,formatDate);

   								
							    if (earningsArray[formatDate.toString()]) {
							    	earningsArray[formatDate.toString()] += commission;
							    } else {
							    	earningsArray[formatDate.toString()] = 0 + commission;
							    }

							});
		          		}
		          		//console.log('[%s] Earned for site ID %s : %s',username,affiliateSiteId,earningsArray);
		          		//totalEarnings += earningsArray;
					}
					afterEachEarning();
	          	});
			},function (err){
				//console.log('After all earningsArray gotten');
				//console.log('[%s] Tradetracker - Total earningsArray : ',username,totalEarnings);
				callback(null,earningsArray);
			});
		}, 

		function saveInDb(earningsArray,callback){
			console.log('[%s] Tradetracker saveInDb',username);

			//console.log('earningsArray',earningsArray);
			var error = "";
			var daysProcessed = 0;

			if (earningsArray){
				var earningDate = tradetrackerApiStartDay;
				var continueLoop = true;

				do { 
					//console.log('ganado %s on %s',earningsArray[earningDate],earningDate);

					var tempDay = moment(earningDate).format('YYYY-MM-DD');
					

					var commission = 0;
					if (earningsArray[tempDay]){
						commission = earningsArray[tempDay];
					}
					
					var tempEarning = { day : tempDay, earned : commission};
					if(moment(tempDay).isSame(tradetrackerApiEndDay)) {
						//  ############# 
						//      TODO
						// ##############
						// This is wrong: only callbacks with the last earning. This would not work for several days
						// but that's not the point. 
						// once we separate cron to retrieve earnings and cron to send emails, we will be muuuuch better
				      	callback(error,commission);
				      	continueLoop = false;
				    } else {
						Income.Tradetracker.findOneAndUpdate({ user_id: user_id, date: tempDay}, {income : commission},{upsert:true},(function(err){
							if (err){
								console.log('[%s] Error while saving Tradetracker earnings  (%s) into DB. Error : ',username,JSON.stringify(this),err.errmsg);
								error = error.concat(err.errmsg+ '\n');								
							} else {
								console.log('[%s] Saved Tradetracker earnings in DB: (%s) ',username,JSON.stringify(this));
								//callback(null,result);
							}
							
						}).bind(tempEarning));

						
					}
					earningDate = moment(tempDay).add(1,'days').format('YYYY-MM-DD');
				} while (continueLoop);
				
			}

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

			console.log("Success with getMonthEearnings TRADETRACKER. Result: ",result);
			if (result && result[0]){
				after(null,result[0].total);
			} else {
				after(null,0);
			}
			
			
		}
	);
	//console.log("######### getMonthEarnings END");
};

module.exports = {router ,getEarnings, getMonthEarnings};