var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var cron = require('node-cron');
var nodemailer =require ('nodemailer');
var mongoose = require('mongoose');
var moment = require ('moment');

var adsense = require ('./providers/adsense');
var tradetracker = require ('./providers/tradetracker');
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

app.get('/', function (req, res) {
  var homepageHtml = 
  		"<div>" + 
  		"<p>Hello World from SideMetrics</p>" + 
  		"<ul>"+
  		"<li><a href='/cron/adsense'>Execute Adsense Cron</a></li>"+  		
  		"<li><a href='/adsense/connect/nicdo77'>Connect to Adsense (nicdo77)</a></li>"+  		
  		"<li><a href='/adsense/earnings/nicdo77'>Get Adsense earnings (nicdo77)</a></li>"+
  		"<li><a href='/tradetracker/earnings/nicdo77'>Get Tradetracker earnings for nicdo77</a></li>" +
  		"<li><a href='/tradetracker/earnings/jimena123'>Get Tradetracker earnings for jimena123</a></li>" +
  		"</ul>" +
  		"</div>";
  res.send(homepageHtml);
  console.log('Server time is : ', moment());
});

app.get('/wakeup',function(req,res){
	res.send('Waking up');
	console.log("Just woke up ;-) . Time now is : ",moment());
});

app.get('/cron/adsense',function(req,res){
	console.log("CRON - MANUAL LAUNCH - BEGIN");
	cronSendEmails();
	console.log("CRON - MANUAL LAUNCH - END");
});

const cronSendEmails = function() {
    // CRON STARTED
    var now = moment();
    console.log('CRON BEGIN at',now);

    var yesterday = moment().subtract(1,'days'); 
    var niceDay = yesterday.format('LL');
    var monthname = yesterday.format('MMMM');


    // get all users
    User.findAllUsers(function(err,users){
    	if (err) { 
    		console.log("Error while retrieving all users : ",err);
    	} else {


    		async.each(users,function(user,callbackEach){

    			var username = user.username;
    			/*if (username === 'jimena123'){
    				console.log('TEST ==> NOT PROCESSING JIMENA123');
    			} else {*/
					console.log("[%s] ASYNC START",username);

					// "Reflexive" getEarnings call work !!!!
					// NOW: remove function getAdsenseEarning in async.parallel
					// add getMonthEarning call in reflexive...
					// voir comment gérer tous les résultats
					
					var incomeproviders = [{source:'Google Adsense',provider:adsense},{source:'TradeTracker',provider:tradetracker}];
					async.each(incomeproviders,function(incomeprovider,callbackSmallEach){
						var incomesource = incomeprovider.source;
						console.log("[%s] BEGIN Earnings for ",username,incomesource);
						incomeprovider.provider.getEarnings(user._id,username,yesterday,function(err,result){
							if (err){
								console.log("[%s] Back from getEarnings for %s with error: ",username,incomesource,err);
							} else {
								//var dayTotal = result.totals[1];
								var dayTotal = result;
								console.log("[%s] Back from getEarnings for day %s for %s with earnings: ",username,yesterday,incomesource,dayTotal);		
								incomeprovider.earnings = {day : new Number(dayTotal)};
								

								incomeprovider.provider.getMonthEarnings(user._id,username,yesterday,function(err,monthTotal){
									if (err){
										console.log("[%s] Back from getMonthEarnings for %s with error: ",username,incomesource,err);										
									} else {
										
										console.log("[%s] Back from getMonthEarnings for month %s for %s with earnings : ",username,monthname,incomesource,monthTotal);
									
										//callback(null,{ day : dayTotal, month: monthTotal});
										incomeprovider.earnings.month = new Number(monthTotal);
										callbackSmallEach();
									}
								});	

							}	
						});
					},
	    			
	    			/*async.parallel([
	    				function getAdsenseEarnings(callback){
	    					console.log("[%s] ASYNC - get Adsense Earnings Trying to Getting Adsense earnings for user",username);
			    			adsense.getEarnings(user._id,username,yesterday,function(err,result){
								if (err){
									console.log("[%s] Returned from getAdsenseEarnings with ERROR",username);			
								} else {
									var dayTotal = result.totals[1];
									console.log("[%s] Google Adsense DAY earnings for %s : ",username,yesterday,dayTotal);		
									

									adsense.getMonthEarnings(user._id,username,yesterday,function(err,monthTotal){
										if (err){
											console.log("[%s] Returned from getMonthEarnings with ERROR",username);
											return;
										} else {
											
											console.log("[%s] Google Adsense MONTH earnings for %s : ",username,monthname,monthTotal);
										
											callback(null,{ day : dayTotal, month: monthTotal});
										}
									});	

								}	
							});
	    				}
	    				


	    			],*/
	    			function(err){
	    				if (err) {
	    					console.error('[%s] error:',username,err);
	    				} else {
		    				//console.log('[%s] earnings:',username,earnings);
		    				console.log('[%s] earnings:',username,incomeproviders);
		    				console.log('[%s] about to send email to',username,user.email);
							var mailHtml = 'Querid@ ' + username +', eso es lo que has ganado hoy día ' + niceDay +'.<p>';
							var totalToday = 0;
							var totalMonth = 0;
							for (var i = 0; i < incomeproviders.length; i++) {
								var incomeprovider = incomeproviders[i];
		          				var mailPhraseSource = '<b>' + incomeprovider.source + '</b> : ' + incomeprovider.earnings.day + 
		          					' <i>(Total for ' + monthname  + ' : ' + incomeprovider.earnings.month + ')</i><br>';
	          					console.log(mailPhraseSource);
	          					mailHtml += mailPhraseSource;
	          					totalToday += incomeprovider.earnings.day;
	          					totalMonth += incomeprovider.earnings.month;
		          			}
		          			mailHtml += '</p><p>Hoy (' + niceDay + ') has ganado en total <b>' + totalToday + ' €</b>. Enhorabuena, molas!! ;-) <br>' +
		          				'Y ya has ganado <b>' + totalMonth + ' €</b> en lo que va de este mes de ' + monthname + '. Eres lo más... como lo haces?</p>';
							
							console.log('[%s] Final mail about to be sent:',mailHtml);

							console.log('[%s] Mail about to be sent',username,mailHtml);
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
							        console.log("[%s] Email could not be sent. Error : ", username,err);			      
							    } else {
							    	console.log('[%s] Message %s sent: %s', username, info.messageId, info.response);
							    }			    
							});
						}

	    			});
				//}

    			/* ideas for tradetracker

    			Faire un async.forEach pour chaque user

    			Faire un async.parallel pour :
    			- adsense
    			- tradetracker
    			Dans chaque type d'income, faire un waterfall pour day earnings PUIS month earnings
    			(on peut pas faire en parallèle car pour le moment c'est le getEarnings qui déclenche le retrieveEarnings depuis les APIs)

    			A la fin de tout ça, envoyer l'email. 
    			*/
    			
    			console.log("Just before calling callbackEach()");
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