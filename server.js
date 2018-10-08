var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var cron = require('node-cron');
var nodemailer =require ('nodemailer');
var mongoose = require('mongoose');
var moment = require ('moment');
const util = require ('util');
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
var awin = require('./providers/awin');

var Income = require('./models/income');
var IncomeByDay = require('./models/incomebyday');
var AnalyticsModel = require('./models/analytics');
var Credentials = require('./models/credentials');



var getIncomeProviders = function (){  
	return [
		{source:'Adsense',dbname:'adsense',provider:adsense,credentials_model:Credentials.Adsense,income_model:Income.Adsense},
		{source:'TradeTracker',dbname:'tradetracker',provider:tradetracker,credentials_model:Credentials.Tradetracker,income_model:Income.Tradetracker},
		{source:'Moolineo',dbname:'moolineo',provider:moolineo,credentials_model:Credentials.Moolineo,income_model:Income.Moolineo},
		{source:'Loonea',dbname:'loonea',provider:loonea,credentials_model:Credentials.Loonea,income_model:Income.Loonea},
		{source:'Thinkaction',dbname:'thinkaction',provider:thinkaction,credentials_model:Credentials.Thinkaction,income_model:Income.Thinkaction},
		{source:'DGMax',dbname:'dgmax',provider:dgmax,credentials_model:Credentials.Dgmax,income_model:Income.Dgmax},
		{source:'Daisycon',dbname:'daisycon',provider:daisycon,credentials_model:Credentials.Daisycon,income_model:Income.Daisycon},
		{source:'GamblingAffiliation',dbname:'gamblingaffiliation',provider:gamblingaffiliation,credentials_model:Credentials.GamblingAffiliation,income_model:Income.GamblingAffiliation},
		{source:'Awin',dbname:'awin',provider:awin,credentials_model:Credentials.Awin,income_model:Income.Awin}
	]
};

var User = require('./models/user');

var async = require ('async');




app.set('port', process.env.PORT || 3000);

app.set('views', './views');
app.set('view engine', 'pug');

app.locals.moment = require('moment');

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
app.use('/awin',awin.router);

app.get('/', function (req, res) {
  var homepageHtml = 
  		"<div>" + 
  		"<h1>Welcome to Sidemetrics 1.2.0</h1>" + 
  		"<h2>MAIN MENU</h2>" +   		
  		"<ul>" + 
		"<li><a href='/dashboard'>DASHBOARD (NEW)</a></li>"+  
		"<li><a href='/cron/fetchEarnings'>CRON fetchEarnings</a></li>"+  
		"<li><a href='/cron/fetchEarningsToday'>CRON fetchEarningsToday</a></li>"+ 		
		"<li><a href='/cron/sendEmails'>CRON sendEmails (NEW)</a></li>"+ 
		"<li><a href='/dbscript'>Transfer from old to new DB</a></li>"+  
		"<li><a href='/findhighestincomeday'>Day with highest income</a></li>"+ 
		"<li><a href='/findhighestincomemonth'>Month with highest income</a></li>"+  
		"<li><a href='/finddaywithmostvisits'>Day with most visits</a></li>"+  
		"<li><a href='/findorderhighestincomeday'>Classement de ce jour par rapport aux autres jours</a></li>"+  
  		"</ul>" +  		
  		"<h2>TESTING</h2>" + 
  		"<ul>"+  		
  		"<li>AWin normal: <a href='/awin/earnings/nicdo77'>nicdo77 (yesterday)</a></li>" + 
  		"<li>Awin 1 months: <a href='/awin/historic/nicdo77/1'>nicdo77</a></li>" + 
  		"</ul>" +  		
  		"<h2>Working - Normal</h2>" + 
  		"<ul>"+
  		"<li>Adsense connect: <a href='/adsense/connect/nicdo77'>nicdo77</a></li>"+  		
  		"<li>Adsense earnings: <a href='/adsense/earnings/nicdo77'>nicdo77 (yesterday)</a> - <a href='/adsense/earnings/jimena123'>jimena123 (yesterday)</a></li>"+
  		"<li>Analytics connect: <a href='/analytics/connect/nicdo77'>nicdo77</a> - <a href='/analytics/connect/jimena123'>jimena123</a></li>"+  		
  		"<li>Analytics user sessions: <a href='/analytics/usersessions/nicdo77'>nicdo77 (yesterday)</a> - <a href='/analytics/usersessions/jimena123'>jimena123 (yesterday)</a></li>"+
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
  		"<li>Analytics 1 months: <a href='/analytics/historic/nicdo77/1'>nicdo77</a> - <a href='/analytics/historic/jimena123/1'>jimena123</a></li>" + 
  		"<li>Thinkaction 6 months: <a href='/thinkaction/historic/nicdo77/6'>nicdo77</a> - <a href='/thinkaction/historic/jimena123/6'>jimena123</a></li>" + 
  		"<li>Daisycon 6 months: <a href='/daisycon/historic/nicdo77/6'>nicdo77</a> - <a href='/daisycon/historic/jimena123/6'>jimena123</a></li>" + 
  		"<li>Tradetracker 6 months: <a href='/tradetracker/historic/nicdo77/6'>nicdo77</a> - <a href='/tradetracker/historic/jimena123/6'>jimena123</a></li>" + 
  		"<li>Gambling Affiliation 6 months: <a href='/gamblingaffiliation/historic/nicdo77/6'>nicdo77</a> - <a href='/gamblingaffiliation/historic/jimena123/6'>jimena123</a></li>" + 
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
	console.log("CRON SEND EMAILS NEW - MANUAL LAUNCH");
	sendEmails();
	res.send('ONGOING, check logs');
});


app.get('/cron/sendEmailsOld',function(req,res){
	console.log("CRON SEND EMAILS - MANUAL LAUNCH");
	sendEmailsOld();
	res.send('ONGOING, check logs');
});

app.get('/findhighestincomemonth', function(req,res){
	console.log("looking for highest income month");

	User.findAllUsers(function(err,users){
    	if (err) { 
    		console.log("Error while retrieving all users : ",err);
    	} else {

    		users.forEach(async function(user){
    			var username = user.username;
    			var userid = user._id;
    			var result = await IncomeByDay.findMonthWithHighestIncome(userid,username);
    		});
    	}
    });



	res.send('ONGOING, check logs');

});


app.get('/finddaywithmostvisits', function(req,res){
	console.log("looking for stuff");

	User.findAllUsers(function(err,users){
    	if (err) { 
    		console.log("Error while retrieving all users : ",err);
    	} else {

    		users.forEach(async function(user){
    			var username = user.username;
    			var userid = user._id;
    			var result = await AnalyticsModel.findDayWithMostVisits(userid,username);
    		});
    	}
    });

	res.send('ONGOING, check logs');

});

app.get('/findorderhighestincomeday', function(req,res){
	console.log("looking for highest income day");

	var yesterday = moment().subtract(1,'days');


	User.findAllUsers(function(err,users){
    	if (err) { 
    		console.log("Error while retrieving all users : ",err);
    	} else {

    		users.forEach(async function(user){
    			var username = user.username;
    			var userid = user._id;
    			var days = await IncomeByDay.orderDaysByHighestIncome(userid,username);
    			var positionIncome = 0;
    			days.forEach(function(day,index){
    				//console.log('day %s - date %s - income %s',JSON.stringify(day),day._id.date,day.total);
    				if (moment(day._id.date).isSame(yesterday,'day')){
    					console.log(`[${username}] Aujourd'hui (${yesterday.format('YYYY-MM-DD')}) c'est le ${index+1}º meilleur jour en terme de gains (${day.total})`);
    					positionIncome = index + 1;
    				}
    			});
    		});
    	}
    });



	res.send('ONGOING, check logs');


});


app.get('/findhighestincomeday', function(req,res){
	console.log("looking for highest income day");

	User.findAllUsers(function(err,users){
    	if (err) { 
    		console.log("Error while retrieving all users : ",err);
    	} else {

    		users.forEach(async function(user){
    			var username = user.username;
    			var userid = user._id;
    			var result = await IncomeByDay.findDayWithHighestIncome(userid,username);
    		});
    	}
    });



	res.send('ONGOING, check logs');


});

app.get('/dbscript',function(req,res){
	console.log("MOVING OLD DB TO NEW DB");
	

	var incomeproviders = getIncomeProviders();

	incomeproviders.forEach(function (incomeprovider){

		incomeprovider.income_model.find({},function(err,incomes){
			console.log("%s - got %s",incomeprovider.dbname,incomes.length);
			incomes.forEach(function (income){
				IncomeByDay.IncomeByDay.findOneAndUpdate(
					{
						user_id:income.user_id,
						date:income.date,
						source:incomeprovider.dbname
					},
					{
						income:income.income
					}, {upsert:true},function(err){
						if (err){
							console.log('%s - dbscript - Error while saving %s earnings (%s,%s) into DB. Error : ',incomeprovider.dbname,incomeprovider.dbname,income.date,income.income,err.errmsg);							
						} else {
							console.log('%s - dbscript - Saved %s earnings in DB:',incomeprovider.dbname,incomeprovider.dbname,income.date,income.income);
						}
					});

			});
		});

	});


	res.send('ONGOING, check logs');
});
const fetchEarnings = function(isToday){

	// CRON STARTED
    var cronBegin = moment();
    console.log('CRON FETCH EARNINGS - BEGIN at',cronBegin);

    var day = moment().subtract(1,'days'); 
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
				
				async.eachSeries(incomeproviders,async function(incomeprovider/*,callbackSmallEach*/){
					var incomesource = incomeprovider.source;

					// first check if the user uses that income source
					var hasCredentials = await Credentials.userHasCredentials(user._id,username,incomesource,incomeprovider.credentials_model);
					if (hasCredentials){	
						//console.log("[%s#%s] CRON FETCH EARNINGS - Before call getEarnings",username,incomesource);									
						try {
							//console.log('[%s#%s] before promisify',username,incomesource);
							const getEarningsPromise = util.promisify(incomeprovider.provider.getEarnings);
							//console.log('[%s#%s] after promisify - before wait',username,incomesource);
							var result = await getEarningsPromise(user._id,username,day); 
							//console.log('[%s#%s] after await',username,incomesource);
							var dayTotal = result;
							//console.log("[%s#%s] CRON FETCH EARNINGS - Back from getEarnings for day %s with earnings: ",username,incomesource,day,dayTotal);					
								
						} catch (err) {
							console.error("[%s#%s] CRON FETCH EARNINGS - Back from getEarnings with error: ",username,incomesource,err);
						}							
						//console.log("[%s#%s] CRON FETCH EARNINGS - After call getEarnings",username,incomesource);				
					}
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
			sessions.period = 0;
			result.forEach(function(item){

				var itemDate = moment(item.date).format('YYYY-MM-DD');
				var itemSessions = item.sessions;
				sessions.days[itemDate] = new Number(itemSessions);
				sessions.period += new Number(itemSessions);
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
var getUserEarningsByIncome = async function(user,begin,end,incomeprovider){
	var username = user.username;
	console.log('[%s] begin getUserEarningsByIncome',username);
	
	var incomesource = incomeprovider.source;
	var earnings = {days : [],period:0,month:0};

	// first check if the user uses that income source
	var hasCredentials = await Credentials.userHasCredentials(user._id,username,incomesource,incomeprovider.credentials_model);
	if (!hasCredentials){
		return earnings;
	} else {

		// the user does use that income source.

		// ONCE getEarnings only retrieves the earnings from DB (instead of also launching the 3rd party call)
		// - getEarnings and getMonthEarnings could be done in parallel
		// - and also, probably, getEarnings can retrieve earnings for day, month, year... all in one call. No?
		
		// recupère les daily earnings pour cet incomesource entre les dates 'begin' et les dates 'end'
		
		try {
			var result = await IncomeByDay.getDayEarnings(user._id,username,begin,end,incomeprovider.dbname);

			//console.log("[%s#%s] server.js - Back from getDayEarnings between %s and %s",username,incomesource,begin,end);		

			result.forEach(function(item){
				var itemDate = moment(item.date).format('YYYY-MM-DD');
				var itemEarning = item.income;
				earnings.days[itemDate] = new Number(itemEarning);	
				earnings.period += new Number(itemEarning);	
			});	
		} catch (err){
			console.log("[%s#%s] server.js - Back from getDayEarnings with error: ",username,incomesource,err);
			throw err;
		}

		// calcule le total pour le mois en cours
		try {
			var result = await IncomeByDay.getMonthEarnings(user._id,username,end,incomeprovider.dbname);

			//console.log("[%s#%s] server.js - Back from getMonthEarnings for day %s with earnings: ",username,incomesource,end,result);		
			earnings.month = new Number(result);
			return earnings;

		} catch (err){
			console.log("[%s#%s] server.js - Back from getMonthEarnings with error: ",username,incomesource,err);
			throw err;
		}

	}
};

app.get('/dashboard',async function(req,res){

	console.log('ABOUT TO SHOW DASHBOARD NEW FUCK YEAH !!!!!');

	var today = moment();
	var yesterday = moment().subtract(1,'days');
    var dashboardBeginDate = moment().subtract(8,'days'); 

    var yesterdayMinus7Days = moment(yesterday).subtract(7,'days');
    var beginMinus7Days = moment(dashboardBeginDate).subtract(7,'days');

    var monthname = yesterday.format('MMMM');

    /*var daysArray = [];
    var tempday = moment(dashboardBeginDate);
    while (tempday.isBefore(today)) {
    	daysArray.push(tempday.format('YYYY-MM-DD'));
    	tempday.add(1,'days');
    } */

    var sameDayLastMonth = moment(yesterday).subtract(1,'months');
    var firstDayLastMonth = moment(sameDayLastMonth).startOf('month');

   /* console.log(' ');
    console.log('#####################################');
    console.log('      RESULT THIS WEEK');
    console.log('#####################################');
    console.log(' ');*/
    var result = await computeEarnings(dashboardBeginDate,yesterday);

	/*console.log(' ');
    console.log('#####################################');
    console.log('      RESULT ONE WEEK AGO');
    console.log('#####################################');
    console.log(' ');   */
    var oneweekagoresult = await computeEarnings(beginMinus7Days,yesterdayMinus7Days);

	/*console.log(' ');
    console.log('#####################################');
    console.log('      RESULT LAST MONTH');
    console.log('#####################################');
    console.log(' ');   */
    var lastmonthresult = await computeEarnings(firstDayLastMonth,sameDayLastMonth);

    console.log('BEFORE CALLING EXTRAMETRICS');
   
    const usersAsync = util.promisify(User.findAllUsers);
	var users;
	try {
		users = await usersAsync();
	} catch (err){
		console.log("Error while retrieving all users : ",err);
	}

	var userPromises = [];

	users.forEach(function(user){
		const userPromise = computeUserExtraMetrics(user);
		userPromises.push(userPromise); 
	});
	var userextrametrics = await Promise.all(userPromises);

	var highestIncomeMonthByUser = [];
	var highestIncomeDayByUser = [];
	var positionIncomeByUser = [];
	var positionVisitsByUser = [];
	var highestVisitsDayByUser = [];

	userextrametrics.forEach(function (extrametrics){
		var username = extrametrics.username;
		highestIncomeMonthByUser[username] = extrametrics.highestIncomeMonthByUser;
		highestIncomeDayByUser[username] = extrametrics.highestIncomeDayByUser;
		positionIncomeByUser[username] = extrametrics.positionIncomeByUser;
		positionVisitsByUser[username] = extrametrics.positionVisitsByUser;
		highestVisitsDayByUser[username] = extrametrics.highestVisitsDayByUser;
	});

	console.log('AFTER CALLING EXTRAMETRICS');

	console.log('###### ABOUT TO DISPLAY DASHBOARD #####');
    //console.log('thisweek result is',result);
    //console.log('oneweekago - from %s to %s',beginMinus7Days,yesterdayMinus7Days);
    //console.log('oneweekago is',oneweekagoresult);
    //console.log('lastmonth is',lastmonthresult);
    res.render('dashboard', { 
		result : result,
		oneweekago : oneweekagoresult,
		lastmonth: lastmonthresult,
		sameDayLastMonth : sameDayLastMonth,
		highestIncomeMonthByUser : highestIncomeMonthByUser,
		highestIncomeDayByUser: highestIncomeDayByUser,
		positionIncomeByUser: positionIncomeByUser,
		positionVisitsByUser: positionVisitsByUser,
		highestVisitsDayByUser: highestVisitsDayByUser
	});
	

    
});


const sendEmails = async function() {
	// CRON STARTED
    var cronBegin = moment();
    console.log('CRON SEND EMAILS - BEGIN at',cronBegin);


    var yesterday = moment().subtract(1,'days'); 
    var niceYesterday = yesterday.format('dddd DD MMMM YYYY');
    var monthname = yesterday.format('MMMM');

	var yesterdayMinus7Days = moment(yesterday).subtract(7,'days');
	var niceYesterdayMinus7Days = 'el ' + yesterdayMinus7Days.format('dddd') + ' pasado';
	var sameDayLastMonth = moment(yesterday).subtract(1,'months');
	var niceDayLastMonth = sameDayLastMonth.format('dddd DD MMMM');
    var firstDayLastMonth = moment(sameDayLastMonth).startOf('month');


    var incomeproviders = getIncomeProviders();	

    console.log('CRON SEND EMAILS FOR DAY',yesterday);
    // get all users

    var result = await computeEarnings(yesterday,yesterday);
    var oneweekagoresult = await computeEarnings(yesterdayMinus7Days,yesterdayMinus7Days);
    var lastmonthresult = await computeEarnings(firstDayLastMonth,sameDayLastMonth);

	console.log('BEFORE CALLING EXTRAMETRICS');
   
    const usersAsync = util.promisify(User.findAllUsers);
	var users;
	try {
		users = await usersAsync();
	} catch (err){
		console.log("Error while retrieving all users : ",err);
	}

	var userPromises = [];

	users.forEach(function(user){
		const userPromise = computeUserExtraMetrics(user);
		userPromises.push(userPromise); 
	});
	var userextrametrics = await Promise.all(userPromises);

	var highestIncomeMonthByUser = [];
	var highestIncomeDayByUser = [];
	var positionIncomeByUser = [];
	var positionVisitsByUser = [];
	var highestVisitsDayByUser = [];

	userextrametrics.forEach(function (extrametrics){
		var username = extrametrics.username;
		highestIncomeMonthByUser[username] = extrametrics.highestIncomeMonthByUser;
		highestIncomeDayByUser[username] = extrametrics.highestIncomeDayByUser;
		positionIncomeByUser[username] = extrametrics.positionIncomeByUser;
		positionVisitsByUser[username] = extrametrics.positionVisitsByUser;
		highestVisitsDayByUser[username] = extrametrics.highestVisitsDayByUser;
	});

	console.log('AFTER CALLING EXTRAMETRICS');


    console.log('###### ABOUT TO PREPARE EMAIL #####');
    console.log('Result is',result);
   
    result.forEach(function (userResult,userIndex){
    	var username = userResult.username;
    	console.log('[%s] about to send email to',username,userResult.email);

    	// contenu HTML
    	var mailHtml = '';

    	mailHtml += `Querid@ ${username}, aquí va el detalle de lo que has ganado ayer ${niceYesterday} [<i>y la comparativa con el mes pasado hasta el ${niceDayLastMonth}</i>] `;

		mailHtml += `<p><h3>Detalles ayer</h3> `;
    	for (var i = 0; i < incomeproviders.length; i++) {			
			var incomeprovider = incomeproviders[i];
			var incomesource = incomeprovider.source;

			var earnings = userResult.earnings[incomesource];

			if ( earnings && earnings.days && earnings.month && earnings.days[yesterday.format('YYYY-MM-DD')]){
				// calculer différence
				var earningsLastMonthArray = lastmonthresult[userIndex].earnings[incomesource];
				var earningsLastPeriod = 0;
				var percentage = 0;
				var percentageString = '0 %';
				var percentageColor = 'black';

				if ( earningsLastMonthArray && earningsLastMonthArray.month ){
					earningsLastPeriod = earningsLastMonthArray.period;
					percentage = ((earnings.month - earningsLastPeriod)/(earningsLastPeriod)*100).toFixed(0);
					percentageString = (percentage > 0) ? '+' + percentage + ' %': percentage + ' %';
					percentageColor = (percentage > 0)? 'green':'red';
				} 

				// display
				mailHtml += `<b>${incomesource}</b> : ${earnings.days[yesterday.format('YYYY-MM-DD')].toFixed(2)} - \
					<i>Total este mes : ${earnings.month.toFixed(2)} € `;
				if (earningsLastPeriod > 0) {
					mailHtml += `[<span style="color:${percentageColor}">${percentageString} (${earningsLastPeriod.toFixed(2)} €)</span>]</i><br>`;
				} else {
					mailHtml += `[<span>0 € el mes pasado</span>]</i><br>`;
				}
			}
		}
		mailHtml += `</p>`;

		var totalByDaysToday = userResult.totalByDays[yesterday.format('YYYY-MM-DD')].toFixed(2);
		var totalByDays7daysago = 0;
		var percentageTotalByDays = 0;
		var percentageTotalByDaysString = '0 %';
		var percentageTotalByDaysColor = 'black';
		
		if (oneweekagoresult[userIndex].totalByDays && oneweekagoresult[userIndex].totalByDays[yesterdayMinus7Days.format('YYYY-MM-DD')]){
			totalByDays7daysago = oneweekagoresult[userIndex].totalByDays[yesterdayMinus7Days.format('YYYY-MM-DD')].toFixed(2);
			percentageTotalByDays = (((totalByDaysToday - totalByDays7daysago)/totalByDays7daysago)*100).toFixed(0);
			percentageTotalByDaysString = (percentageTotalByDays > 0) ? '+' + percentageTotalByDays + ' %': percentageTotalByDays + ' %';
			percentageTotalByDaysColor = (percentageTotalByDays > 0)? 'green':'red';
		}

		var totalVisitsToday = userResult.sessions.days[yesterday.format('YYYY-MM-DD')];
		var totalVisits7daysago = 0;
		var percentageTotalVisits = 0;
		var percentageTotalVisitsString = '0 %';
		var percentageTotalVisitsColor = 'black';
		
		if (oneweekagoresult[userIndex].sessions.days && oneweekagoresult[userIndex].sessions.days[yesterdayMinus7Days.format('YYYY-MM-DD')]){
			totalVisits7daysago = oneweekagoresult[userIndex].sessions.days[yesterdayMinus7Days.format('YYYY-MM-DD')];
			percentageTotalVisits = (((totalVisitsToday - totalVisits7daysago)/totalVisits7daysago)*100).toFixed(0);
			percentageTotalVisitsString = (percentageTotalVisits > 0) ? '+' + percentageTotalVisits + ' %': percentageTotalVisits + ' %';
			percentageTotalVisitsColor = (percentageTotalVisits > 0)? 'green':'red';
		}

		var epvToday = userResult.earningsPerVisitorDays[yesterday.format('YYYY-MM-DD')].toFixed(2);
		var epv7daysago = 0;
		var percentageTotalEpv = 0;
		var percentageTotalEpvString = '0 %';
		var percentageTotalEpvColor = 'black';
		
		if (oneweekagoresult[userIndex].earningsPerVisitorDays && oneweekagoresult[userIndex].earningsPerVisitorDays[yesterdayMinus7Days.format('YYYY-MM-DD')]){
			epv7daysago = oneweekagoresult[userIndex].earningsPerVisitorDays[yesterdayMinus7Days.format('YYYY-MM-DD')].toFixed(2);
			percentageTotalEpv = (((epvToday - epv7daysago)/epv7daysago)*100).toFixed(0);
			percentageTotalEpvString = (percentageTotalEpv > 0) ? '+' + percentageTotalEpv + ' %': percentageTotalEpv + ' %';
			percentageTotalEpvColor = (percentageTotalEpv > 0)? 'green':'red';
		}

		var positionIncome = positionIncomeByUser[username].position;
		var positionIncomeColor = '';
		if (positionIncome < 11) {
			positionIncomeColor = 'green';
		}
		var positionVisits = positionVisitsByUser[username].position;
		var positionVisitsColor = '';
		if (positionVisits < 11) {
			positionVisitsColor = 'green';
		}

		mailHtml += ` \ 
					<p><h3>Resumén de ayer ${niceYesterday} [<i>comparativa con ${niceYesterdayMinus7Days}</i>] </h3> \
						Ganancias : \
								<ul> \
									<li>Ayer: <b>${totalByDaysToday} €</b> [<i><span style="color:${percentageTotalByDaysColor}">${percentageTotalByDaysString} (${totalByDays7daysago} €)</span></i>]</li> \
									<li>Posición: <span style="color:${positionIncomeColor}"><b>${positionIncome}</b>º</span> (<i>Mejor día: ${highestIncomeDayByUser[username].date} con ${highestIncomeDayByUser[username].income} € ganados)</i></li> \
								</ul> \
						Visitas : \
			          			<ul> \
			          				<li>Ayer: <b>${totalVisitsToday}</b> [<i><span style="color:${percentageTotalVisitsColor}">${percentageTotalVisitsString} (${totalVisits7daysago})</span></i>]</li> \
			          				<li>Posición: <span style="color:${positionVisitsColor}"><b>${positionVisits}</b>º</span> (<i>Mejor día: ${highestVisitsDayByUser[username].date} con ${highestVisitsDayByUser[username].sessions} visitas)</i></li> \			          		
			          			</ul> \
			          	Ganancias por visitas : <b>${epvToday} cts€</b> [<i><span style="color:${percentageTotalEpvColor}">${percentageTotalEpvString} (${epv7daysago} cts€)</span></i>]</li> \
			          	
		       		</p>`;

		var totalEarningsByMonth = userResult.totalMonth.toFixed(2);
		var totalEarningsByMonthLastPeriod = 0;
		var percentageTotalEarningsByMonth = 0;
		var percentageTotalEarningsByMonthString = '0 %';
		var percentageTotalEarningsByMonthColor = 'black';

		if (lastmonthresult[userIndex].totalPeriod){
			totalEarningsByMonthLastPeriod = lastmonthresult[userIndex].totalPeriod.toFixed(2);
			percentageTotalEarningsByMonth = (((totalEarningsByMonth - totalEarningsByMonthLastPeriod)/totalEarningsByMonthLastPeriod)*100).toFixed(0);
			percentageTotalEarningsByMonthString = (percentageTotalEarningsByMonth > 0) ? '+' + percentageTotalEarningsByMonth + ' %': percentageTotalEarningsByMonth + ' %';
			percentageTotalEarningsByMonthColor = (percentageTotalEarningsByMonth > 0)? 'green':'red';
		}

		var totalVisitsByMonth = userResult.sessions.month;
		var totalVisitsByMonthLastPeriod = 0;
		var percentageTotalVisitsByMonth = 0;
		var percentageTotalVisitsByMonthString = '0 %';
		var percentageTotalVisitsByMonthColor = 'black';

		if (lastmonthresult[userIndex].sessions){
			totalVisitsByMonthLastPeriod = lastmonthresult[userIndex].sessions.period;
			percentageTotalVisitsByMonth = (((totalVisitsByMonth - totalVisitsByMonthLastPeriod)/totalVisitsByMonthLastPeriod)*100).toFixed(0);
			percentageTotalVisitsByMonthString = (percentageTotalVisitsByMonth > 0) ? '+' + percentageTotalVisitsByMonth + ' %': percentageTotalVisitsByMonth + ' %';
			percentageTotalVisitsByMonthColor = (percentageTotalVisitsByMonth > 0)? 'green':'red';
		}

		var epvByMonth = userResult.earningsPerVisitorMonth.toFixed(2);
		var epvByMonthLastPeriod = 0;
		var percentageEpvByMonth = 0;
		var percentageEpvByMonthString = '0 %';
		var percentageEpvByMonthColor = 'black';

		if (lastmonthresult[userIndex].earningsPerVisitorPeriod){
			epvByMonthLastPeriod = lastmonthresult[userIndex].earningsPerVisitorPeriod.toFixed(2);
			percentageEpvByMonth = (((epvByMonth - epvByMonthLastPeriod)/epvByMonthLastPeriod)*100).toFixed(0);
			percentageEpvByMonthString = (percentageEpvByMonth > 0) ? '+' + percentageEpvByMonth + ' %': percentageEpvByMonth + ' %';
			percentageEpvByMonthColor = (percentageEpvByMonth > 0)? 'green':'red';
		}

		mailHtml += ` \
		        	<p><h3>Resumén del mes de ${monthname} [<i>comparativa con el mes pasado hasta el ${niceDayLastMonth}</i>] </h3> \
			          	Ganancias : <b>${totalEarningsByMonth} €</b> [<i><span style="color:${percentageTotalEarningsByMonthColor}">${percentageTotalEarningsByMonthString} (${totalEarningsByMonthLastPeriod} €)</span></i>] \
			          	<br/> \
			          	Visitas : <b>${totalVisitsByMonth}</b> [<i><span style="color:${percentageTotalVisitsByMonthColor}">${percentageTotalVisitsByMonthString} (${totalVisitsByMonthLastPeriod})</span></i>] \
			          	<br/> \
			          	Ganancias por visitas : <b>${epvByMonth} cts€</b> [<i><span style="color:${percentageEpvByMonthColor}">${percentageEpvByMonthString} (${epvByMonthLastPeriod} cts€)</span></i>] \
			          	<br/> \
			          	<i>MEJOR MES : <b>${highestIncomeMonthByUser[username].month}</b> (con ${highestIncomeMonthByUser[username].income} € ganados)</i> \			          	
		          	</p> \ 
		          	`;
		console.log('[%s] Mail about to be sent ==> ',username,mailHtml);
		// setup email data with unicode symbols
		var mailOptions = {
		    from: '"Sidemetrics NEW 👩🏽🐷📈🚀❤️" <no-reply@sidemetrics.com>', // sender address
		    to: userResult.email, 
		    subject: 'Ganancias v6 del dia ' + niceYesterday, // Subject line
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
    });

	var cronEnd = moment();    		
	var elapsed = cronEnd.diff(cronBegin,'s');
	console.log('CRON SEND EMAILS - END at %s. Time elapsed: %s seconds',cronEnd,elapsed);

}

var computeUserExtraMetrics = async function(user){


    var yesterday = moment().subtract(1,'days');

	var username = user.username;
	console.log('[%s] CALCULATING EXTRA METRICS',username);
	
	var userid = user._id;

	var highestIncomeMonth = await IncomeByDay.findMonthWithHighestIncome(userid,username);
	//console.log('[%s] highestIncomeMonth :',username,highestIncomeMonth);
	var month = moment(highestIncomeMonth._id.month+"-"+highestIncomeMonth._id.year,"M-YYYY").format('MMMM YYYY');
	var monthincome = highestIncomeMonth.total;
	console.log('[%s] highestIncomeMonth : month : %s - income : %s',username,month,monthincome);
	var highestIncomeMonthByUser = {month : month,income:monthincome};


	var highestIncomeDay = await  IncomeByDay.findDayWithHighestIncome(userid,username);
	//console.log('[%s] highestIncomeDay :',username,highestIncomeDay);
	var date = moment(highestIncomeDay._id.date).format('dddd DD MMMM YYYY');
	var dayincome = highestIncomeDay.total;
	console.log('[%s] highestIncomeDay : day : %s - income : %s',username,date,dayincome);
	var highestIncomeDayByUser = {date : date,income:dayincome};


	var daysWithHighestIncome = await IncomeByDay.orderDaysByHighestIncome(userid,username);
	var positionIncome = 0;
	var totalIncomeThatDay = 0;
	await daysWithHighestIncome.forEach(async function(day,index){
		//console.log('day %s - date %s - income %s',JSON.stringify(day),day._id.date,day.total);
		if (moment(day._id.date).isSame(yesterday,'day')){
			positionIncome = index + 1;
			totalIncomeThatDay = day.total;
		}
	});
	console.log('[%s] Hier (%s) c\'est le %sº meilleur jour en terme de gains (%s)',username,yesterday.format('dddd DD MMMM YYYY'),positionIncome,totalIncomeThatDay);
	var positionIncomeByUser = {position:positionIncome,income:totalIncomeThatDay};

	var highestVisitsDay = await AnalyticsModel.findDayWithMostVisits(userid,username);
	//console.log('[%s] highestVisitsDay :',username,highestVisitsDay);
	var date = moment(highestVisitsDay.date).format('dddd DD MMMM YYYY');
	var dayvisits = highestVisitsDay.sessions;
	console.log('[%s] highestVisitsDay : day : %s - income : %s',username,date,dayvisits);
	var highestVisitsDayByUser = {date:date,sessions:dayvisits};


	var daysWithMostVisits = await AnalyticsModel.orderDaysWithMostVisits(userid,username);
	var positionVisits = 0;
	var totalVisitsThatDay = 0;
	await daysWithMostVisits.forEach(async function(day,index){
		//console.log('day %s - date %s - income %s',JSON.stringify(day),day.date,day.sessions);
		if (moment(day.date).isSame(yesterday,'day')){
			positionVisits = index + 1;
			totalVisitsThatDay = day.sessions;
		}
	});
	console.log('[%s] Hier (%s) c\'est le %sº meilleur jour en terme de visites (%s)',username,yesterday.format('dddd DD MMMM YYYY'),positionVisits,totalVisitsThatDay);
	var positionVisitsByUser = {position:positionVisits,visits:totalVisitsThatDay};

	console.log('[%s] END CALCULATING EXTRA METRICS BEFORE DASHBOARD',username);
	
	
	console.log('[%s] About to return from computeUserExtraMetrics',username);
	
	return {
		username: username,
		highestIncomeMonthByUser : highestIncomeMonthByUser,
		highestIncomeDayByUser : highestIncomeDayByUser,
		positionIncomeByUser : positionIncomeByUser,
		positionVisitsByUser : positionVisitsByUser,
		highestVisitsDayByUser : highestVisitsDayByUser,
	}

}

var computeUserEarnings = async function(from,to,user){

	var daysArray = [];
    var tempday = moment(from);
    var username = user.username;

    //console.log('[%s] computeUserEarnings - tempday %s - to %s',username,tempday,to);
    while (tempday.isSameOrBefore(to,'day')) {
    	daysArray.push(tempday.format('YYYY-MM-DD'));
    	//console.log('[%s] computeUserEarnings - ADDED tempday %s',username,tempday);
    	tempday.add(1,'days');
    } 


	

	//console.log('[%s] computeUserEarnings - from %s - to %s',username,from,to);
 	//console.log('[%s] computeUserEarnings - daysArray',username,daysArray);

	// sessions info
	var sessions = [];
	const sessionsAsync = util.promisify(getUserSessions);
	await sessionsAsync(user,from,to,sessions);
	console.log('[%s] callback from getUserSessions',username);

	// earnings info
	var earnings = [];
	// totalByDays : tableau avec la liste des gains totaux par jour, pour chaque jour. Utilisé dans la dernière ligne du tableau
	var totalByDays = [];
	// totalMonth: total des revenus sur le mois, utilisé pour la cellule en ba à droite
	var totalMonth = 0;
	// earnings[incomesource].days nous donne accès aux gains pour un income source donné, pour chaque jour (cellule du tableau)
	// earnings[incomesource].month nous donne le gain pour ce incomesource sur le mois entier (derni` ligne)
	// totalPeriod: total des revenus sur la période demandée
	var totalPeriod = 0;
	
	
	var incomeproviders = getIncomeProviders();
	//console.log('##### [%s] incomeproviders.forEach commencé',username);

	var providerPromises = [];
	incomeproviders.forEach(function(incomeprovider){
		const providerPromise =  computeUserProviderEarning(from,to,user,incomeprovider);//,earnings,totalByDays,totalMonth);
		providerPromises.push(providerPromise);
	});
	
	var results = await Promise.all(providerPromises);
	results.forEach(function(result){
		//console.log('result resolve Promise computeUserProviderEarning:',result);

		if (result){
			earnings[result.incomesource] = result.earned;
			var earnedByDays = result.earned.days;
			daysArray.forEach(function (day){
				var earnedByDay = 0;
				if (earnedByDays[day]){
					// car earnedByDays[day] peut être vide / undefined si y a eu aucun income registered en DB pour ce jour
					earnedByDay = earnedByDays[day];
					totalPeriod += earnedByDay;
				}
				if (!totalByDays[day]){
					totalByDays[day] = earnedByDay;							
				} else {
					totalByDays[day] += earnedByDay;
				}

			});
			totalMonth += result.earned.month;
			return true;
		}
	});

	//console.log('##### [%s] incomeproviders.forEach terminé',username);

	// sessions and earnings per visitor
	// earningsPerVisitorDays : tableau avec la liste des earnings per visitor, classé par day
	var earningsPerVisitorDays = [];//(totalToday*100 / sessionsYesterday).toFixed(2);
	var earningsPerVisitorMonth = (totalMonth*100 / sessions.month);
	var earningsPerVisitorPeriod = (totalPeriod * 100 / sessions.period);

	daysArray.forEach(function(day){
		if (sessions.days[day]){
			earningsPerVisitorDays[day] = totalByDays[day]*100/sessions.days[day];
		} else {
			earningsPerVisitorDays[day] = 0;
		}
	});

	var userObject = {
		days:daysArray,
		username:username,
		email:user.email,
		sessions:sessions,
		earnings:earnings,
		totalByDays:totalByDays,
		totalMonth:totalMonth,
		totalPeriod:totalPeriod,
		earningsPerVisitorDays:earningsPerVisitorDays,
		earningsPerVisitorMonth:earningsPerVisitorMonth,
		earningsPerVisitorPeriod:earningsPerVisitorPeriod

	};

	

	/*console.log('[%s] Earnings : ',username,earnings);
	console.log('[%s] totalByDays : ',username,totalByDays);
	console.log('[%s] totalMonth : ',username,totalMonth);
	console.log('[%s] earningsPerVisitorDays : ',username,earningsPerVisitorDays);
	console.log('[%s] earningsPerVisitorMonth : ',username,earningsPerVisitorMonth);*/
	return userObject;


	console.log('###### FINISHING ALL PROVIDERS FOR THAT USER');
}

var computeUserProviderEarning = async function(from,to,user,incomeprovider/*,earnings,totalByDays,totalMonth*/){

	/*var daysArray = [];
    var tempday = moment(from);
    while (tempday.isBefore(to)) {
    	daysArray.push(tempday.format('YYYY-MM-DD'));
    	tempday.add(1,'days');
    } */

	var username = user.username;
	var incomesource = incomeprovider.source;
	//console.log('##### [%s#%s] computeUserProviderEarning commencé pour cette source',username,incomesource);			
	try {
		//console.log('##### [%s#%s] computeUserProviderEarning avant await getUserEarningsByIncome',username,incomesource);
		var earned = await getUserEarningsByIncome(user,from,to,incomeprovider);
		//console.log('##### [%s#%s] computeUserProviderEarning après await getUserEarningsByIncome - résultat: ',username,incomesource,earned);						
		//earnings[incomesource] = earned;										
		//callbackSmallEach(null);			
		return {incomesource:incomesource,earned:earned};
		

		
	} catch (err){
		console.log('[%s#%s] error during getUserEarningsByIncome',username,incomesource,err);
		throw err;
	}
}

var computeEarnings = async function (from,to) {
	


	const usersAsync = util.promisify(User.findAllUsers);
	var users;
	try {
		users = await usersAsync();
	} catch (err){
		console.log("Error while retrieving all users : ",err);
	}

	var usersObject = [];

	var userPromises = [];

	users.forEach(function(user){
		const userPromise = computeUserEarnings(from,to,user);
		userPromises.push(userPromise); 
	})

	var values = await Promise.all(userPromises);
	
	console.log('###### FINISHING EACH USER EARNINGS');
	return values;
	

}


// CRON TO FETCH EARNINGS AND THEN SEND EMAILS **/
var taskFetchEarnings = cron.schedule('35 4 * * *', fetchEarnings, null, true, 'Europe/Paris');
var taskSendEmails = cron.schedule('45 4 * * *', sendEmails, null, true,'Europe/Paris');

 


/** DATABASE and FINAL SERVER INIT **/ 
var database_url = process.env.DATABASE_URL;
//mongoose.connect(database_url,{ config: { autoIndex: false } });
mongoose.connect(database_url,{ useNewUrlParser: true });
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