var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var cron = require('node-cron');
var nodemailer =require ('nodemailer');
var mongoose = require('mongoose');
var moment = require ('moment');

var adsense = require ('./providers/adsense');
var tradetracker = require ('./providers/tradetracker');
var moolineo = require ('./providers/moolineo');
var loonea = require ('./providers/loonea');
var thinkaction = require ('./providers/thinkaction');
var dgmax = require ('./providers/dgmax');
var daisycon = require('./providers/daisycon');

var Income = require('./models/income');
var Credentials = require('./models/credentials');

var getIncomeProviders = function (){  
	return [
		{source:'Google Adsense',dbname:'adsense',provider:adsense,credentials_model:Credentials.Adsense},
		{source:'TradeTracker',dbname:'tradetracker',provider:tradetracker,credentials_model:Credentials.Tradetracker},
		{source:'Moolineo',dbname:'moolineo',provider:moolineo,credentials_model:Credentials.Moolineo},
		{source:'Loonea',dbname:'loonea',provider:loonea,credentials_model:Credentials.Loonea},
		{source:'Thinkaction - Toluna',dbname:'thinkaction',provider:thinkaction,credentials_model:Credentials.Thinkaction},
		{source:'DGMax Interactive (convertido a EUR)',dbname:'dgmax',provider:dgmax,credentials_model:Credentials.Dgmax},
		{source:'Daisycon',dbname:'daisycon',provider:daisycon,credentials_model:Credentials.Daisycon}

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

app.get('/', function (req, res) {
  var homepageHtml = 
  		"<div>" + 
  		"<h1>Welcome to Sidemetrics 0.2.0</h1>" + 
  		"<h2 style='color:red'>Ongoing</h2>" + 
  		"<ul>" + 
  		"<li><a href='/thinkaction/historic/nicdo77/6'>Get 6 months historic earnings on Thinkaction for nicdo77 </a></li>" +
  		"</ul>" +
  		"<h2>Working - Normal</h2>" + 
  		"<ul>"+
  		"<li><a href='/cron/all'>Execute Manually Cron</a></li>"+  		
  		"<li><a href='/adsense/connect/nicdo77'>Connect to Adsense (nicdo77)</a></li>"+  		
  		"<li><a href='/adsense/earnings/nicdo77'>Get Adsense earnings (nicdo77)</a></li>"+
  		"<li><a href='/tradetracker/earnings/nicdo77'>Get Tradetracker earnings for nicdo77</a></li>" +
  		"<li><a href='/tradetracker/earnings/jimena123'>Get Tradetracker earnings for jimena123</a></li>" +
  		"<li><a href='/moolineo/earnings/nicdo77'>Get Moolineo earnings for nicdo77 for yesterday</a></li>" +
  		"<li><a href='/loonea/earnings/nicdo77'>Get Loonea earnings for nicdo77 for yesterday</a></li>" +
  		"<li><a href='/daisycon/earnings/nicdo77'>Get Daisycon earnings for nicdo77 for yesterday</a></li>" + 
  		"<li><a href='/dgmax/earnings/jimena123'>Get Dgmax earnings for jimena123 for yesterday</a></li>" + 
  		"<li><a href='/thinkaction/earnings/nicdo77'>Get Thinkaction earnings for nicdo77 for yesterdat</a></li>" +
  		"</ul>" + 
  		"<h2>Working - Historic</h2>" +   		
  		"<ul>"+
  		"<li><a href='/adsense/historic/nicdo77/6'>Get 6 months historic earnings on Adsense for nicdo77</a></li>" + 
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
	console.log("CRON - MANUAL LAUNCH - BEGIN");
	cronSendEmails();
	console.log("CRON - MANUAL LAUNCH - END");
	res.send('ONGOING, check logs');
});

const cronSendEmails = function() {
    // CRON STARTED
    var now = moment();
    console.log('CRON BEGIN at',now);

    var yesterday = moment().subtract(1,'days'); 
    var niceDay = yesterday.format('dddd DD MMMM YYYY');
    var monthname = yesterday.format('MMMM');


    // get all users
    User.findAllUsers(function(err,users){
    	if (err) { 
    		console.log("Error while retrieving all users : ",err);
    	} else {

    		async.eachSeries(users,function getInfoFromIncomeSource(user,callbackEach){

    			var username = user.username;
    		
				//console.log("[%s] ASYNC START",username);

				var incomeproviders = getIncomeProviders();				
				
				async.eachSeries(incomeproviders,function(incomeprovider,callbackSmallEach){
					var incomesource = incomeprovider.source;

					// first check if the user uses that income source
					// in each income provider, add a method to check if user has credentials !??? will be repetitive.... :-(
					Credentials.userHasCredentials(user._id,username,incomesource,incomeprovider.credentials_model,function(err,hasCredentials){
						if (!hasCredentials){
							callbackSmallEach();
						} else {

							// the user does  use that income source.
							//console.log("[%s] This user has credentials - BEGIN Earnings for ",username,incomesource);

							// ONCE getEarnings only retrieves the earnings from DB (instead of also launching the 3rd party call)
							// - getEarnings and getMonthEarnings could be done in parallel
							// - and also, probably, getEarnings can retrieve earnings for day, month, year... all in one call. No?
							incomeprovider.provider.getEarnings(user._id,username,yesterday,function(err,result){
								if (err){
									console.log("[%s] Back from getEarnings for %s with error: ",username,incomesource,err);
									callbackSmallEach();
								} else {
									//var dayTotal = result.totals[1];
									var dayTotal = result;
									//console.log("[%s] Back from getEarnings for day %s for %s with earnings: ",username,yesterday,incomesource,dayTotal);		
									incomeprovider.earnings = {day : new Number(dayTotal)};
									

									incomeprovider.provider.getMonthEarnings(user._id,username,yesterday,function(err,monthTotal){
										if (err){
											console.log("[%s] Back from getMonthEarnings for %s with error: ",username,incomesource,err);										
										} else {
											
											console.log("[%s] %s earnings for source %s : %s",username,monthname,incomesource,monthTotal);
										
											//callback(null,{ day : dayTotal, month: monthTotal});
											incomeprovider.earnings.month = new Number(monthTotal);
											callbackSmallEach();
										}
									});	

								}	
							});
						}

						
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
					}

    			});
    			
    			//console.log("Just before calling callbackEach()");
    			callbackEach();
    			
    			
	    	});
    	}
    });
};

// CRON TO SEND EMAILS **/
// every minute: * */1 * * * 
// every day at 2am : * * 2 * *
// every day ar 4:35am: 4 35 * * *
var task = cron.schedule('35 4 * * *', cronSendEmails, true);
 


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