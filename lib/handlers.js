//Request Handlers


//Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');

//Define handlers
var handlers = {};

//users
handlers.users = function(data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

//Container for the users sub methods
handlers._users = {};

// Users - Post
// Required data: firstname , lastname , phone, password, tosAgreement
//optional data none
handlers._users.post = function(data, callback) {

  //Check that all fields are filled out
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  console.log(firstName + ' ' + lastName + ' ' + phone + ' ' + password + ' ' + tosAgreement);

  if (firstName && lastName && phone && password && tosAgreement) {
    //Make sure user doesnt already exists
    _data.read('users', phone, function(err, data) {

      if (err) {
        //Hash the password
        var hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          //create the user object
          var userObject = {
            'firstName': firstName,
            'lastName': lastName,
            'phone': phone,
            'hashedPassword': hashedPassword,
            'tosAgreement': tosAgreement
          };

          //Store the users
          _data.create('users', phone, userObject, function(err) {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, {
                'Error': 'Could not create the new user'
              });
            }
          });
        } else {
          callback(500, {
            'Error': 'Failed to hash the user\'s password'
          })
        }

      } else {
        //User already exists
        callback(400, {
          'Error': 'A user with that phone number already exists'
        });
      }
    });

  } else {
    callback(400, {
      'Error': 'Missing Required Fields'
    });
  }
};

// Required data: phone
// Optional data: none
handlers._users.get = function(data, callback) {
  // Check that phone number is valid
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if (phone) {

    // Get token from headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', phone, function(err, data) {
          if (!err && data) {
            // Remove the hashed password from the user user object before returning it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          "Error": "Missing required token in header, or token is invalid."
        })
      }
    });
  } else {
    callback(400, {
      'Error': 'Missing required field'
    })
  }
};


// Users - Put

// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = function(data, callback) {
  // Check for required field
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

  // Check for optional fields
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // Error if phone is invalid
  if (phone) {
    // Error if nothing is sent to update
    if (firstName || lastName || password) {

      // Get token from headers
      var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

      // Verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
        if (tokenIsValid) {

          // Lookup the user
          _data.read('users', phone, function(err, userData) {
            if (!err && userData) {
              // Update the fields if necessary
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
              // Store the new updates
              _data.update('users', phone, userData, function(err) {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, {
                    'Error': 'Could not update the user.'
                  });
                }
              });
            } else {
              callback(400, {
                'Error': 'Specified user does not exist.'
              });
            }
          });
        } else {
          callback(403, {
            "Error": "Missing required token in header, or token is invalid."
          });
        }
      });
    } else {
      callback(400, {
        'Error': 'Missing fields to update.'
      });
    }
  } else {
    callback(400, {
      'Error': 'Missing required field.'
    });
  }

};

// Required data: phone
// Cleanup old checks associated with the user
handlers._users.delete = function(data,callback){
  // Check that phone number is valid
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){

    // Get token from headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
      if(tokenIsValid){
        // Lookup the user
        _data.read('users',phone,function(err,userData){
          if(!err && userData){
            // Delete the user's data
            _data.delete('users',phone,function(err){
              if(!err){
                // Delete each of the checks associated with the user
                var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                var checksToDelete = userChecks.length;
                if(checksToDelete > 0){
                  var checksDeleted = 0;
                  var deletionErrors = false;
                  // Loop through the checks
                  userChecks.forEach(function(checkId){

                    console.log(checkId);
                    // Delete the check
                    _data.delete('checks',checkId,function(err){
                      if(err){
                        deletionErrors = true;
                      }
                      checksDeleted++;
                      if(checksDeleted == checksToDelete){
                        if(!deletionErrors){
                          callback(200);
                        } else {
                          callback(500,{'Error' : "Errors encountered while attempting to delete all of the user's checks. All checks may not have been deleted from the system successfully."})
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500,{'Error' : 'Could not delete the specified user'});
              }
            });
          } else {
            callback(400,{'Error' : 'Could not find the specified user.'});
          }
        });
      } else {
        callback(403,{"Error" : "Missing required token in header, or token is invalid."});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};




//Tokens
handlers.tokens = function(data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

//Container for all the tokens methods
handlers._tokens = {};

//Tokens - post
//Required Data: phone ,password
//Optional Data: none
handlers._tokens.post = function(data, callback) {

  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  if (phone && password) {
    //Lookup user that matches the phone number
    _data.read('users', phone, function(err, userData) {
      if (!err && password) {
        //Hash the sent password, and compare it to the password stored in the user userObject
        var hashedPassword = helpers.hash(password);

        if (hashedPassword == userData.hashedPassword) {
          //if valid create a new token with a random name, set expiration 1 hour in the future
          var tokenId = helpers.createRandomString(20);
          console.log('TOKEN: ' + tokenId);

          var expires = Date.now() + 1000 * 60 * 60;

          var tokenObject = {
            'phone': phone,
            'id': tokenId,
            'expires': expires
          };

          //Store Token
          _data.create('tokens', tokenId, tokenObject, function(err) {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, {
                'Error': 'Could not create the new token'
              });
            }
          });

        } else {
          callback(400, {
            'Error': 'Password did not match the specified user\'s stored password'
          });
        }

      } else {
        callback(400, {
          'Error': 'Could not find specified user'
        });
      }
    });

  } else {
    callback(400, {
      'Error': 'Missing required field'
    });
  }


};

//Tokens - get
//Required Data : id
//Optional Data : none
handlers._tokens.get = function(data, callback) {
  //Check that the id is valid
  //Check Phone number is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

  console.log(id);

  if (id) {
    //Look Up the user
    _data.read('tokens', id, function(err, tokenData) {
      if (!err && tokenData) {
        //Remove hashed password from the user object before returning to user

        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, {
      'Error': 'Missing required field'
    })
  }
};


//Tokens - put
//Required Fields : id, extend
//Optional data : none
handlers._tokens.put = function(data, callback) {
  var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

  if (id && extend) {
    // Lookup the existing token
    _data.read('tokens', id, function(err, tokenData) {
      if (!err && tokenData) {
        // Check to make sure the token isn't already expired
        if (tokenData.expires > Date.now()) {
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          // Store the new updates
          _data.update('tokens', id, tokenData, function(err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, {
                'Error': 'Could not update the token\'s expiration.'
              });
            }
          });
        } else {
          callback(400, {
            "Error": "The token has already expired, and cannot be extended."
          });
        }
      } else {
        callback(400, {
          'Error': 'Specified user does not exist.'
        });
      }
    });
  } else {
    callback(400, {
      "Error": "Missing required field(s) or field(s) are invalid."
    });
  }


};

//Tokens - delete
//Require field : ID
//Optional data : none
handlers._tokens.delete = function(data, callback) {

  console.log(data.queryStringObject.id);

  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

  console.log(id);

  if (id) {
    //Look Up the user
    _data.read('tokens', id, function(err, data) {
      if (!err && data) {
        //Delete the user
        _data.delete('tokens', id, function(err) {
          if (!err) {
            callback(200);
          } else {

            callback(500, {
              'Error': 'Could not delete the specified Token'
            });
          }
        });

      } else {
        callback(400, {
          'Error': 'Could not find specified Token'
        });
      }
    });
  } else {
    callback(400, {
      'Error': 'Missing required field'
    })
  }
};


// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id, phone, callback) {
  // Lookup the token
  _data.read('tokens', id, function(err, tokenData) {
    if (!err && tokenData) {
      // Check that the token is for the given user and has not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};



//Container for all the checks methods
handlers._checks = {};
//checks
// Checks
handlers.checks = function(data,callback){
  var acceptableMethods = ['post','get','put','delete'];
  if(acceptableMethods.indexOf(data.method) > -1){
    handlers._checks[data.method](data,callback);
  } else {
    callback(405);
  }
};


//Post
//Required Data: protocol, url, method, successCodes, timeoutSeconds
//optional: none

handlers._checks.post = function(data, callback) {


  // Validate inputs
  var protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {

    // Get token from headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    //look up user by reading the token
    _data.read('tokens', token, function(err, tokenData) {
      if (!err && tokenData) {
        var userPhone = tokenData.phone;

        //lookup the user
        _data.read('users', userPhone, function(err, userData) {
          if (!err && userData) {
            var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

            //verify user checks is less than max (5 by default)
            if (userChecks.length < config.maxChecks) {

              // Create random id for check
              var checkId = helpers.createRandomString(20);

              // Create check object including userPhone
              var checkObject = {
                'id': checkId,
                'userPhone': userPhone,
                'protocol': protocol,
                'url': url,
                'method': method,
                'successCodes': successCodes,
                'timeoutSeconds': timeoutSeconds
              };

              // Save the object
              _data.create('checks', checkId, checkObject, function(err) {
                if (!err) {
                  // Add check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new user data
                  _data.update('users', userPhone, userData, function(err) {
                    if (!err) {
                      // Return the data about the new check
                      callback(200, checkObject);
                    } else {
                      callback(500, {
                        'Error': 'Could not update the user with the new check.'
                      });
                    }
                  });
                } else {
                  callback(500, {
                    'Error': 'Could not create the new check'
                  });
                }
              });


            } else {
              callback(400, {
                'Error': `User already has maximum number of checks which is ${config.maxChecks}`
              });
            }


          } else {
            callback(403, {
              "Error": "Missing user"
            });
          }
        });


      } else {
        callback(403, {
          "Error": "Missing required token in header, or token is invalid."
        });
      }
    });

  } else {
    callback(400, {
      'Error': 'Missing required inputs or inputs are invalid.'
    });
  }


};

//Get
//Required Fields : // ID
//Optional Fields : none
handlers._checks.get = function(data,callback){
  // Check that id is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    // Lookup the check
    _data.read('checks',id,function(err,checkData){
      if(!err && checkData){
        // Get the token that sent the request
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid and belongs to the user who created the check
        console.log("This is check data",checkData);
        handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
          if(tokenIsValid){
            // Return check data
            callback(200,checkData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field, or field invalid'})
  }
};



// Checks - put
// Required data: id
// Optional data: protocol,url,method,successCodes,timeoutSeconds (one must be sent)
handlers._checks.put = function(data,callback){
  // Check for required field
  var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

  // Check for optional fields
  var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  // Error if id is invalid
  if(id){
    // Error if nothing is sent to update
    if(protocol || url || method || successCodes || timeoutSeconds){
      // Lookup the check
      _data.read('checks',id,function(err,checkData){
        if(!err && checkData){
          // Get the token that sent the request
          var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
          // Verify that the given token is valid and belongs to the user who created the check
          handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
            if(tokenIsValid){
              // Update check data where necessary
              if(protocol){
                checkData.protocol = protocol;
              }
              if(url){
                checkData.url = url;
              }
              if(method){
                checkData.method = method;
              }
              if(successCodes){
                checkData.successCodes = successCodes;
              }
              if(timeoutSeconds){
                checkData.timeoutSeconds = timeoutSeconds;
              }

              // Store the new updates
              _data.update('checks',id,checkData,function(err){
                if(!err){
                  callback(200);
                } else {
                  callback(500,{'Error' : 'Could not update the check.'});
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(400,{'Error' : 'Check ID did not exist.'});
        }
      });
    } else {
      callback(400,{'Error' : 'Missing fields to update.'});
    }
  } else {
    callback(400,{'Error' : 'Missing required field.'});
  }
};


//Delete

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = function(data,callback){
  // Check that id is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    // Lookup the check
    _data.read('checks',id,function(err,checkData){
      if(!err && checkData){
        // Get the token that sent the request
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
          if(tokenIsValid){

            // Delete the check data
            _data.delete('checks',id,function(err){
              if(!err){
                // Lookup the user's object to get all their checks
                _data.read('users',checkData.userPhone,function(err,userData){
                  if(!err){
                    var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                    // Remove the deleted check from their list of checks
                    var checkPosition = userChecks.indexOf(id);
                    if(checkPosition > -1){
                      userChecks.splice(checkPosition,1);
                      // Re-save the user's data
                      userData.checks = userChecks;
                      _data.update('users',checkData.userPhone,userData,function(err){
                        if(!err){
                          callback(200);
                        } else {
                          callback(500,{'Error' : 'Could not update the user.'});
                        }
                      });
                    } else {
                      callback(500,{"Error" : "Could not find the check on the user's object, so could not remove it."});
                    }
                  } else {
                    callback(500,{"Error" : "Could not find the user who created the check, so could not remove the check from the list of checks on their user object."});
                  }
                });
              } else {
                callback(500,{"Error" : "Could not delete the check data."})
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400,{"Error" : "The check ID specified could not be found"});
      }
    });
  } else {
    callback(400,{"Error" : "Missing valid id"});
  }
};


//Ping Handler
handlers.ping = function(data, callback) {

  // Callback a http status code, and a payload object
  callback(200);

};

//handlers not found
handlers.notFound = function(data, callback) {
  console.log('Not Found');
  callback(404);
};


module.exports = handlers;
