'use strict';

var fs = require('fs');
var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');
var request = require('request');
var _ = require('lodash');

var versions = {
    v1: 'css',
    v2: 'sass',
    v3: 'es6'
};

// init generator
var BridgeTemplateGenerator = module.exports = function BridgeTemplateGenerator(args, options, config) {
    yeoman.generators.Base.apply(this, arguments);

    // install NPM dependencies at the end
    this.on('end', function () {
        this._checkVersion();
        this.installDependencies({
            npm: true,
            bower: true,
            skipInstall: options['skip-install']
        });
    });

    // read main package.json to get some
    this.pkg = JSON.parse(this.readFileAsString(path.join(__dirname, '../package.json')));

    // try to read .bridge-apikey.json if it exists
    try {
        this.existingCfg = JSON.parse(this.readFileAsString(path.join(this.destinationRoot(), '.bridge-apikey.json')));
    } catch (e) {
        // default values if config file doesn't exist
        this.existingCfg = {};
    }

    this.githubVersionTag = '';
    this.githubVersionCommit = '';
};

util.inherits(BridgeTemplateGenerator, yeoman.generators.Base);

// main contents
BridgeTemplateGenerator.prototype.askFor = function askFor() {
    var cb = this.async();

    //Get the last live version
    this._getGithubVersion();

    // have Yeoman greet the user.
    console.log(this.yeoman);
    this.log.info('I will set-up all the needed resources for testing and uploading template.');
    this.log.info('You will need an API key ("write_template") and a template slot if you want to be able to upload your template with `grunt upload`.');
    this.log.info('if you have any questions regarding this generator, feel free to contact us at contact@leadformance.com');

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
            // API key - mandatory
            type: 'input',
            name: 'apiKey',
            message: 'In order to user `grunt upload`, I need your API key for that template (with "write_template" rights):',
            default: this.existingCfg.apiKey,
            validate: function (value) {
                return true;
            }
        }
    ];

    // make answers available for next functions (specifically .template)
    this.prompt(prompts, function (props) {
        this.templateType = props.templateType;
        this.apiKey = props.apiKey;

        // init templateSlot only if there is an apiKey
        if (this.apiKey != '') {
            // make serverUrls array available
            this.serverUrls = serverUrls;
            this.existingCfg.templateSlot = parseInt(this.existingCfg.templateSlot);
            this.forceSSL = true;
            this._getApiDetails(function (data, err) {
                if (data !== null && data !== undefined) {
                    this._getApiDetailsPromptServers(data);
                    // if API does not work (wrong key / url), display error
                } else {
                    this.log.info("Issue with SSL certificates, switching to No-SSL mode...");
                    this.forceSSL = false;
                    this._getApiDetails(function (data, err) {
                        if (data !== null && data !== undefined) {
                            this._getApiDetailsPromptServers(data);
                            // if API does not work (wrong key / url), display error
                        } else this.log.error(err);
                    }.bind(this));
                }
            }.bind(this));
        } else {
            this.serverUrl = "";
            this.templateSlot = "";
            this.templateSlotName = "";
            cb();
        }
    }.bind(this));
};

// find server and available template slots based on API key
BridgeTemplateGenerator.prototype._getGithubVersion = function _getGithubVersion() {
    request.get({
        url: 'https://api.github.com/repos/Leadformance/generator-bridge-template/tags',
        json: true,
        timeout: 5000,
        headers: {'User-Agent': 'request'}
    }, function (error, response, data) {
        if (!error && response.statusCode == 200) {
            if (data !== null || data !== undefined) {
                this.githubVersionTag = data[0].name;
                this.githubVersionCommit = data[0].commit.sha;
            }
        }
    }.bind(this));

};

// display the prompt to choose the server
BridgeTemplateGenerator.prototype._getApiDetailsPromptServers = function _getApiDetailsPromptServers(data) {
    var cb = this.async();

    this.log.info("Allright, your key is valid on " + _.find(this.serverUrls, {value: this.serverUrl}).name + "! I am now grabbing available template slots...");
    var templateSlots = [];
    var templateSlotsName = [];
    // loop over the template API response, orderered by latest created
    _(data)
        .sortBy(function (slot) {
            return slot.id;
        })
        .reverse()
        .forEach(function (slot) {
            // and push each template into the prompt
            templateSlots.push(
                {
                    name: slot.name + ' (' + slot.id + ')',
                    value: slot.id
                }
            );
            templateSlotsName[slot.id] = slot.name;
        });

    var promptTemplateId = [
        {
            // select template ID from API results
            type: 'list',
            name: 'templateSlot',
            message: 'Which template slot do you want to use?',
            default: _.findIndex(templateSlots, {value: this.existingCfg.templateSlot}),
            choices: templateSlots
        }
    ];

    this.prompt(promptTemplateId, function (props) {
        this.templateSlot = props.templateSlot;
        this.templateSlotName = templateSlotsName[this.templateSlot];

        // now that we have all our answers, continue with cb()
        cb();
    }.bind(this));
};

// find server and available template slots based on API key
BridgeTemplateGenerator.prototype._getApiDetails = function _getApiDetails(callback) {

    if (this.forceSSL) this.log.info("Howdy, I am testing your API key on our servers! This could take up to 30s, please be patient...");

    var apiFailCounter = 0;
    var apiErrorCounter = 0;
    var apiRequestCounter = 0;
    var ln = this.serverUrls.length;
    var dataSaved;
    var apiServerInError = [];

    // loop through all the servers
    _.forEach(this.serverUrls, function (serverUrl) {
        var url = serverUrl.value + '/templates.json?oauth_token=' + this.apiKey;
        // and try them until we find the one on which the API key is valid
        request.get({url: url, json: true, strictSSL: this.forceSSL}, function (error, response, data) {
            apiRequestCounter++;

            // process response after each request
            if (error) {
                apiErrorCounter++;
                apiServerInError.push(serverUrl.name + '->' + error);
            } else if (!error && response.statusCode == 401) {
                apiFailCounter++;
                apiServerInError.push(serverUrl.name + '->Error Status 401');
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
                    callback(null, "API Error on all servers, the API seems to be unavailable. Make sure you're connected to the Internet, and try again in few minutes.");
                    // we cycled through all servers without finding a valid one
                } else if (apiFailCounter == ln) {
                    callback(null, "API Error on server(s) '" + apiServerInError.join() + "', your API key seems to be wrong. Check your key and try again.");
                    // we got other error (probably because of wrong key)
                } else {
                    callback(null, "API Error on server(s) '" + apiServerInError.join() + "', something unexpected happened. Check your key, try again, and contact us if it fails again.");
                }
            }

        }.bind(this));
    }, this);

};

// copy main tasks files
BridgeTemplateGenerator.prototype.app = function app() {
    this._versionPath = getGeneratorVersion();

    this.copy(path.join(this._versionPath, 'package.json'), 'package.json');
    this.copy(path.join(this._versionPath, 'Gruntfile.js'), 'Gruntfile.js');
    this.copy(path.join(this._versionPath, 'gitignore'), '.gitignore');

    if (!_.isEqual(this._versionPath, versions.v1)) {
        this.copy(path.join(this._versionPath, '.jshintrc'), '.jshintrc');
        this.copy(path.join(this._versionPath, '.scss-lint.yml'), '.scss-lint.yml');
    }
};

// generate config file based on prompt answers
BridgeTemplateGenerator.prototype.apikey = function apikey() {
    this._sleep(5000);
    this.template(path.join(this._versionPath, '_bridge-apikey.json'), '.bridge-apikey.json');
};

// create a wait loop
BridgeTemplateGenerator.prototype._sleep = function _sleep(milliSeconds) {
    var startTime = new Date().getTime();
    while (new Date().getTime() < startTime + milliSeconds);
};

// check is version is up to date and inform the user
BridgeTemplateGenerator.prototype._checkVersion = function _checkVersion() {
    if (this.pkg._resolved !== undefined) {
        var _resolved_array = this.pkg._resolved.split("#");
        if (_resolved_array.length >= 2) {
            if (_resolved_array[1] !== this.githubVersionCommit) {
                this.log.info('You have an old version, please run npm install to get the last version released on github as ' + this.githubVersionTag + ' commit(' + this.githubVersionCommit + ')');
            } else {
                this.log.info('Your version is up to date');
            }
        }
    }
};

function getGeneratorVersion() {
    if (findFiles('.', /\.scss$/).length) {
        // if there is a jsLiquid file it's the first Sass version
        if (findFiles('.', /jsliquid\.html$/).length) {
            return versions.v2;
        }
        // elsewhere it's the new ES6
        return versions.v3;
    }
    // if there is no scss files, it's the old grunt
    else {
        return versions.v1;
    }
}

function findFiles(startPath, filter) {
    var results= [];

    if (!fs.existsSync(startPath)){
        return;
    }

    var files = fs.readdirSync(startPath);

    for(var i = 0; i < files.length; i++) {
        var filename = path.join(startPath, files[i]);
        var stat = fs.lstatSync(filename);

        if (stat.isDirectory()){
            results = results.concat(findFiles(filename, filter));
        }
        else if (filter.test(filename)) {
            results.push(filename);
        }
    }

    return results;
}
