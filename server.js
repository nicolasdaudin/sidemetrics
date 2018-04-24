var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var cron = require('node-cron');
var nodemailer =require ('nodemailer');
var mongoose = require('mongoose');
var moment = require ('moment');
moment.locale('es');

var adsense = require ('./providers/adsense');
var analytics = require ('./providers/analytics');
var tradetracker = require ('./providers/tradetracker');
var moolineo = require ('./providers/moolineo');
var loonea = require ('./providers/loonea');
var thinkaction = require ('./providers/thinkaction');
var dgmax = require ('./providers/dgmax');
var daisycon = require('./providers/daisycon');
var gamblingaffiliation = require('./providers/gamblingaffiliation');

var Income = require('./models/income');
var AnalyticsModel = require('./models/analytics');
var Credentials = require('./models/credentials');

var getIncomeProviders = function (){  
	return [
		{source:'Google Adsense',dbname:'adsense',provider:adsense,credentials_model:Credentials.Adsense,income_model:Income.Adsense},
		{source:'TradeTracker',dbname:'tradetracker',provider:tradetracker,credentials_model:Credentials.Tradetracker,income_model:Income.Tradetracker},
		{source:'Moolineo',dbname:'moolineo',provider:moolineo,credentials_model:Credentials.Moolineo,income_model:Income.Moolineo},
		{source:'Loonea',dbname:'loonea',provider:loonea,credentials_model:Credentials.Loonea,income_model:Income.Loonea},
		{source:'Thinkaction - Toluna',dbname:'thinkaction',provider:thinkaction,credentials_model:Credentials.Thinkaction,income_model:Income.Thinkaction},
		{source:'DGMax Interactive (convertido a EUR)',dbname:'dgmax',provider:dgmax,credentials_model:Credentials.Dgmax,income_model:Income.Dgmax},
		{source:'Daisycon',dbname:'daisycon',provider:daisycon,credentials_model:Credentials.Daisycon,income_model:Income.Daisycon},
		{source:'Gambling Affiliation',dbname:'gambling',provider:gamblingaffiliation,credentials_model:Credentials.GamblingAffiliation,income_model:Income.GamblingAffiliation}
	]
};

var User = require('./models/user');

var async = require ('async');




app.set('port', process.env.PORT || 3000);


/** MAILER INIT **/

// create reusable transporter object using the default SMTP transport
// it will only be possible if that email has "Less secured app authorized" enabled: https://www.google.com/settings/security/lesssecureapps 
var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: 'nicolas.ddn.fr@gmail.com',
		pass: process.env.GMAIL_NODEMAILER_PWD
	}
});

app.use(express.static('static'));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing 

app.use('/analytics',analytics.router);
app.use('/adsense',adsense.router);
app.use('/tradetracker',tradetracker.router);
app.use('/moolineo',moolineo.router);
app.use('/loonea',loonea.router);
app.use('/thinkaction',thinkaction.router);
app.use('/dgmax',dgmax.router);
app.use('/daisycon',daisycon.router);
app.use('/gamblingaffiliation',gamblingaffiliation.router);

app.get('/', function (req, res) {
  var homepageHtml = 
  		"<div>" + 
  		"<h1>Welcome to Sidemetrics 1.1.0</h1>" + 
  		"<h2>MAIN MENU</h2>" +   		
  		"<ul>" + 
		"<li><a href='/dashboard'>DASHBOARD</a></li>"+  
		"<li><a href='/cron/fetchEarnings'>CRON fetchEarnings</a></li>"+  
		"<li><a href='/cron/fetchEarningsToday'>CRON fetchEarningsToday</a></li>"+  
		"<li><a href='/cron/sendEmails'>CRON sendEmails</a></li>"+  
  		"</ul>" +  		
  		"<h2>TESTING</h2>" + 
  		"<ul>"+
  		"<li>Analytics connect: <a href='/analytics/connect/nicdo77'>nicdo77</a> - <a href='/analytics/connect/jimena123'>jimena123</a></li>"+  		
  		"<li>Analytics user sessions: <a href='/analytics/usersessions/nicdo77'>nicdo77 (yesterday)</a> - <a href='/analytics/usersessions/jimena123'>jimena123 (yesterday)</a></li>"+
  		"<li>Analytics HISTORIC 6 months: <a href='/analytics/historic/nicdo77/1'>nicdo77</a> - <a href='/analytics/historic/jimena123/1'>jimena123</a></li>" + 
  		"</ul>" +  		
  		"<h2>Working - Normal</h2>" + 
  		"<ul>"+
  		"<li>Adsense connect: <a href='/adsense/connect/nicdo77'>nicdo77</a></li>"+  		
  		"<li>Adsense earnings: <a href='/adsense/earnings/nicdo77'>nicdo77 (yesterday)</a> - <a href='/adsense/earnings/jimena123'>jimena123 (yesterday)</a></li>"+
  		"<li>Tradetracker earnings: <a href='/tradetracker/earnings/nicdo77'>nicdo77 (yesterday)</a> - <a href='/tradetracker/earnings/jimena123'>jimena123 (yesterday)</a></li>"+
  		"<li>Moolineo earnings: <a href='/moolineo/earnings/nicdo77'>nicdo77 (yesterday)</a></li>" +
  		"<li>Loonea earnings: <a href='/loonea/earnings/nicdo77'>nicdo77 (yesterday)</a></li>" +
  		"<li>Daisycon earnings: <a href='/daisycon/earnings/nicdo77'>nicdo77 (yesterday)</a> - <a href='/daisycon/earnings/jimena123'>jimena123 (yesterday)</a></li>" + 
  		"<li>DG MAX earnings: <a href='/dgmax/earnings/jimena123'>jimena123 (yesterday)</a></li>" + 
  		"<li>Thinkaction: <a href='/thinkaction/earnings/nicdo77'>nicdo77 (yesterday)</a> - <a href='/thinkaction/earnings/jimena123'>jimena123 (yesterday)</a></li>" +
  		"<li>Gambling Affiliation: <a href='/gamblingaffiliation/earnings/nicdo77'>nicdo77 (yesterday)</a></li>" +
  		"</ul>" + 
  		"<h2>Working - Historic</h2>" +   		
  		"<ul>"+
  		"<li>Adsense 6 months: <a href='/adsense/historic/nicdo77/6'>nicdo77</a> - <a href='/adsense/historic/jimena123/6'>jimena123</a></li>" + 
  		"<li>Thinkaction 6 months: <a href='/thinkaction/historic/nicdo77/6'>nicdo77</a> - <a href='/thinkaction/historic/jimena123/6'>jimena123</a></li>" + 
  		"<li>Daisycon 6 months: <a href='/daisycon/historic/nicdo77/6'>nicdo77</a> - <a href='/daisycon/historic/jimena123/6'>jimena123</a></li>" + 
  		"<li>Tradetracker 6 months: <a href='/tradetracker/historic/nicdo77/6'>nicdo77</a> - <a href='/tradetracker/historic/jimena123/6'>jimena123</a></li>" + 
  		"<li>Gambling Affiliation 6 months: <a href='/gamblingaffiliation/historic/nicdo77/6'>nicdo77</a></li>" + 
  		"</ul>" + 
  		"</div>";
  res.send(homepageHtml);
  console.log('Server time is : ', moment());
});




app.get('/wakeup',function(req,res){
	res.send('Waking up');
	console.log("Just woke up ;-) . Time now is : ",moment());
});

app.get('/historic/all/:days/:username',function(req,res){
	var username = req.params.username;
	var days = req.params.days;
	console.log('[%s] trying to get historic earnings for the past %s days',username,days);

	User.findByUsername(username,function(err,user){
		if (err){
			console.log('Error while retrieving user',err);
			callback(err,null);
		} else {
			console.log('user',user);

			console.log('loop start');

			
			var today = moment();
			var tempday = moment().subtract(days,'days');

			console.log('getting historic for past %s days, i.e. from %s until today',days,tempday);

			while (!tempday.isSame(today,'day')){
				console.log('tempday is %s - today is %s',tempday,today);
				tempday.add(1,'days'); 
			}

			console.log('loop finished');
			res.send("Yes got it!");
			/*getEarnings(user._id,username,yesterday,function(err,result){
				if (err){
					console.log("Returned from getAdsenseEarnings with ERROR");
					res.send("Returned from getAdsenseEarnings with ERROR");
				} else {
					console.log("FINAL  RESULT",result);
					res.send("<p>FINAL RESULT</p>" + JSON.stringify(result));
				}
			});*/
		}
	});	
});

app.get('/cron/all',function(req,res){
	console.log("CRON ALL - MANUAL LAUNCH - BEGIN");
	fetchEarnings();
	sendEmails();
	res.send('ONGOING, check logs');
});

app.get('/cron/fetchEarnings',function(req,res){
	console.log("CRON FETCH EARNINGS - MANUAL LAUNCH");
	fetchEarnings();
	res.send('ONGOING, check logs');
});

app.get('/cron/fetchEarningsToday',function(req,res){
	console.log("CRON FETCH EARNINGS TODAY- MANUAL LAUNCH");
	fetchEarnings(true);
	res.send('ONGOING, check logs');
})

app.get('/cron/sendEmails',function(req,res){
	console.log("CRON SEND EMAILS - MANUAL LAUNCH");
	sendEmails();
	res.send('ONGOING, check logs');
});

const fetchEarnings = function(isToday){

	// CRON STARTED
    var cronBegin = moment();
    console.log('CRON FETCH EARNINGS - BEGIN at',cronBegin);

    var day = moment().subtract(1,'days'); 
    var niceDay = day.format('dddd DD MMMM YYYY');
    var monthname = day.format('MMMM');

    if (isToday) {
    	day = moment();
    }

    console.log('CRON FETCH EARNINGS - FOR DAY',day);
    // get all users
    User.findAllUsers(function(err,users){
    	if (err) { 
    		console.log("Error while retrieving all users : ",err);
    	} else {

    		async.eachSeries(users,function getInfoFromIncomeSource(user,callbackEach){

    			var username = user.username;

    			// getting Analytics user sessions    			
    			analytics.getUserSessions(user._id,username,day,function(err,result){
    				if (err){
						console.error("[%s] CRON FETCH EARNINGS - Back from Analytics.getUserSessions with error: ",username,err);					
					} else {
						//console.log("[%s] CRON FETCH EARNINGS - Back from Analytics.getUserSessions with SUCCESS",username);	
					}	
    			});

    			// in "parallel", getting earnings....
				var incomeproviders = getIncomeProviders();				
				
				async.eachSeries(incomeproviders,function(incomeprovider,callbackSmallEach){
					var incomesource = incomeprovider.source;

					// first check if the user uses that income source
					Credentials.userHasCredentials(user._id,username,incomesource,incomeprovider.credentials_model,function(err,hasCredentials){
						if (!hasCredentials){
							callbackSmallEach();
						} else {
							
							incomeprovider.provider.getEarnings(user._id,username,day,function(err,result){
								if (err){
									console.error("[%s] CRON FETCH EARNINGS - Back from getEarnings for %s with error: ",username,incomesource,err);
									callbackSmallEach();
								} else {
									//var dayTotal = result.totals[1];
									//var dayTotal = result;
									//console.log("[%s] CRON FETCH EARNINGS - Back from getEarnings for day %s for %s with earnings: ",username,day,incomesource,dayTotal);					
									callbackSmallEach();

								}	
							});
						}

						
					});
				}, function afterAllProviders(){


					callbackEach();
				});
	    	},
	    	function afterAllUsers(){	
	    		var cronEnd = moment();    		
	    		var elapsed = cronEnd.diff(cronBegin,'s');
	    		console.log('CRON FETCH EARNINGS - END at %s. Time elapsed: %s seconds',cronEnd,elapsed);
	    	});
    	}
    });
};

var getUserSessions = function(user,begin,end,sessions,callback){
	var username = user.username;
	console.log('[%s] begin getUserSessions',username);
	
	
	AnalyticsModel.getDaySessions(user._id,username,begin,end,function(err,result){
		//console.log('callback from getDayEarnings - result=%s - err=%s',JSON.stringify(result),err);
		if (err){
			console.log("[%s] server.js - Back from getDaySessions for %s with error: ",username,err);
			callback();
		} else {
			console.log("[%s] Back from getDaySessions between %s and %s",username,begin,end);		

			sessions.days = [];
			result.forEach(function(item){

				var itemDate = moment(item.date).format('YYYY-MM-DD');
				var itemSessions = item.sessions;
				sessions.days[itemDate] = new Number(itemSessions);
			});
			
		
			AnalyticsModel.getMonthSessions(user._id,username,end,function(err,result){
				console.log('callback from getMonthSessions - result=%s - err=%s',JSON.stringify(result),err);
				if (err){
					console.log("[%s] server.js - Back from getMonthSessions with error: ",username,err);
					callback();
				} else {
					console.log("[%s] Back from getMonthSessions for day %s with sessions: ",username,end,result);		

					sessions.month = new Number(result);
					callback();

				}

			});	

		}

	});	
		
};

// ************
// incomeprovider gets modified directly in this fonction
//
// this function retrieves all user earnings for the given <incomeprovider>, between <begin> and <end>
// ************
var getUserEarningsByIncome = function(user,begin,end,incomeprovider,callback){
	var username = user.username;
	console.log('[%s] begin getUserEarningsByIncome',username);
	
	var incomesource = incomeprovider.source;

	// first check if the user uses that income source
	Credentials.userHasCredentials(user._id,username,incomesource,incomeprovider.credentials_model,function(err,hasCredentials){
		if (!hasCredentials){
			callback();
		} else {

			// the user does use that income source.

			// ONCE getEarnings only retrieves the earnings from DB (instead of also launching the 3rd party call)
			// - getEarnings and getMonthEarnings could be done in parallel
			// - and also, probably, getEarnings can retrieve earnings for day, month, year... all in one call. No?
			
			Income.getDayEarnings(user._id,username,begin,end,incomesource,incomeprovider.income_model,function(err,result){
				//console.log('callback from getDayEarnings - result=%s - err=%s',JSON.stringify(result),err);
				if (err){
					console.log("[%s] server.js - Back from getDayEarnings for %s with error: ",username,incomesource,err);
					callback();
				} else {
					console.log("[%s] Back from getDayEarnings between %s and %s for %s",username,begin,end,incomesource);		

					incomeprovider.earnings = {days : []};
					result.forEach(function(item){

						var itemDate = moment(item.date).format('YYYY-MM-DD');
						var itemEarning = item.income;
						incomeprovider.earnings.days[itemDate] = new Number(itemEarning);
					});
					
				
					Income.getMonthEarnings(user._id,username,end,incomesource,incomeprovider.income_model,function(err,result){
						console.log('callback from getMonthEarnings - result=%s - err=%s',JSON.stringify(result),err);
						if (err){
							console.log("[%s] server.js - Back from getMonthEarnings for %s with error: ",username,incomesource,err);
							callback();
						} else {
							console.log("[%s] Back from getMonthEarnings for day %s for %s with earnings: ",username,end,incomesource,result);		

							incomeprovider.earnings.month = new Number(result);
							callback();

						}

					});	

				}

			});	
		}

		
	});
};

app.get('/dashboard',function(req,res){

	console.log('ABOUT TO SHOW DASHBOARD FUCK YEAH !!!!!');

	console.log('BUT FIRST, LETS FETCH EARNINGS FOR TODAY');
	//fetchEarnings(true);
	// TODO: peut-être rajouter un cron qui s'execute toutes les heures pour actualiser les earnings de TODAY ?!?!?!?!?!?!?!?!?!
	// HUM DANGEREUX CAR ça veut dire executer le scraper et les APIS 24 fois par jour... au lieu de 2 ou 3 fois si c'est que lié à l'affichage du dashboard - donc à la demande
	// MAIS D'UN AUTRE COTE, si c'est à la demande, on sait que ça prend 60 secondes pour tout recupérer (comme le fetchEarnings normal)... donc... !??
	// ET SINON faut de toute façon asyncer ou algo, parce que sinon.... les deux vont s'executer en parallèle et y aura rien dans HOY....

	var today = moment();
	var yesterday = moment().subtract(1,'days');
    var dashboardBeginDate = moment().subtract(8,'days'); 
    //var niceDay = yesterday.format('dddd DD MMMM YYYY');
    var monthname = yesterday.format('MMMM');

    var daysArray = [];
    var tempday = moment(dashboardBeginDate);
    while (tempday.isBefore(today)) {
    	daysArray.push(tempday.format('YYYY-MM-DD'));
    	tempday.add(1,'days');
    } 

    var homepageHtml = 
    	`<style> \
    		body { \
    			font-family : Helvetica,Arial,sans-serif; \
    		}\
  			thead { \
			    background-color: #c5f7c7; \
			    color: #707070 \			    
			} \	
			tfoot { \
			    font-size:1.2em; \
			    background-color: #ffde84; \
			    color: #707070 \
			} \	
			th, td { \
			    padding: 5px 15px; \
			    text-align: left; \
			    border-bottom: 1px solid #ddd; \
			    font-weight : normal \
			} \
			.visits { \
				font-size:1.1em; \
				font-style:italic; \
				background-color: #f7e3ad; \
			    color: #707070 \
			} \
			.yesterday { \
				color: red \
			} \
			.month { \
				font-weight: bold \ 
			} \
  		</style>` + 
  		"<div>" + 
  		"<h1>Sidemetrics 1.2.0 - Dashboard</h1>" + 
  		`<h2>Ganancias de los últimos 7 dias</h2>`;

   
    // get all users
    User.findAllUsers(function(err,users){
    	if (err) { 
    		console.log("Error while retrieving all users : ",err);
    	} else {

    		async.eachSeries(users,function getUserEarnings(user,callbackEach){

    			// getting Analytics user sessions    	
    			var sessions = [];		
    			getUserSessions(user,dashboardBeginDate,yesterday,sessions,function(){
    				console.log('[%s] callback from getUserSessions',username);
    			})
    			// RISK: sessions will not be populated yet when you use it... let's see....

    			var username = user.username;
				var incomeproviders = getIncomeProviders();				
				
				async.eachSeries(incomeproviders,function (incomeprovider,callbackSmallEach){
					getUserEarningsByIncome(user,dashboardBeginDate,yesterday,incomeprovider,function(){
						console.log('[%s] callback from getUserEarningsByIncome',username);
						callbackSmallEach();
					});
				},    			
    			function prepareResult(err){
    				
    				if (err) {
    					console.error('[%s] error:',username,err);
    				} else {
	    				//console.log('[%s] earnings:',username,earnings);
	    				//console.log('[%s] earnings:',username,incomeproviders);
	    				console.log('[%s] preparing dashboard result',username);
						
	    				// TABLE HEADER
						var userHtml = `<h3>Usuario ${username}</h3>`+
							`<table><thead><tr><th>Plataforma</th>`;

						for (var i = 0; i < daysArray.length - 1; i++) {
							var thisday = moment(daysArray[i]).format('dddd D');
							userHtml += `<th>${thisday}</th>`;
						}

						userHtml += `<th class="yesterday">Ayer</th><th class="month">TOTAL ${monthname}</th></tr></thead><tbody>`;
						
						// EARNINGS 
						var totalByDays = [];
						var totalMonth = 0;
						for (var i = 0; i < incomeproviders.length; i++) {
							
							var incomeprovider = incomeproviders[i];
							userHtml += '<tr>';
		          			if (incomeprovider.earnings){		          				
	          					//during the week
	          					userHtml += `<td><b>${incomeprovider.source}</b></td>`;

	          					var earningByDays = incomeprovider.earnings.days;

	          					for (var j = 0;j<daysArray.length - 1; j++){

	          						var dayEarnings = 0;
	          						if (earningByDays[daysArray[j]]){
	          							// earningsByDays[daysArray[j] can be undefined if there are no income registered in DB for that day]
	          							dayEarnings = earningByDays[daysArray[j]];
	          						};

	          						if (!totalByDays[daysArray[j]]){
	          							totalByDays[daysArray[j]] = dayEarnings;
	          						} else {
	          							totalByDays[daysArray[j]] += dayEarnings;
	          						}
	          						userHtml +=	`<td>${dayEarnings.toFixed(2)} €</td>`;
	          					}

	          					//lastday
	          					var lastdayearning = 0;
	          					if (earningByDays[daysArray[daysArray.length-1]]){
	          						lastdayearning = earningByDays[daysArray[daysArray.length-1]];
	          					}

	          					if (!totalByDays[daysArray[daysArray.length-1]]){
	          						totalByDays[daysArray[daysArray.length-1]] = lastdayearning;
	          					} else {
	          						totalByDays[daysArray[daysArray.length-1]] += lastdayearning;
	          					}
	          					userHtml += `<td class="yesterday">${lastdayearning.toFixed(2)} €</td>`;
	          					
	          					//month
	          					var totalMonthByProvider = incomeprovider.earnings.month;
	          					userHtml +=	`<td class="month">${totalMonthByProvider.toFixed(2)} €</td>`;
	          					
	          					
	          					totalMonth += totalMonthByProvider;
	          				}
	          				userHtml += '</tr>';
	          			}

	          			var totalAyer = totalByDays[daysArray[daysArray.length-1]];


	          			if (sessions && sessions.days && sessions.month && sessions.month > 0){
	          				// we have statistics about visits

	          				//var sessionsYesterday = sessions.days[yesterday.format('YYYY-MM-DD')];
		          			var sessionsMonth = sessions.month;

		          			var earningsPerVisitorDays = [];//(totalToday*100 / sessionsYesterday).toFixed(2);
		          			var earningsPerVisitorMonth = (totalMonth*100 / sessionsMonth);

		          			// NUMBER OF VISITS
		          			userHtml += `<tr class="visits"><td>Visitas</td>`;

		          			for (var i = 0; i<daysArray.length-1;i++){
		          				var sessionsByDay = sessions.days[daysArray[i]];
		          				//earningsPerVisitorDays[daysArray[i]] = sessionsByDay*100/totalByDays[daysArrai[i]];
		          				userHtml += `<td>${sessionsByDay}</td>`;
		          			}

		          			var totalSessionsAyer = sessions.days[daysArray[daysArray.length-1]];
		          			
		          			//last day
		          			userHtml += `<td class="yesterday">${totalSessionsAyer}</td>`;
		          			// total total
		          			userHtml += `<td>${sessionsMonth}</td></tr>`; 


		          			// EARNINGS PER VISITOR
							userHtml += `<tr class="visits"><td>Ganancias por visitas</td>`;

		          			for (var i = 0; i<daysArray.length-1;i++){
		          				var earningsPerVisitorDays = (totalByDays[daysArray[i]]*100/sessions.days[daysArray[i]]);
		          				userHtml += `<td>${earningsPerVisitorDays.toFixed(2)} €</td>`;
		          			}

		          			var earningsPerVisitorAyer = totalAyer*100/totalSessionsAyer;
		          			
		          			//last day
		          			userHtml += `<td class="yesterday">${earningsPerVisitorAyer.toFixed(2)} €</td>`;
		          			// total total
		          			userHtml += `<td>${earningsPerVisitorMonth.toFixed(2)} €</td></tr>`; 
						
	          			} 

	          			// TOTALS
	          			userHtml += `</tbody><tfoot><tr><td>TOTAL GANANCIAS</td>`;
	          			
	          			for (var i = 0; i<daysArray.length-1;i++){
	          				var totalByDay = totalByDays[daysArray[i]];
	          				userHtml += `<td>${totalByDay.toFixed(2)} €</td>`;
	          			}

	          			

	          			//last day
	          			userHtml += `<td class="yesterday">${totalAyer.toFixed(2)} €</td>`;
	          			// total total
	          			userHtml += `<td>${totalMonth.toFixed(2)} €</td></tr></tfoot>`;

	          			

	          			
	          			userHtml += `</table>`;

						console.log('[%s] HTML Text in Dashboard ',username,userHtml);
						
						homepageHtml += userHtml;

						//console.log('[%s] TEST - EMAIL SENT',username);
						console.log("Just before calling callbackEach()");
    					callbackEach();
					}

    			});
	    	},
	    	function final(){	
	    		homepageHtml += 
	    			"</div>" +
	    			"<div><a href='/'>Go back to homepage</a></div>";
	    		res.send(homepageHtml);
	    	});
    	}
    });

});


const sendEmails = function() {
    // CRON STARTED
    var cronBegin = moment();
    console.log('CRON SEND EMAILS - BEGIN at',cronBegin);


    var yesterday = moment().subtract(1,'days'); 
    var niceDay = yesterday.format('dddd DD MMMM YYYY');
    var monthname = yesterday.format('MMMM');

    console.log('CRON SEND EMAILS FOR DAY',yesterday);
    // get all users
    User.findAllUsers(function(err,users){
    	if (err) { 
    		console.log("Error while retrieving all users : ",err);
    	} else {

    		async.eachSeries(users,function getUserEarnings(user,callbackEach){

    			// getting Analytics user sessions    	
    			var sessions = [];		
    			getUserSessions(user,yesterday,yesterday,sessions,function(){
    				console.log('[%s] callback from getUserSessions',username);
    			})
    			// RISK: sessions will not be populated yet when you use it... let's see....
    			
    			var username = user.username;
				var incomeproviders = getIncomeProviders();				
				
				async.eachSeries(incomeproviders,function (incomeprovider,callbackSmallEach){
					getUserEarningsByIncome(user,yesterday,yesterday,incomeprovider,function(){
						console.log('[%s] callback from getUserEarningsByIncome',username);
						callbackSmallEach();
					});
				},    			
    			function sendEmails(err){
    				
    				if (err) {
    					console.error('[%s] error:',username,err);
    				} else {
	    				//console.log('[%s] earnings:',username,earnings);
	    				//console.log('[%s] earnings:',username,incomeproviders);
	    				console.log('[%s] about to send email to',username,user.email);
						var mailHtml = 'Querid@ ' + username +', aquí va el detalle de lo que has ganado ayer (' + niceDay +').<p>';
						var totalToday = 0;
						var totalMonth = 0;
						for (var i = 0; i < incomeproviders.length; i++) {
							
							var incomeprovider = incomeproviders[i];
		          			if (incomeprovider.earnings){
		          				var earningsYesterday = 0;
		          				if (incomeprovider.earnings.days && incomeprovider.earnings.days[yesterday.format('YYYY-MM-DD')]){
		          					earningsYesterday = incomeprovider.earnings.days[yesterday.format('YYYY-MM-DD')];
		          				}
		          				var mailPhraseSource = '<b>' + incomeprovider.source + '</b> : ' + earningsYesterday + 
		          					' <i>(Total for ' + monthname  + ' : ' + incomeprovider.earnings.month + ')</i><br>';
	          					//console.log(mailPhraseSource);
	          					mailHtml += mailPhraseSource;
	          					totalToday += earningsYesterday;
	          					totalMonth += incomeprovider.earnings.month;
	          				}
	          			}
	          		
	          			var sessionsYesterday = sessions.days[yesterday.format('YYYY-MM-DD')];
	          			var sessionsMonth = sessions.month;

	          			var earningsPerVisitorYesterday = (totalToday*100 / sessionsYesterday);
	          			var earningsPerVisitorMonth = (totalMonth*100 / sessionsMonth);

	          			mailHtml += '</p><p>Resumén de ayer (' + niceDay + ') :';
	          			mailHtml += '<ul><li>Has ganado <b>' + totalToday.toFixed(2) + ' €</b></li>';
	          			mailHtml += '<li>Has recibido <b>' + sessionsYesterday + ' visitas</b></li>';
	          			mailHtml += '<li>Eso es una ganancia media de <b>' + earningsPerVisitorYesterday.toFixed(2) + ' centimos por visitas</b></li></ul></p>';
	          		
	          			mailHtml +=	'<p>Resumén del mes de ' + monthname + ':';
	          			mailHtml += '<ul><li>En total, ya has ganado <b>' + totalMonth.toFixed(2) + ' €</b> en ' + monthname + '... Estamos locos?</li>';
	          			mailHtml += '<li>Has tenido <b>'+ sessionsMonth +' visitas </b> durante el mes</li>';
	          			mailHtml += '<li>Eso es una ganancia media de <b>' + earningsPerVisitorMonth.toFixed(2) + ' centimos por visitas</b> este mes</li></ul></p>';
						
						//console.log('[%s] Final mail about to be sent:',mailHtml);

						console.log('[%s] Mail about to be sent ==> ',username,mailHtml);
						// setup email data with unicode symbols
						var mailOptions = {
						    from: '"Sidemetrics 👩🏽🐷📈🚀❤️" <no-reply@sidemetrics.com>', // sender address
						    to: user.email, 
						    subject: 'Ganancias del dia ' + niceDay, // Subject line
						    //text: mailText, // plain text body
						    html: mailHtml // html body
						};

						// send mail with defined transport object
						transporter.sendMail(mailOptions, function(err, info){
						    if (err) {
						        console.log("[%s] Email could not be sent to %s. Error : ", username,user.email,err);			      
						    } else {
						    	console.log('[%s] Email successfully sent to',username,user.email);
						    }			    
						});
						//console.log('[%s] TEST - EMAIL SENT',username);
						console.log("Just before calling callbackEach()");
    					callbackEach();
					}

    			});
	    	},
	    	function final(){	
	    		var cronEnd = moment();    		
	    		var elapsed = cronEnd.diff(cronBegin,'s');
	    		console.log('CRON SEND EMAILS - END at %s. Time elapsed: %s seconds',cronEnd,elapsed);
	    	});
    	}
    });
};

// CRON TO SEND EMAILS **/
var taskFetchEarnings = cron.schedule('35 4 * * *', fetchEarnings, true);
var taskSendEmails = cron.schedule('45 4 * * *', sendEmails, true);

 


/** DATABASE and FINAL SERVER INIT **/ 
var database_url = process.env.DATABASE_URL;
//mongoose.connect(database_url,{ config: { autoIndex: false } });
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

module.exports = app;