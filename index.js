/*
  Primary file for API
*/

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const stringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers')



//Testing
//TODO delete this
// _data.create('test','newFile',{'foo' : 'bar'}, function(err){
//   console.log(err);
// });

// _data.read('test', 'newFile', function(err, data){
//   console.log(`This was the ${err} and this was the data ${data}`);
// })

// _data.update('test', 'newFile',{'fizzzzzz':'buzz'}, function(err, data){
//   console.log(`This was the ${err} and his was the data ${data}`);
// })

// _data.('test', 'newFile', function(err, data){
//    console.log(`This was the ${err} and his was the data ${data}`);
//  })

console.log('index ' + config.envName);

// Instantiate the HTTP Server
const httpServer = http.createServer(function(req, res){
  unifiedServer(req, res);
});

// Start the HTTP server
httpServer.listen(config.httpPort, function(){
  console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`);
});

var httpsServerOptions = {
  'key' : fs.readFileSync('./https/key.pem'),
  'cert' : fs.readFileSync('./https/cert.pem')
};
// Instantiate the HTTPS Server
const httpsServer = https.createServer(httpsServerOptions, function(req, res){
  unifiedServer(req, res);
});


// Start the HTTPS server
httpsServer.listen(config.httpsPort, function(){
  console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`);
});


// All the server logic for http and https servers
var unifiedServer = function(req, res)
{
  // Get the url and parse it
  var parsedUrl = url.parse(req.url, true);

  // Get the path from the url
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g,'');

  // Get the query string as an object
  var queryStringObject = parsedUrl.query;

  //Get the HTTP method
  var method = req.method.toLowerCase();

  //Get the headers as an object
  var headers = req.headers;

  // Get the playload if any
  var decoder = new stringDecoder('utf-8');
  var buffer = '';

  req.on('data', function(data){
    buffer += decoder.write(data);
  });

  req.on('end', function(){
    buffer += decoder.end();

    //Choose the handler this request should go to.
    //If one is not notFound, use the not found handler
    var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

    //Construct the data object to send to the handler
    var data = {
      'trimmedPath' : trimmedPath,
      'queryStringObject' : queryStringObject,
      'method' : method,
      'headers' : headers,
      'payload' : helpers.parseJsonToObject(buffer)
    };

    //Route the request to the handler specified in the router
    chosenHandler(data, function(statusCode, payload){

      // Use the status code called back by the handler, or default
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

      // Use the payload called back by the handler, or default to empty
      payload = typeof(payload) == 'object' ? payload : {};

      // Convert the payload to a string
      var payloadString = JSON.stringify(payload);

      //return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

    });

  });
}


//Define a request router
var router = {
  'ping' : handlers.ping,
  'users' : handlers.users,
  'tokens' : handlers.tokens,
  'checks' : handlers.checks,
};
