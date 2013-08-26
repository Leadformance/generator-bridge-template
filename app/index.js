'use strict';
var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');

var BridgeTemplateGenerator = module.exports = function BridgeTemplateGenerator(args, options, config) {
  yeoman.generators.Base.apply(this, arguments);

  this.on('end', function () {
    this.installDependencies({ bower: false, npm: true, skipInstall: options['skip-install'] });
  });

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

BridgeTemplateGenerator.prototype.askFor = function askFor() {
  var cb = this.async();

  // have Yeoman greet the user.
  console.log(this.yeoman);
  console.log('I will download the latest Bridge starter template, and set-up Grunt tasks for testing and uploading template.\nYou will need an API key ("write_template") and a template slot if you want to upload your template with `grunt upload`.\nv' + this.pkg.version + '\n');

  var templateTypes = [
    {
      name: "Desktop starter template",
      value: "http://cl.ly/1c3N130Q3B1X/download/template.tar.gz"
    },
    {
      name: "Mobile template",
      value: "mobile-template-latest.zip"
    },
    {
      name: "Facebook template",
      value: "facebook-template-latest.zip"
    },
    {
      name: "No template, I just want to set-up the Grunt tasks",
      value: ""
    }
  ];

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

  var prompts = [
/*    {
      type: 'list',
      name: 'templateType',
      message: 'What kind of template do you want to use?',
      default: 0,
      choices: templateTypes
    },
*/    {
      type: 'input',
      name: 'apiKey',
      message: 'Paste the "write_template" API key for that template:',
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
      type: 'list',
      name: 'serverUrl',
      message: 'On which server is it?',
      default: this._.findIndex(serverUrls, { value: this.existingCfg.serverUrl }),
      choices: serverUrls
    },
    {
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

  this.prompt(prompts, function (props) {
    this.apiKey = props.apiKey;
    this.serverUrl = props.serverUrl;
    this.templateSlot = props.templateSlot;
    this.templateType = props.templateType;

    cb();
  }.bind(this));
};

BridgeTemplateGenerator.prototype.app = function app() {
  this.copy('package.json', 'package.json');
  this.copy('Gruntfile.js', 'Gruntfile.js');
  this.copy('gitignore', '.gitignore');
};

BridgeTemplateGenerator.prototype.projectfiles = function projectfiles() {
  this.template('_bridge-apikey.json', '.bridge-apikey.json');
};

BridgeTemplateGenerator.prototype.fetchTemplate = function fetchTemplate() {
  var cb = this.async();
  var destinationRoot = this.destinationRoot();

  if (this.templateType != '') {
    console.log("Downloading " + this.templateType + " in path: " + destinationRoot);
      this.tarball(this.templateType, process.cwd(), function (err) {
      // this.bowerInstall(this.templateType, {}, function (err) {
      if (err) {
        throw err;
      }
    });
  }

/*  this.remote('julienma', 'Bridget', function (err, remote) {
    if (err) {
      return cb(err);
    }
    remote.directory('build', path.join(destinationRoot, 'build'));
    cb();
  });*/
};
