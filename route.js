var passport = require('passport');
var Account = require('./models/account');
var config = require('./config');
var jwt     = require('jsonwebtoken');
var mailgun = require('mailgun-js');
var nunjucks = require('nunjucks');
var formidable = require("formidable");
var mailgun_svc = mailgun({apiKey: 'key-6fe16085bed681e2dfd0401ec3d51157', domain: 'sandboxbc76c75c6ed14c85a1f27414ab6b8796.mailgun.org'});

module.exports = function (app) {
// Define routes.
  app.get('/',
      function (req, res) {
        console.log ("hey!");
        console.log (req.user);
        res.render('home', {user: req.user});
      });

  app.get('/login',
      function (req, res) {
        res.render('login');
      });

  app.get('/register',
      function (req, res) {
        res.render('register');
      });

  app.post('/login',  function(req, res, next) {
    passport.authenticate('local', function(err, user, info) {
      console.log (err);
      console.log (user);
      req.session.save(function (err) {
        if (err) {
          return next(err);
        }
        // Redirect if it fails
        if (!user) {
          return res.render('login', {title:" Login", page:'/login', info: " Wrong username or password, please try again "});
        }
        req.logIn(user, function(err) {
          if (err) { return next(err); }
          res.redirect('/');
        })
      });
    })(req, res, next)
  });

  app.post('/register',
      function (req, res) {
        console.log (req.body);
        var user = new Account({
              username : req.body.username,
              email: req.body.email,
              email_verified: false,
              password: req.body.password
            });
        user.save(function(err, account) {
          if (err) {
            console.log(err);
            var info = err.message;
            return res.render("register", {info: info});
          }

          var token = jwt.sign({username:req.body.username, password: req.body.password}, config.token_secret, {
            expiresIn : 60*60*24
          });

          var body_html = nunjucks.render('./views/email/registration.html', {
            name: req.body.username,
            username: req.body.username,
            token_url: config.server_url + '/token/activate/' + token,
          });
          console.log (config.server_url + '/token/activate/' + token);
          var data = {
            from: 'VirtuBa <admin@virtuba.com>',
            to: account.email,
            subject: 'Virtuba Account is Created!',
            //text:'',
            html: body_html
          };

          mailgun_svc.messages().send(data, function(/*error, body*/) {
            //console.log(body);
          });
          req.logIn(user, function(err) {
            req.session.save(function (err1) {
              if (err1) {
                console.log(err1)
                return next(err1);
              }
              return res.redirect('/');
            });
          });
        });
      });

  app.get('/token/activate/:token',
      function(req,res) {
        var token = req.params.token;

        jwt.verify(token,  config.token_secret, function(err, decoded) {
          console.log(decoded);
          if (err) {
            return res.render("home", {user: req.user, message: 'Failed to authenticate token.' });
          } else {
            // if everything is good, save to request for use in other routes
            Account.findOneAndUpdate({username: decoded.username}, {$set: {email_verified: true}}, {}).exec()
                .then(account_obj => {
                  if (!account_obj)
                    return res.render("home", {user: req.user, message: 'Token is not valid!'});
                  req.logIn(new Account(account_obj), function (err1) {
                    if (err1) {
                      console.log(err1);
                    }
                    console.log("okay!");
                    console.log (req.user);
                    res.redirect('/');
                    /*req.session.save(function (err2) {
                      if (err2) {
                        console.log(err2)
                        return next(err2);
                      }

                      return res.redirect('/');
                      //return res.render("home", {user: req.user, message: 'Your email was verified!'});
                    });*/
                  });

                });
          }
        });
      });

  app.get('/forgotpassword',
      function (req, res) {
        res.render('resetpassword');
      });

  app.get('/resetpassword/:token',
      function (req, res) {
        var token = req.params.token;

        jwt.verify(token,  config.token_secret, function(err, decoded) {
          console.log(decoded);
          if (err) {
            return res.render("home", {user: req.user, message: 'Your password reset url is incorrect!'});
          } else {
            // if everything is good, save to request for use in other routes
            Account.findOne({username: decoded.username, resettoken: token}, function (err1, account_obj) {
              if (err1) {
                console.log(err1);
              }
              console.log (account_obj);
              if (!account_obj)
                return res.render("home", {user: req.user, message: 'Token is not valid!'});
              return res.render("changepassword", {token: token});
            });
          }
        });
      });

  app.post('/change_password/:token',
      function(req,res) {
        var token = req.params.token;

        jwt.verify(token, config.token_secret, function(err, decoded) {
          console.log(decoded);
          if (err) {
            return res.render("home", {user: req.user, message: 'Failed to authenticate token.' });
          } else {
            // if everything is good, save to request for use in other routes
            Account.findOneAndUpdate({username: decoded.username, resettoken: token}, {$set: {password: req.body.password}}, {},
                function (err, account_obj) {
                  if (!account_obj)
                    return res.render("home", {user: req.user, message: 'Token is not valid!'});

                  var body_html = nunjucks.render('./views/email/registration.html', {
                    name: req.body.username,
                    username: req.body.username,
                  });
                  console.log (config.server_url + '/token/activate/' + token);
                  var data = {
                    from: 'VirtuBa <admin@virtuba.com>',
                    to: account_obj.email,
                    subject: 'Virtuba Account is Created!',
                    //text:'',
                    html: body_html
                  };

                  mailgun_svc.messages().send(data, function(/*error, body*/) {
                    //console.log(body);
                  });
                  Account.findOneAndUpdate({username: decoded.username, resettoken: token}, {$unset: {resettoken: 1 }}, {}, function(){});
                  return res.render("home", {user: req.user, message: 'Your password was changed successfully!'});
                });
          }
        });
      });

  app.post('/resetpassword',
      function (req, res) {
        var token = jwt.sign({username:req.body.username, time: new Date().getTime()}, config.token_secret, {
          expiresIn : 60*60*24
        });

        Account.findOne({username: req.body.username}, function(err, account) {
          var body_html = nunjucks.render('./views/email/recover-password.html', {
            name: req.body.username,
            recover_url: config.server_url + '/resetpassword/' + token,
          });
          console.log(config.server_url + '/resetpassword/' + token);
          var data = {
            from: 'VirtuBa <admin@virtuba.com>',
            to: account.email,
            subject: 'Resetting Your Virtuba Account\'s password is requested',
            //text:'',
            html: body_html
          };

          Account.findOneAndUpdate({username: req.body.username}, {$set: {resettoken: token}}, {upsert: true, setDefaultsOnInsert: true, runValidators: true, new: true},
              function (err, account_obj) {
                if (err)
                  console.log (err);
                console.log (account_obj);
              });
          mailgun_svc.messages().send(data, function (/*error, body*/) {
          });
          res.redirect('/');
        });
      });

  app.get('/logout',
      function (req, res) {
        req.logout();
        res.redirect('/');
      });

  app.get('/profile',
      require('connect-ensure-login').ensureLoggedIn(),
      function (req, res) {
        res.render('profile', {user: req.user});
      });
};