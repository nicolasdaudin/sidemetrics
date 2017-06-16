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
	cronAdsense();
	console.log("CRON - MANUAL LAUNCH - END");
});

const cronAdsense = function() {
    // CRON STARTED
    var now = moment();
    console.log('CRON BEGIN at',now);

    var yesterday = moment().subtract(1,'days'); 
    var niceDay = yesterday.format('LL');

    // get all users
    User.findAllUsers(function(err,users){
    	if (err) { 
    		console.log("Error while retrieving all users : ",err);
    	} else {


    		users.forEach(function(user){
    			
    			var username = user.username;
    			console.log("[%s] Trying to Getting Adsense earnings for user",username);
    			adsense.getEarnings(user._id,username,yesterday,function(err,result){
					if (err){
						console.log("[%s] Returned from getAdsenseEarnings with ERROR",username);			
					} else {
						console.log("[%s] Google Adsense earnings of yesterday",username,result);		

						// Trying to retrieve the total for the month
						// Build a method in adsense.js file to retrieve sum of earnings for the month???
						// like getMonthEarnings


						adsense.getMonthEarnings(user._id,username,yesterday,function(err,monthlyTotal){
							if (err){
								console.log("[%s] Returned from getMonthEarnings with ERROR",username);
								return;
							} else {
								var monthname = yesterday.format('MMMM')
								console.log("[%s] Google Adsense MONTHLY earnings for [%s]",username,monthname,monthlyTotal);
							
								console.log('##### [%s] About to send the email to',username,user.email);

								var earnings = result.totals[1];
								//var mailText = 'Dear ' + user.username +', here is your income.\n\nGoogle Adsense : ' + earnings;
								var mailHtml = 'Dear ' + user.username +', here is your income.' +
									'<p><b>GoogleAdsense</b> : ' + earnings + ' <i>(Total for ' + monthname + ' : ' + monthlyTotal + ')</i></p>';

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

					}	
				});
	    	});
    	}
    });
};

// CRON TO SEND EMAILS **/
// every minute: * */1 * * * 
// every day at 2am : * * 2 * *
// every day ar 4:35am: 4 35 * * *
var task = cron.schedule('35 4 * * *', cronAdsense, true);
 


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