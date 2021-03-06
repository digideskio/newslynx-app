/*
 * Routes for granting access to third-parties
 * e.g. Google Analytics, Twitter, Facebook etc.
*/

var router = require('express').Router();
var settings = require('../settings');
var debug = require('tracer').console();
var utils = require('../utils');


function grantAccess(service){
  return function(req, res) {
    var protocol
    var api_url
    if (/localhost/.test(settings.config.api_url)) {
      api_url = settings.config.api_url.replace('localhost', req.headers.host)
      if (settings.config.https) {
        api_url = api_url.replace('http://', 'https://') // To make sure we're making this request over https
      }
    } else {
      api_url = settings.config.api_url
    }

    res.redirect(api_url + '/api/' + settings.config.api_version + '/auths/' + service + '/grant?apikey=' + req.session.apikey  + '&org=' + req.session.org_id + '&redirect_uri=' + req.headers.referer + '?service=' + service);
  }
}

function revokeAccess(service){
  return function(req, res) {
    var apiRequester = utils.auth.sendToApi(req,res),
        filePath = '/api/_VERSION/auths/'+service+'/revoke';

    apiRequester(filePath, function(err, response){
      debug.log(err, response);
      res.redirect('/settings');
    });

  }
}

// When coming back from an authentication route, go back to settings page
router.get('api/auth/callback/:apikey', function(req, res){
  req.session.apikey = req.params.apikey;
  res.redirect('/settings')
});

// Authentications
router.get('/auths/google-analytics/grant', grantAccess('google-analytics') );
router.get('/auths/twitter/grant', grantAccess('twitter') );
router.get('/auths/facebook/grant', grantAccess('facebook') );

// Revoke auths
router.get('/auths/google-analytics/revoke', revokeAccess('google-analytics') );
router.get('/auths/twitter/revoke', revokeAccess('twitter') );
router.get('/auths/facebook/revoke', revokeAccess('facebook') );

module.exports = router