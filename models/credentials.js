var mongoose = require('mongoose');

var tradetrackerCredentialsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  customerID : String,
  passphrase : String
});

var googleCredentialsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  accessToken : String,
  refreshToken : String
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
  affiliate_id : String, 
  api_key : String 
});

var Adsense =  mongoose.model('AdsenseCredentials', googleCredentialsSchema);
var Tradetracker = mongoose.model('TradetrackerCredentials', tradetrackerCredentialsSchema);
var Moolineo = mongoose.model('MoolineoCredentials',moolineoCredentialsSchema);
var Loonea = mongoose.model('LooneaCredentials',looneaCredentialsSchema);
var Thinkaction = mongoose.model('ThinkactionCredentials',thinkactionCredentialsSchema);
var Dgmax = mongoose.model('DgmaxCredentials',dgmaxCredentialsSchema);

var userHasCredentials = function(userid,username, incomesource, incomemodel,callback){
	incomemodel.findOne({user_id : userid},function (err,user){
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

module.exports = {Adsense,Tradetracker,Moolineo,Loonea,Thinkaction,Dgmax,userHasCredentials};