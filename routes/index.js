var express = require('express');
var router = express.Router();
var config = require('../public/config.json');

//Qlik
var fs = require('fs');
var request = require('request');
//end Qlik

// Get Dashboard
router.get('/', ensureAuthenticated, function(req, res){
	
//Qlik authentcation
var r = request.defaults({
  rejectUnauthorized: false,
  host: config.qs_host,
  pfx: fs.readFileSync('client.pfx')
});

var b = JSON.stringify({
  "UserDirectory": config.qs_user_dir,
  "UserId": req.user.username,
  "Attributes": [],
});
	// get sessions list from proxy	
	r.get({
	  uri:'https://' + config.qs_host + ':4243/qps/user/' + config.qs_user_dir + '/'+req.user.username+'?xrfkey=abcdefghijklmnop', 
	  body: b,
	  headers: {
    'x-qlik-xrfkey': 'abcdefghijklmnop',
    'content-type': 'application/json'
  }
	},
	  function(error, body){
		 
		if (JSON.stringify(body).indexOf(q_session_id) !== -1) {
			//User session exists
			res.render('index',{ v_qses: q_session_id, v_app_id: q_app_id, v_sheet_id: q_sheet_id });
		}
		else {
			//Requesting new user session...
			res.redirect('users/qlik');
		}
	});
	
});

// Get Details
router.get('/details', ensureAuthenticated, function(req, res){
	res.render('index');
});

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		res.redirect('/users/login');
	}
}

module.exports = router;