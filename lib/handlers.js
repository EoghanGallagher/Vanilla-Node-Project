//Request Handlers


//Dependencies
var _data = require('./data');
var helpers = require('./helpers');

//Define handlers
var handlers = {};

handlers.users = function(data, callback){
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.indexOf(data.method) > -1)
  {
    handlers._users[data.method](data, callback);
  }
  else
  {
    callback(405);
  }
};

//Container for the users sub methods
handlers._users = {};

// Users - Post
// Required data: firstname , lastname , phone, password, tosAgreement
//optional data none
handlers._users.post = function(data,callback){

  //Check that all fields are filled out
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if(firstName && lastName && phone && password && tosAgreement )
  {
    //Make sure user doesnt already exists
    _data.read('users', phone, function(err, data){

      if(err)
      {
          //Hash the password
          var hashedPassword = helpers.hash(password);

          if(hashedPassword)
          {
            //create the user object
            var userObject = {
              'firstName' : firstName,
              'lastName' : lastName,
              'phone' : phone,
              'hashedPassword' : hashedPassword,
              'tosAgreement' : tosAgreement
            };

            //Store the users
            _data.create('users', phone, userObject, function(err){
              if(!err)
              {
                callback(200);
              } else {
                console.log(err);
                callback(500,{'Error' : 'Could not create the new user'});
              }
            });
          } else {
            callback(500, {'Error' : 'Failed to hash the user\'s password'})
          }

      } else {
        //User already exists
        callback(400,{'Error' : 'A user with that phone number already exists'});
      }
    });

  } else {
    callback(400,{'Error' : 'Missing Required Fields'});
  }
};

// Users - Get
//Require data: phone
//Optional data none
//@TODO Only let an authenticated user access their object .
handlers._users.get = function(data,callback){

    //Check Phone number is valid
     var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

     if(phone)
     {
       //Look Up the user
       _data.read('users', phone, function(err, data){
         if(!err && data){
           //Remove hashed password from the user object before returning to user
           delete data.hashedPassword;
           callback(200,data);
         } else {
           callback(404);
         }
       });
     } else {
       callback(400, {'Error' : 'Missing required field'})
     }
};

// Users - Put
// Required Data:  user Phone
//Optional Data: firstName lastName password (at least one must be specified)
//@TODO Only let an authenticated user update their own data .
handlers._users.put = function(data,callback){

  //check for required field
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

  //Check for optional Fields
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  //error if phone is invalid
  if(phone)
  {
    //Error if nothiing is sent to update
    if(firstName || lastName || password)
    {
      //Find user
      _data.read('users',phone,function(err, userData){
        if(!err && userData){
          //Update Fields
          if(firstName){ userData.firstName = firstName; }

          if(lastName){ userData.lastName = lastName; }

          if(password){ userData.password = helpers.hash(password); }

          //Store the new Updates
          _data.update('users', phone, userData, function(err){
            if(!err){
              callback(200);
            } else {
              callback(500, {'Error' : 'Could not update the user'});
            }
          });

        } else {
            callback(400, {'Error' : 'That user does not exist'});
        }
      });


    } else {
      callback(400, {'Error' : 'Missing fields to update'});
    }

  } else {
    callback(400, {'Error' : 'Missing required field'});
  }

};

// Users - Delete
//Required Field : Phone
//@TODO Only let an authenticated user access their own object .
//@TODO Cleanup (delete) any other data files associated with this user .
handlers._users.delete = function(data,callback){
  //Check that phone num is valid

   var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

   if(phone)
   {
     //Look Up the user
     _data.read('users', phone, function(err, data){
       if(!err && data){
         //Delete the user
         _data.delete('users', phone, function(err){
           if(!err)
           {
             callback(200);
           } else {

            callback(500, {'Error' : 'Could not delete the specified user'});
           }
         });
    
       } else {
         callback(400, {'Error' : 'Could not find specified user'});
       }
     });
   } else {
     callback(400, {'Error' : 'Missing required field'})
   }
};

//Ping Handler
handlers.ping = function(data, callback){

  // Callback a http status code, and a payload object
  callback(200);

};

//handlers not found
handlers.notFound = function(data, callback){
  console.log('Not Found');
  callback(404);
};


module.exports = handlers;
