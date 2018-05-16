// Helpers for various tasks


//Dependencies
var crypto = require('crypto');
var config = require('./config');

// Container for all Helpers
var helpers = {};

helpers.hash = function(str){
  if(typeof(str) === 'string' && str.length > 0)
  {
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

// Parse a JSON string to an object in all cases without throwing
helpers.parseJsonToObject = function(str){
  try
  {
    var obj = JSON.parse(str);
    return obj;
  }
  catch(e)
  {
    return {};
  }
};


//Function that allows us to create a string of
//random alpha numeric chars of a random length
helpers.createRandomString = function(strLength){
  var str = "";
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
  if(strLength){
    // Define all the possible characters that could go into a string
    var possibleCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(var i = 0; i < strLength; i++) {
        str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

    }
    return str;
  } else {
    return false;
  }

};



//Export the module

module.exports = helpers;
