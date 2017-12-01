var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var User = require('../models/user');

//Qlik
var fs = require('fs');
var request = require('request');
//var jspath = require('jspath');

const stringy = require('stringy');

//end Qlik

// Register
router.get('/register', function(req, res){
	res.render('register');
});

// Login
router.get('/login', function(req, res){
	res.render('login');
});

// Register User
router.post('/register', function(req, res){
	var name = req.body.name;
	var email = req.body.email;
	var username = req.body.username;
	var password = req.body.password;
	var password2 = req.body.password2;

	// Validation
	req.checkBody('name', 'Name is required').notEmpty();
	req.checkBody('email', 'Email is required').notEmpty();
	req.checkBody('email', 'Email is not valid').isEmail();
	req.checkBody('username', 'Username is required').notEmpty();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

	var errors = req.validationErrors();

	if(errors){
		res.render('register',{
			errors:errors
		});
	} else {
		var newUser = new User({
			name: name,
			email:email,
			username: username,
			password: password
		});

		User.createUser(newUser, function(err, user){
			if(err) throw err;
			console.log(user);
		});

		req.flash('success_msg', 'You are registered and can now login');

		res.redirect('/users/login');
	}
});

passport.use(new LocalStrategy(
  function(username, password, done) {
   User.getUserByUsername(username, function(err, user){
   	if(err) throw err;
   	if(!user){
   		return done(null, false, {message: 'Unknown User'});
   	}

   	User.comparePassword(password, user.password, function(err, isMatch){
   		if(err) throw err;
   		if(isMatch){
   			return done(null, user);
   		} else {
   			return done(null, false, {message: 'Invalid password'});
   		}
   	});
   });
  }));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

router.post('/login',
  passport.authenticate('local', {successRedirect:'/users/qlik', failureRedirect:'/users/login',failureFlash: true}),
  function(req, resmain) {  
	res.redirect('users/qlik');
  });

router.get('/qlik', function(req, resmain){
	console.log('Authenticating user: ' + req.user.username);
	
	//Qlik authentcation
var r = request.defaults({
  rejectUnauthorized: false,
  host: 'win-derii8ceovp',
  //cert: fs.readFileSync('client.pem'),
  //key: fs.readFileSync('client_key.pem')
  //on Windows can be pfx:
  pfx: fs.readFileSync('client.pfx')
});

//  Authenticate whatever user you want
var b = JSON.stringify({
  "UserDirectory": 'external',
  "UserId": req.user.username,
  "Attributes": [{'org': 'nodejs'}]
});

//  Get ticket for user - refer to the QPS API documentation for more information on different authentication methods.
r.post({
  uri:  'https://127.0.0.1:4243/qps/ticket?xrfkey=abcdefghijklmnop',
  body: b,
  headers: {
    'x-qlik-xrfkey': 'abcdefghijklmnop',
    'content-type': 'application/json'
  }
},
function(err, res, body) {

  //  Consume ticket, set cookie response in our upgrade header against the proxy.
  var ticket = JSON.parse(body)['Ticket'];
  
  console.log("Ticket: " + ticket);
  console.log("Header: " + JSON.stringify(res.headers));
 
  r.get('https://127.0.0.1/hub/?qlikTicket=' + ticket, function(error, response, body) {

    var cookies = response.headers['set-cookie'];
	//extract cookie
	q_session_id = cookies[0].substring(15, 51);
	console.log("Session_id: " + q_session_id ); 
	//set cookie in browser
	resmain.cookie('X-Qlik-Session', q_session_id);
	
	resmain.redirect('/');
	
  })
});	
});  
  
router.get('/logout', function(req, res){

//Logout form Qlik
var r = request.defaults({
  rejectUnauthorized: false,
  host: 'win-derii8ceovp',
  pfx: fs.readFileSync('client.pfx')
});

// delete user from proxy	
	r.delete({
	  uri:'https://127.0.0.1:4243/qps/user/external/'+req.user.username+'?xrfkey=abcdefghijklmnop', 
	  headers: {
    'x-qlik-xrfkey': 'abcdefghijklmnop',
    'content-type': 'application/json'}
	},
	  function(error, res1, body){
		console.log("User logged out");
	});

//Log out from smart dashboard
	req.logout();

	req.flash('success_msg', 'You are logged out');

	res.redirect('/users/login');
});

module.exports = router;