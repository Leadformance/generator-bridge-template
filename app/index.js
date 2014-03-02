'use strict';
var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');
var request = require('request');
var _ = require('lodash');

// init generator
var BridgeTemplateGenerator = module.exports = function BridgeTemplateGenerator(args, options, config) {
  yeoman.generators.Base.apply(this, arguments);

  // install NPM dependencies at the end
  this.on('end', function () {
    this.installDependencies({ bower: false, npm: true, skipInstall: options['skip-install'] });
  });

  // read main package.json to get some
  this.pkg = JSON.parse(this.readFileAsString(path.join(__dirname, '../package.json')));

  // try to read .bridge-apikey.json if it exists
  try {
    this.existingCfg = JSON.parse(this.readFileAsString(path.join(this.destinationRoot(), '.bridge-apikey.json')));
  } catch (e) {
    // default values if config file doesn't exist
    this.existingCfg = '';
  }
};

util.inherits(BridgeTemplateGenerator, yeoman.generators.Base);

// main contents
BridgeTemplateGenerator.prototype.askFor = function askFor() {
  var cb = this.async();

  // have Yeoman greet the user.
  console.log(this.yeoman);
  this.log.info('I will download the latest Bridge starter template, and set-up Grunt tasks for testing and uploading template.');
  this.log.info('You will need an API key ("write_template") and a template slot if you want to upload your template with `grunt upload`.');
  this.log.info('(v' + this.pkg.version + ')\n');

  // download path for starter templates
  var templateTypes = [
    // value 'none' will not download anything
    {
      name: "No thanks, I already have an existing template. I just want the Grunt tasks.",
      value: "none"
    },
    {
      name: "Desktop starter template - OVERWRITE files in the current dir",
      value: "http://tools.leadformance.com/templates/starter-template-latest.tar.gz"
    },
    {
      name: "Mobile template - OVERWRITE files in the current dir",
      value: "http://tools.leadformance.com/templates/mobile-template-latest.tar.gz"
    },
    {
      name: "Facebook template - OVERWRITE files in the current dir",
      value: "http://tools.leadformance.com/templates/facebook-template-latest.tar.gz"
    }
  ];

  // Bridge API URLs (for config file)
  var serverUrls = [
    {
      name: "Integrator (.i)",
      value: "https://api.i.leadformance.com"
    },
    {
      name: "Internal QA (.q)",
      value: "https://api.q.leadformance.com"
    },
    {
      name: "Client QA (.c)",
      value: "https://api.c.leadformance.com"
    },
    {
      name: "Staging (.s)",
      value: "https://api.s.leadformance.com"
    },
    {
      name: "Preproduction (.p)",
      value: "https://api.p.leadformance.com"
    }
  ];

  // define prompts
  var prompts = [
    {
      // chose a default template to start with
      type: 'list',
      name: 'templateType',
      message: 'Do you want to automatically scaffold a generic, starter template (will be available in current directory)?',
      default: 0,
      choices: templateTypes
    },
    {
      // API key - mandatory
      type: 'input',
      name: 'apiKey',
      message: 'In order to user `grunt upload`, I need your API key for that template (with "write_template" rights):',
      default: this.existingCfg.apiKey,
      validate: function( value ){
        if(value !== '') {
          return true;
        } else {
          return "Please enter the full API key";
        }
      }
    }
  ];

  // make answers available for next functions (specifically .template)
  this.prompt(prompts, function (props) {
    this.templateType = props.templateType;
    this.apiKey = props.apiKey;

    // make serverUrls array available
    this.serverUrls = serverUrls;

    this._getApiDetails(function(data, err) {
      if(data !== null || data !== undefined) {
        this.log.info("Allright, your key is valid on " + _.find(serverUrls, { value: this.serverUrl }).name + "! I am now grabbing available template slots...");
        var templateSlots = [];
        // loop over the template API response, orderered by latest created
        _(data)
          .sortBy(function(slot) {
            return slot.id;
          })
          .reverse()
          .forEach(function(slot) {
            // and push each template into the prompt
            templateSlots.push(
              {
                name: slot.name + ' (' + slot.id + ')',
                value: slot.id
              }
            );
          });

        var promptTemplateId = [
          {
            // select template ID from API results
            type: 'list',
            name: 'templateSlot',
            message: 'Which template slot do you want to use?',
            default: _.findIndex(templateSlots, { value: this.existingCfg.templateSlot }),
            choices: templateSlots
          }
        ];

        this.prompt(promptTemplateId, function (props) {
          this.templateSlot = props.templateSlot;

          // now that we have all our answers, continue with cb()
          cb();
        }.bind(this));
      // if API does not work (wrong key / url), display error
      } else this.log.error(err);
    }.bind(this));
  }.bind(this));
};

// find server and available template slots based on API key
BridgeTemplateGenerator.prototype._getApiDetails = function _getApiDetails(callback) {

  this.log.info("Howdy, I am testing your API key on our servers! This could take up to 30s, please be patient...");

  var apiFailCounter = 0;
  var apiErrorCounter = 0;
  var apiRequestCounter = 0;
  var ln = this.serverUrls.length;
  var dataSaved;

  // loop through all the servers
  _.forEach(this.serverUrls, function(serverUrl) {
    var url = serverUrl.value + '/templates.json?oauth_token=' + this.apiKey;
    // and try them until we find the one on which the API key is valid
    request.get({url: url, json: true}, function (error, response, data) {
      apiRequestCounter++;

      // process response after each request
      if (error) {
        apiErrorCounter++;
      } else if (!error && response.statusCode == 401) {
        apiFailCounter++;
      } else if (!error && response.statusCode == 200 && data[0].id !== undefined) {
        // we got an answer, and it's actually a valid one
        this.serverUrl = serverUrl.value;
        dataSaved = data;
      }

      // once we processed ALL requests...
      if (apiRequestCounter == ln) {
        // we have a valid server!
        if (this.serverUrl !== undefined) {
          callback(dataSaved, null);
        // we cycled through all servers and had errors with each one
        } else if (apiErrorCounter == ln) {
          callback(null, "API Error, the API seems to be unavailable. Make sure you're connected to the Internet, and try again in few minutes.");
        // we cycled through all servers without finding a valid one
        } else if (apiFailCounter == ln) {
          callback(null, "API Error, your API key seems to be wrong. Check your key and try again.");
        // we got other error (probably because of wrong key)
        } else {
          callback(null, "API Error, something unexpected happened. Check your key, try again, and contact us if it fails again.");
        }
      }

    }.bind(this));
  }, this);

};

// copy main tasks files
BridgeTemplateGenerator.prototype.app = function app() {
  this.copy('package.json', 'package.json');
  this.copy('Gruntfile.js', 'Gruntfile.js');
  this.copy('gitignore', '.gitignore');
};

// generate config file based on prompt answers
BridgeTemplateGenerator.prototype.apikey = function apikey() {
  this.template('_bridge-apikey.json', '.bridge-apikey.json');
};

// fetch starter templates remotely
BridgeTemplateGenerator.prototype.fetchTemplate = function fetchTemplate() {
  // if user chose a template to download (not 'false')
  if (this.templateType != "none") {
    var self = this;
    // download tar.gz'd template in cwd
    this.tarball(this.templateType, this.destinationRoot(), function (err) {
      if (err) {
        self.log.error('Cannot download template from remote. Check your internet connection and try again.');
        throw err;
      }
      self.log.create("Starter template files created in current directory, now move on!");
    });
  }
};
