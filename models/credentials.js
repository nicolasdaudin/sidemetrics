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

var awinCredentialsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, unique: true, index: true },
  accessToken : String,
  publisherId : String
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
var Awin = mongoose.model('AwinCredentials',awinCredentialsSchema);

var userHasCredentials = async function(userid,username, incomesource, credentialsmodel){
	try {
        var user = await credentialsmodel.findOne({user_id : userid}).exec();
        if (user){
            // that user has credentials for that income source
            //console.log('userHasCredentials - user ',user)
            //console.log('[%s#%s] userHasCredentials - TRUE',username,incomesource);
            return true;
        } else {
            // that user has no credentials for that income source
            //console.log('[%s#%s] userHasCredentials - FALSE',username,incomesource);
            return false;
        }

    } catch (err){		
		console.log('[%s#%s] userHasCredentials - There was an error',username,incomesource, err);
		throw err;
	}
};

module.exports = {Adsense,Analytics,Tradetracker,Moolineo,Loonea,Thinkaction,Dgmax,Daisycon,GamblingAffiliation,Awin,userHasCredentials};