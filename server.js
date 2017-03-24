var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var exphbs = require('express-handlebars');
var session = require('express-session');
var config = require('./config');

mongoose.connect(config.mongodb_uri);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log(" db started on : " + config.mongodb_uri);
  /*var obj = new Account({
    username: 'test',
    email: 'test@t.com',
    password: 'admin123'});
  obj.save(function(err, account) {console.log (err); console.log(account);});*/
});

//passport config
var Account = require('./models/account');
var PassportLocalStrategy = require('passport-local');

var authStrategy = new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password'
}, function(username, password, done) {
  console.log ("starategy! 1");
  console.log (username);
  Account.authenticate(username, password, function(error, user){
    console.log ("starategy!");
    console.log (username);
    // You can write any kind of message you'd like.
    // The message will be displayed on the next page the user visits.
    // We're currently not displaying any success message for logging in.
    done(error, user, error ? { message: error.message } : null);
  });
});

var authSerializer = function(user, done) {
  done(null, user.id);
};

var authDeserializer = function(id, done) {
  Account.findById(id, function(error, user) {
    done(error, user);
  });
};

passport.use(authStrategy);
passport.serializeUser(authSerializer);
passport.deserializeUser(authDeserializer);

// Create a new Express application.
var app = express();

// Configure view engine to render HBS templates.
app.engine('.hbs', exphbs({extname: '.hbs'}));
app.set('view engine', '.hbs');

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: 'virtuba_session',
  cookie: { secure: false }
}));

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(express.static(path.join(__dirname, 'public')));
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'virtueba', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(require('connect-flash')()); // see the next section
app.use(passport.initialize());
app.use(passport.session());

require('./route')(app);

app.listen(3000);
