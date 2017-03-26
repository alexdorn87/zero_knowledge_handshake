var express = require('express');
var passport = require('passport');
var exphbs = require('express-handlebars');
var session = require('express-session');
var socket_io = require('socket.io');
var path = require('path');
var config = require('./config');
var socket_proc = require('./connection');

// Create a new Express application.
var app = express();

// Configure view engine to render HBS templates.
app.engine('.hbs', exphbs({extname: '.hbs'}));
app.set('view engine', '.hbs');

app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: 'handshake_session',
  cookie: { secure: false }
}));

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(express.static(path.join(__dirname, 'public')));
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'handshake', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(require('connect-flash')()); // see the next section
app.use(passport.initialize());
app.use(passport.session());

var http_server = app.listen(3000, function () {
  console.log('Server started on port %d', http_server.address().port);
});
var io = socket_io.listen(http_server);
socket_proc(io);
require('./route')(app);
