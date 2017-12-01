var express = require('express');
var router = express.Router();

//Qlik
var fs = require('fs');
var request = require('request');
var jspath = require('jspath');
//end Qlik


router.post('/', function(req, res){
	q_sheet_id = req.body.f_sheet_id;
	console.log("sheet: " + q_sheet_id);
	res.redirect('/');
});

// Get Dashboard
router.get('/', ensureAuthenticated, function(req, res){
	console.log("user session check..." + req.user.username + " session: " + q_session_id); 
	
//Qlik authentcation
var r = request.defaults({
  rejectUnauthorized: false,
  host: 'win-derii8ceovp',
  pfx: fs.readFileSync('client.pfx')
});

// Authenticate whatever user you want
var b = JSON.stringify({
  "UserDirectory": 'external',
  "UserId": req.user.username,
  "Attributes": [{'org': 'nodejs'}],
});
	// get sessions list from proxy	
	r.get({
	  uri:'https://127.0.0.1:4243/qps/user/external/'+req.user.username+'?xrfkey=abcdefghijklmnop', 
	  body: b,
	  headers: {
    'x-qlik-xrfkey': 'abcdefghijklmnop',
    'content-type': 'application/json'
  }
	},
	  function(error, res1,body){
		
		var qsessions = JSON.stringify(jspath.apply('.body', res1)).replace(/\\/g, "").replace("[\"[","").replace("]\"]","");
		if (qsessions.indexOf(q_session_id) !== -1) {
			//console.log("sessions: \n" + qsessions);
			res.render('index',{ v_qses: q_session_id, v_app_id: q_app_id, v_sheet_id: q_sheet_id });
		}
		else {
			//console.log("Requesting new user session...");
			res.redirect('users/qlik');
		}
	});
	
});

// Get Details
router.get('/details', ensureAuthenticated, function(req, res){
	console.log("details..."); 
	res.render('index',{ v_qses: q_session_id, v_app_id: q_app_id, v_sheet_id: q_sheet_id });
});

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		//req.flash('error_msg','You are not logged in');
		res.redirect('/users/login');
	}
}

module.exports = router;