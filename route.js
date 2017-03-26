var passport = require('passport');
var config = require('./config');

module.exports = function (app) {
// Define routes.
  app.get('/',
      function (req, res) {
        console.log ("hey!");
        console.log (req.user);
        res.render('home', {user: req.user});
      });
};