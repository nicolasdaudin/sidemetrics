var http = require('http'); //importing http

var options = {    
	// to be changed once we migrate to a proper domain name. It's normal to not use host with http or https
	host: 'sidemetrics.herokuapp.com',    
    path: '/wakeup'
};

console.log("====== Wake up cron START");

http.get(options, function(res) {    
	res.on('data', function(chunk) {        
		try {            
			// optional logging... disable after it's working            
			console.log("====== Wake up cron HEROKU RESPONSE: " + chunk);        
		} catch (err) {            
			console.log(err.message);        
		}    
	});
}).on('error', function(err) {    
	console.log("Error: " + err.message);
});
