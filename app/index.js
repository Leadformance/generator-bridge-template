'use strict';
var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');

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
      name: "Desktop starter template",
      value: "http://tools.leadformance.com/templates/starter-template-latest.tar.gz"
    },
    {
      name: "Mobile template",
      value: "http://tools.leadformance.com/templates/mobile-template-latest.tar.gz"
    },
    {
      name: "Facebook template",
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
        if(value != '') {
          return true;
        } else {
          return "Please enter the full API key";
        }
      }
    },
    {
      // API server on which the key is created
      type: 'list',
      name: 'serverUrl',
      message: 'On which server is this key created?',
      default: this._.findIndex(serverUrls, { value: this.existingCfg.serverUrl }),
      choices: serverUrls
    },
    {
      // id of the template slot to upload the template to
      type: 'input',
      name: 'templateSlot',
      message: 'What is the template slot ID?',
      default: this.existingCfg.templateSlot,
      validate: function( value ) {
        var valid = !isNaN(parseFloat(value));
        return valid || "Please enter a number";
      },
      filter: Number
    },
  ];

  // make answers available for next functions (specifically .template)
  this.prompt(prompts, function (props) {
    this.apiKey = props.apiKey;
    this.serverUrl = props.serverUrl;
    this.templateSlot = props.templateSlot;
    this.templateType = props.templateType;

    cb();
  }.bind(this));
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
  var cb = this.async();

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
      cb();
    });
  }
};
