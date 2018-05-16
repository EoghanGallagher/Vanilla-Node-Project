//Create and export config variables

// Container for all environments

var environments = {};

//Staging default evnvironment
environments.staging =  {
  'httpPort' : 3000,
  'httpsPort' : 3001,
  'envName' : 'staging',
  'hashingSecret' : 'my big secret',
  'maxChecks' : 5
};

//Production evnvironment
environments.production = {
  'httpPort' : 5000,
  'httpsPort' : 5001,
  'envName' : 'production',
  'hashingSecret' : 'my big secret',
  'maxChecks' : 5
};

// Determine which environment to export
//which was passed as a command line arg
var currentEnv = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

console.log(currentEnv);

// Check that the current env is one of the env's above. if not default to Staging
var environmentToExport = typeof(environments[currentEnv]) == 'object' ? environments[currentEnv] : environments.staging;


//Export the module
module.exports = environmentToExport;
