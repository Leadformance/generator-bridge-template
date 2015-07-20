'use strict';

var fs = require('fs');
var path = require('path');
var util = require('util');
var yeoman = require('yeoman-generator');

var existingConfig = {};
var apiKey = '';

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

var gruntfilePath = path.join(__dirname, 'templates', 'gruntfiles');
var gruntfiles = {
    css: path.join(gruntfilePath, 'GruntfileCss.js'),
    es6: path.join(gruntfilePath, 'GruntfileEs6.js'),
    sass: path.join(gruntfilePath, 'GruntfileSass.js')
};

var BridgeTemplateGenerator = module.exports = function(args, options, config) {
    yeoman.generators.Base.apply(this, arguments);

    // install project dependencies at the end of the process
    this.on('end', function() {
        this.installDependencies({
            npm: true,
            bower: true
        });
    });

    // try to read .bridge-apikey.json if it exists
    try {
        existingConfig = JSON.parse(this.readFileAsString(path.join(this.destinationRoot(), '.bridge-apikey.json')));
    } catch (e) {
        existingConfig = {};
    }
};

util.inherits(BridgeTemplateGenerator, yeoman.generators.Base);

BridgeTemplateGenerator.prototype.askFor = function() {
    var cb = this.async();

    console.log(this.yeoman);
    this.log.info('I will set-up all the needed resources for testing and uploading template.');
    this.log.info('You will need an API key ("write_template") and a template slot if you want to be able to upload your template with `grunt upload`.');
    this.log.info('if you have any questions regarding this generator, feel free to contact us at contact@leadformance.com');

    var prompts = [
        {
            type: 'input',
            name: 'apiKey',
            message: 'In order to use `grunt upload`, I need your API key for that template (with "write_template" rights):',
            default: existingConfig.apiKey,
            validate: function () {
                return true;
            }
        }
    ];

    this.prompt(prompts, function (props) {
        apiKey = props.apiKey;

        if (apiKey !== '') {
            existingConfig.templateSlot = parseInt(existingConfig.templateSlot);
            this.forceSSL = true;

            this.getApiDetails(function (data, err) {
                if (data !== null && data !== undefined) {
                    this.getApiDetailsPromptServers(data);
                }
                // if API does not work (wrong key / url), display error
                else {
                    this.log.info("Issue with SSL certificates, switching to No-SSL mode...");
                    this.forceSSL = false;
                    this.getApiDetails(function (data, err) {
                        if (data !== null && data !== undefined) {
                            this.getApiDetailsPromptServers(data);
                        }
                        // if API does not work (wrong key / url), display error
                        else {
                            this.log.error(err);
                        }
                    }.bind(this));
                }
            }.bind(this));
        } else {
            cb();
        }
    }.bind(this));
};

// find server and available template slots based on API key
BridgeTemplateGenerator.prototype.getApiDetails = function (callback) {
    if (this.forceSSL) {
        this.log.info("Howdy, I am testing your API key on our servers! This could take up to 30s, please be patient...");
    }

    var apiFailCounter = 0;
    var apiErrorCounter = 0;
    var apiRequestCounter = 0;
    var ln = serverUrls.length;
    var dataSaved;
    var apiServerInError = [];

    // loop through all the servers
    serverUrls.forEach(function(serverUrl) {
        var url = serverUrl.value + '/templates.json?oauth_token=' + apiKey;

        // and try them until we find the one on which the API key is valid
        request.get({url: url, json: true, strictSSL: this.forceSSL}, function(error, response, data) {
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
            if (apiRequestCounter === ln) {
                // we have a valid server!
                if (this.serverUrl !== undefined) {
                    callback(dataSaved, null);
                    // we cycled through all servers and had errors with each one
                } else if (apiErrorCounter === ln) {
                    callback(null, "API Error on all servers, the API seems to be unavailable. Make sure you're connected to the Internet, and try again in few minutes.");
                    // we cycled through all servers without finding a valid one
                } else if (apiFailCounter === ln) {
                    callback(null, "API Error on server(s) '" + apiServerInError.join() + "', your API key seems to be wrong. Check your key and try again.");
                    // we got other error (probably because of wrong key)
                } else {
                    callback(null, "API Error on server(s) '" + apiServerInError.join() + "', something unexpected happened. Check your key, try again, and contact us if it fails again.");
                }
            }

        }.bind(this));
    }, this);
};

// display the prompt to choose the server
BridgeTemplateGenerator.prototype.getApiDetailsPromptServers = function(data) {
    var cb = this.async();

    this.log.info("Allright, your key is valid on " + _.find(serverUrls, {value: this.serverUrl}).name + "! I am now grabbing available template slots...");
    var templateSlots = [];
    var templateSlotsName = [];

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
            templateSlotsName[slot.id] = slot.name;
        });

    var promptTemplateId = [
        {
            // select template ID from API results
            type: 'list',
            name: 'templateSlot',
            message: 'Which template slot do you want to use?',
            default: _.findIndex(templateSlots, {value: existingConfig.templateSlot}),
            choices: templateSlots
        }
    ];

    this.prompt(promptTemplateId, function(props) {
        this.templateSlot = props.templateSlot;
        this.templateSlotName = templateSlotsName[this.templateSlot];

        // now that we have all our answers, continue with cb()
        cb();
    }.bind(this));
};

// copy main tasks files
BridgeTemplateGenerator.prototype.app = function app() {
    this.copy('package.json', 'package.json');
    this.copy(getCorrespondingGruntfile(), 'Gruntfile.js');
    this.copy('gitignore', '.gitignore');
    this.copy('.jshintrc', '.jshintrc');
    this.copy('.scss-lint.yml', '.scss-lint.yml');
};

function getCorrespondingGruntfile() {
    var info = 'We\'ve detected the following Grunffile version corresponding to your project: ';

    if (findFiles('.', /\.scss$/).length) {
        // if there is a jsLiquid file it's the first Sass version
        if (findFiles('.', /jsliquid\.html$/).length) {
            this.log.info(info + 'gruntfile v2 with SASS');
            return gruntfiles.sass;
        }
        // elsewhere it's the new ES6
        this.log.info(info + 'gruntfile v3 with es6');
        return gruntfiles.es6;
    }
    // if there is no scss files, it's the old grunt
    else {
        this.log.info(info + 'gruntfile v1 with only css');
        return gruntfiles.css;
    }
}

function findFiles(startPath, filter) {
    var results= [];

    if (!fs.existsSync(startPath)){
        return;
    }

    var files = fs.readdirSync('.');

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
