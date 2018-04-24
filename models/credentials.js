var mongoose = require('mongoose');

var tradetrackerCredentialsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  customerID : String,
  passphrase : String
});

var adsenseCredentialsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  accessToken : String,
  refreshToken : String
});

var analyticsCredentialsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  accessToken : String,
  refreshToken : String,
  viewId: String
});

var moolineoCredentialsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  access_url : String
});

var looneaCredentialsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  access_url : String
});

var thinkactionCredentialsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  affiliate_id : String, 
  api_key : String 
});

var dgmaxCredentialsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  email : String, 
  password : String 
});

var daisyconCredentialsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  username : String, 
  password : String 
});

var gamblingAffiliationCredentialsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  username : String, 
  password : String 
});

var Adsense =  mongoose.model('AdsenseCredentials', adsenseCredentialsSchema);
var Analytics = mongoose.model('AnalyticsCredentials',analyticsCredentialsSchema);
var Tradetracker = mongoose.model('TradetrackerCredentials', tradetrackerCredentialsSchema);
var Moolineo = mongoose.model('MoolineoCredentials',moolineoCredentialsSchema);
var Loonea = mongoose.model('LooneaCredentials',looneaCredentialsSchema);
var Thinkaction = mongoose.model('ThinkactionCredentials',thinkactionCredentialsSchema);
var Dgmax = mongoose.model('DgmaxCredentials',dgmaxCredentialsSchema);
var Daisycon = mongoose.model('DaisyconCredentials',daisyconCredentialsSchema);
var GamblingAffiliation = mongoose.model('GamblingAffiliationCredentials',gamblingAffiliationCredentialsSchema);

var userHasCredentials = function(userid,username, incomesource, credentialsmodel,callback){
	credentialsmodel.findOne({user_id : userid},function (err,user){
		if (err) {
			console.log('userHasCredentials [%s,%s] - There was an error',username,incomesource, err);
			callback(err,false);
		} else if (user){
			// that user has credentials for that income source
			//console.log('userHasCredentials - user ',user)
			console.log('[%s] userHasCredentials for %s - TRUE',username,incomesource);
			callback(null,true);
		} else {
			// that user has no credentials for that income source
			console.log('[%s] userHasCredentials for %s - FALSE',username,incomesource);
			callback(false);
		}
	});
};

module.exports = {Adsense,Analytics,Tradetracker,Moolineo,Loonea,Thinkaction,Dgmax,Daisycon,GamblingAffiliation,userHasCredentials};