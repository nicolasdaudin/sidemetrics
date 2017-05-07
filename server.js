var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var cron = require('node-cron');
var nodemailer =require ('nodemailer');
var mongoose = require('mongoose');
var moment = require ('moment');

var adsense = require ('./providers/adsense');
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

app.get('/', function (req, res) {
  res.send('Hello World from SideMetrics');
});


/** CRON TO SEND EMAILS **/
 
var task = cron.schedule('* */1 * * *', function() {
    // CRON STARTED
    console.log('CRON BEGIIIIIIIN');

    var yesterday = moment().subtract(1,'days'); 
    var niceDay = yesterday.format('LL');

    // get all users
    User.findAllUsers(function(err,users){
    	if (err) { 
    		console.log("Error while retrieving all users : ",err);
    	} else {


    		users.forEach(function(user){
    			console.log("Trying to Getting Adsense earnings for user",user.username);
    		
	    		adsense.getEarnings(user._id,yesterday,function(err,result){
					if (err){
						console.log("Returned from getAdsenseEarnings with ERROR");			
					} else {
						console.log("Google Adsense earnings of yesterday",result);		

						console.log('##### About to send the email to',user.email);

						var earnings = result.totals[1];
						var mailText = 'Dear ' + user.username +', here is your income.\n\nGoogle Adsense : ' + earnings;
						var mailHtml = 'Dear ' + user.username +', here is your income.<br/><br/><b>GoogleAdsense</b> : ' + earnings;

						// setup email data with unicode symbols
						var mailOptions = {
						    from: '"Sidemetrics 📈❤️" <no-reply@sidemetrics.com>', // sender address
						    to: user.email, 
						    subject: 'GMail Earnings for Day ' + niceDay, // Subject line
						    text: mailText, // plain text body
						    html: mailHtml // html body
						};

						// send mail with defined transport object
						transporter.sendMail(mailOptions, function(err, info){
						    if (err) {
						        console.log("Email could not be sent. Error : ", err);			      
						    } else {
						    	console.log('Message %s sent: %s', info.messageId, info.response);
						    }			    
						});

					}	
				});
	    	});
    	}
    });


}, true);
 


/** DATABASE and FINAL SERVER INIT **/ 
var database_url = process.env.DATABASE_URL;
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