var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var cron = require('node-cron');
var nodemailer =require ('nodemailer');
var mongoose = require('mongoose');
var moment = require ('moment');
moment.locale('es');

var adsense = require ('./providers/adsense');
var tradetracker = require ('./providers/tradetracker');
var moolineo = require ('./providers/moolineo');
var loonea = require ('./providers/loonea');
var thinkaction = require ('./providers/thinkaction');
var dgmax = require ('./providers/dgmax');
var daisycon = require('./providers/daisycon');
var gamblingaffiliation = require('./providers/gamblingaffiliation');

var Income = require('./models/income');
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
  		"<h1>Welcome to Sidemetrics 0.2.0</h1>" + 
  		"<h2 style='color:red'>Ongoing</h2>" +   		
  		"<ul>" + 
		"<li><a href='/dashboard'>DASHBOARD</a></li>"+  
		"<li><a href='/cron/fetchEarnings'>CRON fetchEarnings</a></li>"+  
		"<li><a href='/cron/sendEmails'>CRON sendEmails</a></li>"+  
  		"</ul>" +
  		"<h2>Working - Normal</h2>" + 
  		"<ul>"+
  		"<li><a href='/adsense/connect/nicdo77'>Connect to Adsense (nicdo77)</a></li>"+  		
  		"<li><a href='/adsense/earnings/nicdo77'>Get Adsense earnings (nicdo77)</a></li>"+
  		"<li><a href='/tradetracker/earnings/nicdo77'>Get Tradetracker earnings for nicdo77</a></li>" +
  		"<li><a href='/tradetracker/earnings/jimena123'>Get Tradetracker earnings for jimena123</a></li>" +
  		"<li><a href='/moolineo/earnings/nicdo77'>Get Moolineo earnings for nicdo77 for yesterday</a></li>" +
  		"<li><a href='/loonea/earnings/nicdo77'>Get Loonea earnings for nicdo77 for yesterday</a></li>" +
  		"<li><a href='/daisycon/earnings/nicdo77'>Get Daisycon earnings for nicdo77 for yesterday</a></li>" + 
  		"<li><a href='/dgmax/earnings/jimena123'>Get Dgmax earnings for jimena123 for yesterday</a></li>" + 
  		"<li><a href='/thinkaction/earnings/nicdo77'>Get Thinkaction earnings for nicdo77 for yesterday</a></li>" +
  		"<li><a href='/gamblingaffiliation/earnings/nicdo77'>Get Gambling Affiliation Earnings for nicdo77 </a></li>" +
  		"</ul>" + 
  		"<h2>Working - Historic</h2>" +   		
  		"<ul>"+
  		"<li><a href='/adsense/historic/nicdo77/6'>Get 6 months historic earnings on Adsense for nicdo77</a></li>" + 
  		"<li><a href='/thinkaction/historic/nicdo77/6'>Get 6 months historic earnings on Thinkaction for nicdo77 </a></li>" +
  		"<li><a href='/daisycon/historic/nicdo77/1'>Get 1 months historic earnings on Daisycon for nicdo77</a></li>" + 
  		"<li><a href='/tradetracker/historic/nicdo77/1'>Get 1 months historic earnings on Tradetracker for nicdo77</a></li>" + 
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
	cronFetchEarnings();
	cronSendEmails();
	res.send('ONGOING, check logs');
});

app.get('/cron/fetchEarnings',function(req,res){
	console.log("CRON FETCH EARNINGS - MANUAL LAUNCH");
	cronFetchEarnings();
	res.send('ONGOING, check logs');
});

app.get('/cron/sendEmails',function(req,res){
	console.log("CRON SEND EMAILS - MANUAL LAUNCH");
	cronSendEmails();
	res.send('ONGOING, check logs');
});

const cronFetchEarnings = function(){
	// CRON STARTED
    var cronBegin = moment();
    console.log('CRON FETCH EARNINGS - BEGIN at',cronBegin);

    var yesterday = moment().subtract(1,'days'); 
    var niceDay = yesterday.format('dddd DD MMMM YYYY');
    var monthname = yesterday.format('MMMM');

    console.log('CRON FETCH EARNINGS - FOR DAY',yesterday);
    // get all users
    User.findAllUsers(function(err,users){
    	if (err) { 
    		console.log("Error while retrieving all users : ",err);
    	} else {

    		async.eachSeries(users,function getInfoFromIncomeSource(user,callbackEach){

    			var username = user.username;
    		
				var incomeproviders = getIncomeProviders();				
				
				async.eachSeries(incomeproviders,function(incomeprovider,callbackSmallEach){
					var incomesource = incomeprovider.source;

					// first check if the user uses that income source
					Credentials.userHasCredentials(user._id,username,incomesource,incomeprovider.credentials_model,function(err,hasCredentials){
						if (!hasCredentials){
							callbackSmallEach();
						} else {
							
							incomeprovider.provider.getEarnings(user._id,username,yesterday,function(err,result){
								if (err){
									console.log("[%s] CRON FETCH EARNINGS - Back from getEarnings for %s with error: ",username,incomesource,err);
									callbackSmallEach();
								} else {
									//var dayTotal = result.totals[1];
									var dayTotal = result;
									console.log("[%s] CRON FETCH EARNINGS - Back from getEarnings for day %s for %s with earnings: ",username,yesterday,incomesource,dayTotal);					
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

var getUserEarningsByIncome = function(user,day,incomeprovider,callback){
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
			
			Income.getDayEarnings(user._id,username,day,incomesource,incomeprovider.income_model,function(err,result){
				console.log('callback from getDayEarnings - result=%s - err=%s',JSON.stringify(result),err);
				if (err){
					console.log("[%s] server.js - Back from getDayEarnings for %s with error: ",username,incomesource,err);
					callback();
				} else {
					console.log("[%s] Back from getDayEarnings for day %s for %s with earnings: ",username,day,incomesource,result.income);		

					incomeprovider.earnings = {day : new Number(result.income)};
				
					Income.getMonthEarnings(user._id,username,day,incomesource,incomeprovider.income_model,function(err,result){
						console.log('callback from getMonthEarnings - result=%s - err=%s',JSON.stringify(result),err);
						if (err){
							console.log("[%s] server.js - Back from getMonthEarnings for %s with error: ",username,incomesource,err);
							callback();
						} else {
							console.log("[%s] Back from getMonthEarnings for day %s for %s with earnings: ",username,day,incomesource,result);		

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


    var yesterday = moment().subtract(1,'days'); 
    var niceDay = yesterday.format('dddd DD MMMM YYYY');
    var monthname = yesterday.format('MMMM');

    var homepageHtml = 
    	`<style> \
    		body { \
    			font-family : Helvetica,Arial,sans-serif; \
    		}\
  			thead { \
			    background-color: #4CAF50; \
			    color: white \
			} \	
			tfoot { \
			    font-size:1.1em; \
			    background-color: #f4c542; \
			    color: white \
			} \	
			th, td { \
			    padding: 5px 15px; \
			    text-align: left; \
			    border-bottom: 1px solid #ddd \
			} \
  		</style>` + 
  		"<div>" + 
  		"<h1>Sidemetrics 0.2.0 - Dashboard</h1>" + 
  		`<h2>Ganancias de ayer (${niceDay})</h2>`;

   
    // get all users
    User.findAllUsers(function(err,users){
    	if (err) { 
    		console.log("Error while retrieving all users : ",err);
    	} else {

    		async.eachSeries(users,function getUserEarnings(user,callbackEach){

    			
    			var username = user.username;
				var incomeproviders = getIncomeProviders();				
				
				async.eachSeries(incomeproviders,function (incomeprovider,callbackSmallEach){
					getUserEarningsByIncome(user,yesterday,incomeprovider,function(){
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
						var userHtml = `<h3>Usuario ${username}</h3>`+
							`<table><thead><tr><th>Plataforma</th><th>Ayer</th><th><i>Total ${monthname}</i></th></tr></thead><tbody>`;
						var totalToday = 0;
						var totalMonth = 0;
						for (var i = 0; i < incomeproviders.length; i++) {
							
							var incomeprovider = incomeproviders[i];
							userHtml += '<tr>';
		          			if (incomeprovider.earnings){		          				
	          					//console.log(mailPhraseSource);
	          					userHtml += `<td><b>${incomeprovider.source}</b></td>`+
	          						`<td>${incomeprovider.earnings.day} €</td>` + 
		          					`<td><i>${incomeprovider.earnings.month} €</i></td>`;
	          					totalToday += incomeprovider.earnings.day;
	          					totalMonth += incomeprovider.earnings.month;
	          				}
	          				userHtml += '</tr>';
	          			}
	          			userHtml += `</tbody><tfoot><tr><td>TOTAL GANANCIAS</td><td>${totalToday.toFixed(2)} €</td>` +
	          				`<td>${totalMonth.toFixed(2)} €</td></tr></tfoot></table>`;
						
					

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


const cronSendEmails = function() {
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

    			
    			var username = user.username;
				var incomeproviders = getIncomeProviders();				
				
				async.eachSeries(incomeproviders,function (incomeprovider,callbackSmallEach){
					getUserEarningsByIncome(user,yesterday,incomeprovider,function(){
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
		          				var mailPhraseSource = '<b>' + incomeprovider.source + '</b> : ' + incomeprovider.earnings.day + 
		          					' <i>(Total for ' + monthname  + ' : ' + incomeprovider.earnings.month + ')</i><br>';
	          					//console.log(mailPhraseSource);
	          					mailHtml += mailPhraseSource;
	          					totalToday += incomeprovider.earnings.day;
	          					totalMonth += incomeprovider.earnings.month;
	          				}
	          			}
	          			mailHtml += '</p><p>Ayer (' + niceDay + ') has ganado en total <b>' + totalToday.toFixed(2) + ' €</b>. Enhorabuena, molas!! ;-) <br>' +
	          				'Y ya has ganado <b>' + totalMonth.toFixed(2) + ' €</b> en lo que va de este mes de ' + monthname + '. Eres lo más... como lo haces?</p>';
						
						//console.log('[%s] Final mail about to be sent:',mailHtml);

						console.log('[%s] Mail about to be sent ==> ',username,mailHtml);
						// setup email data with unicode symbols
						var mailOptions = {
						    from: '"Sidemetrics 📈❤️" <no-reply@sidemetrics.com>', // sender address
						    to: 'nicolas.daudin@gmail.com',//user.email, 
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
var taskFetchEarnings = cron.schedule('35 4 * * *', cronFetchEarnings, true);
var taskSendEmails = cron.schedule('45 4 * * *', cronSendEmails, true);

 


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