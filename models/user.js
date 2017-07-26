var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  username: { type: String, unique: true, index: true },
  email : String
});

var User = mongoose.model('User',userSchema);

var findByUsername = function(username,callback){
	User.findOne({username: username}, function(err,user){
		if (err){
			console.log('User with username %s not found',username);
			callback(err,null);
		} else {
			//console.log('User with username %s found',username);
			callback(null,user);
		}
	});
};

var findAllUsers = function(callback){
	User.find({}, function(err,users){
		if (err){
			console.log("Couldn't find any users because of : ",err);
			callback(err,null);
		} else {
			//console.log('User with username %s found',username);
			callback(null,users);
		}
	});
}

module.exports = { findByUsername,findAllUsers};