//Library for storing and editing data

//Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for the module ( to be exported )
var lib = {};

//Base directory of the data folder
lib.baseDir = path.join(__dirname,'/../.data/');


//Write data to a file
lib.create = function(dir, file, data, callback )
{
  //Open file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', function(err, fileDescriptor){
    if(!err && fileDescriptor){
      //Convert data to string and write to file
      var stringData = JSON.stringify(data);

      //write to file and close it
      fs.writeFile(fileDescriptor, stringData, function(err){
        if(!err){
            fs.close(fileDescriptor, function(err){
              if(!err){
                callback(false);
              } else {
                callback('Error closing new file');
              }
            });
        } else {
          callback('Error writing to new file');
        }
      });
    } else {
      callback('could not create a new file, it may already exist');
    }
  });
  //fs.open(lib.baseDir + dir + '/' + file + '.json' , 'wx');
};

//Read data from a file
lib.read = function(dir,file,callback){
  fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf8', function(err, data){
    if(!err && data)
    {
      var parsedData = helpers.parseJsonToObject(data);
      callback(false,parsedData);
    } else {
      callback(err,data)
    }
;
  });
}

lib.update = function(dir, file, data, callback){
  //Open the file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+', function(err, fileDescriptor){
    if(!err && fileDescriptor)
    {
      var stringData = JSON.stringify(data);

      //Truncate the file
      fs.ftruncate(fileDescriptor, function(err){
        if(!err){
          //Write to the file and close it
          fs.writeFile(fileDescriptor, stringData, function(err){
            if(!err)
            {
              fs.close(fileDescriptor, function(err){
                if(!err)
                {
                  callback(false);
                }
                else
                {
                  callback('There was an error closing the file');
                }
              })
            }
            else
            {
              callback('Error writing to existing file');
            }
          });
        } else {
          callback('Error truncating file');
        }
      });
    } else {
      callback('Could not open the file , it may not exist yet');
    }

  } )
}

//Delete a file
lib.delete = function(dir, file, callback){
  //Unlink the file
  fs.unlink(`${lib.baseDir}${dir}/${file}.json`, function(err){
    if(!err)
    {
      callback(false);
    }
    else
    {
      callback('Error deleting the file ');
    }
  });
};

module.exports = lib;
