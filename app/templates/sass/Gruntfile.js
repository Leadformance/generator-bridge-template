/*global module:false, require:false, console:false*/
/*jshint -W106 */
var request = require('request');

module.exports = function (grunt) {
    var nbUploadWarns = 0;
    var config = grunt.file.readJSON('.bridge-apikey.json');
    var snippetMapping = {};

    // Helpers
    function shellCheckCallback(err, stdout, stderr, callback) {
        // API should output a string containing the template id after successful upload
        if (stdout.indexOf('Status: 200') === -1) {
            grunt.log.error();
            grunt.warn('Can\'t upload template, check your .bridge-apikey.json');
        } else {
            console.log(stdout);
            grunt.log.ok();
        }
        callback();
    }

    function shellUploadCallback(err, stdout, stderr, callback) {
        // API should output a string containing the template id after successful upload
        if (stdout.indexOf('{"id":') === -1) {
            grunt.fatal('Can\'t upload template, check your .bridge-apikey.json');
        } else {
            console.log(stdout);
            grunt.log.ok();
        }
        callback();
    }

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        config: grunt.file.readJSON('.bridge-apikey.json'),
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %> */\n',
        dirs: {
            app: 'src',
            js: 'js',
            css: 'stylesheets',
            fonts: 'fonts',
            img: 'images',
            modules:'modules',
            output: '_output',
            build: '_build',
            temp: '<%= dirs.output %>/_temp',
            version: '_version'
        },

        // Task configuration.

        /* Lint JS */
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            gruntfile: {
                src: 'Gruntfile.js'
            },
            all: {
                src: ['<%= dirs.app %>/<%= dirs.js %>/**/*.js']
            }
        },
        /* Concat JS */
        concat: {
            options: {
                banner: '<%= banner %>',
                stripBanners: true,
                separator: ';'
            },
            build: {
                files: {
                    '<%= dirs.temp %>/<%= dirs.js %>/combined.js': ['<%= dirs.app %>/<%= dirs.js %>/*.js']
                }
            }
        },
        /* Minify JS */
        uglify: {
            options: {
                banner: '<%= banner %>'
            },
            build: {
                files: {
                    '<%= dirs.output %>/<%= dirs.js %>/combined.min.js': ['<%= dirs.temp %>/<%= dirs.js %>/combined.js'],
                    '<%= dirs.output %>/<%= dirs.js %>/vendors.min.js': ['<%= dirs.temp %>/<%= dirs.js %>/vendors.js']
                }
            }
        },
        /* Concat & Minify CSS */
        cssmin: {
            sass: {
                options: {
                    banner: '<%= banner %>'
                },
                files: {
                    '<%= dirs.output %>/<%= dirs.css %>/combined.min.css': ['<%= dirs.temp %>/*.css'],
                    '<%= dirs.output %>/<%= dirs.css %>/vendors.min.css': ['<%= dirs.temp %>/<%= dirs.css %>/vendors.css']
                }
            }
        },
        bower_concat: {
            all: {
                dest: '<%= dirs.temp %>/<%= dirs.js %>/vendors.js',
                cssDest: '<%= dirs.temp %>/<%= dirs.css %>/vendors.css',
                exclude: [
                    'jquery'
                ],
                mainFiles: {
                    'formstone': ['dist/js/core.js', 'dist/js/scrollbar.js', 'dist/css/scrollbar.css']
                }
            }
        },
        /* Optimize images */
        imagemin: {
            build: {
                options: {
                    optimizationLevel: 3,
                    progressive: true,
                    cache: false
                },
                files: [{
                    expand: true,
                    cwd: '<%=dirs.app %>/<%= dirs.img %>',
                    src: '**/*.{png,jpg,jpeg,gif,PNG,JPG,JPEG,GIF}',
                    dest: '<%= dirs.output %>/<%= dirs.img %>'
                }]
            }
        },
        /* Clean dirs */
        clean: {
            temp: ['<%= dirs.temp %>'],
            output: ['<%= dirs.output %>'],
            build: ['<%= dirs.build %>'],
            version: ['<%= dirs.version %>']
        },
        /* Copy other files to output directory */
        copy: {
            frontOffice: {
                files: [{
                    expand: true,
                    src: [
                        'frontoffice/**/*',
                        'pages.json'
                    ],
                    dest: '<%= dirs.output %>'
                }]
            },
            fonts: {
                files: [{
                    expand: true,
                    flatten: true,
                    src: '<%= dirs.app %>/<%= dirs.fonts %>/**/*',
                    dest: '<%= dirs.output %>/<%= dirs.fonts %>'
                }]
            },
            images: {
                files: [{
                    expand: true,
                    flatten: true,
                    src: '<%= dirs.app %>/<%= dirs.img %>/**/*.{webp,ico,svg,WEBP,ICO,SVG}',
                    dest: '<%= dirs.output %>/<%= dirs.img %>'
                }]
            },
            // --- HACK
            hack: {
                files: [{
                    expand: true,
                    flatten: true,
                    cwd: '<%= dirs.app %>',
                    src: '**/*.html',
                    dest: '<%= dirs.output %>',
                    rename: function(dest, src) {
                        return dest + '/' + src.replace(/[A-Z]/ig, function(match) {
                                return match.toLowerCase();
                            });
                    }
                }]
            },
            // HACK ---
            other_json: {
                files: [{
                    expand: true,
                    cwd: '<%= dirs.app %>/<%= dirs.js %>',
                    src: '**/*.json',
                    dest: '<%= dirs.output %>/<%= dirs.js %>'
                }]
            }
        },
        /* Zip */
        compress: {
            build: {
                options: {
                    archive: '<%= dirs.build %>/_template.zip',
                    level: 9,
                    pretty: true
                },
                files: [
                    {expand: true, cwd: '<%= dirs.output %>/', src: ['**'], dest: ''}
                ]
            }
        },
        /* Open Finder/Explorer in the .zip folder */
        open: {
            build: {
                path: '<%= dirs.build %>'
            }
        },
        /* Upload with cURL */
        shell: {
            check: {
                command: 'curl --head --insecure "<%= config.serverUrl %>/templates/<%= config.templateSlot %>.json?oauth_token=<%= config.apiKey %>"',
                options: {
                    callback: shellCheckCallback
                }
            },
            upload: {
                command: 'curl -F "template=@<%= dirs.build %>/_template.zip" -F "_method=PUT" --insecure "<%= config.serverUrl %>/templates/<%= config.templateSlot %>.json?oauth_token=<%= config.apiKey %>"',
                options: {
                    callback: shellUploadCallback
                }
            }
        },
        /* Native upload (no cURL) */
        http_upload: {
            template: {
                options: {
                    url: '<%= config.serverUrl %>/templates/<%= config.templateSlot %>.json?oauth_token=<%= config.apiKey %>',
                    method: 'PUT'
                },
                src: '<%= dirs.build %>/_template.zip',
                dest: 'template'
            },
            nossl: {
                options: {
                    url: '<%= config.serverUrl %>/templates/<%= config.templateSlot %>.json?oauth_token=<%= config.apiKey %>',
                    method: 'PUT',
                    rejectUnauthorized: false
                },
                src: '<%= dirs.build %>/_template.zip',
                dest: 'template'
            }
        },
        /* Watch */
        watch: {
            snippets: {
                files: [
                    '<%= dirs.app %>/*.html',
                    '<%= dirs.app %>/<%= dirs.modules %>/**/*.html'
                ],
                options: {
                    spawn: false
                }
            }
        },
        /* Notify Hooks */
        notify_hooks: {
            options: {
                enabled: true,
                max_jshint_notifications: 1, // maximum number of notifications from jshint output
                title: 'Bridge Grunt'
            }
        },
        /* Notify specific messages */
        notify: {
            build: {
                options: {
                    title: 'Bridge Grunt BUILD',
                    message: 'HOY, template zip\'d!'
                }
            },
            upload: {
                options: {
                    title: 'Bridge Grunt UPLOAD',
                    message: 'YAY, template\'s been uploaded (slot #<%= config.templateSlot %>)'
                }
            }
        },
        sass: {
            dist: {
                options: {
                    style: 'expanded',
                    lineNumber: true,
                    sourcemap: 'none'
                },
                files: {
                    '<%= dirs.temp %>/app.css': '<%= dirs.app %>/app.scss'
                }
            }
        },
        autoprefixer: {
            options: ['last 2 versions', 'ie 8', 'ie 9'],
            '<%= dirs.temp %>/app.css': ['<%= dirs.temp %>/app.css']
        },
        scsslint: {
            allFiles: [
                '<%= dirs.app %>/**/*.scss',
                '!<%= dirs.app %>/modules/header/**/*.scss',
                '!<%= dirs.app %>/modules/footer/**/*.scss',
                '!<%= dirs.app %>/vendors/**/*.scss'
            ],
            options: {
                config: '.scss-lint.yml',
                colorizeOutput: true
            }
        },
        githooks: {
            all: {
                'pre-commit': 'jshint scsslint'
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-githooks');
    grunt.loadNpmTasks('grunt-open');
    grunt.loadNpmTasks('grunt-scss-lint');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-notify');
    grunt.loadNpmTasks('grunt-http-upload');
    grunt.loadNpmTasks('grunt-bower-concat');

    // This is required if you use any options.
    grunt.task.run('notify_hooks');

    // Register tasks.

    // Try upload and track the number of warns and errors before
    grunt.registerTask('http_upload_with_fallback', function () {
        nbUploadWarns = grunt.fail.warncount + grunt.fail.errorcount;
        grunt.task.run('http_upload:template');
    });

    // Try upload:nossl if there is a warn or error after the upload
    grunt.registerTask('http_upload_nossl', function () {
        if ((grunt.fail.warncount + grunt.fail.errorcount) > nbUploadWarns) {
            grunt.log.writeln('"http_upload:template" failed, try the "http_upload:nossl" mode');
            grunt.task.run('http_upload:nossl');
        }
    });

    /* Dev: test */
    grunt.registerTask('lint', [
        'jshint',
        'scsslint'
    ]);

    grunt.registerTask('preprocss', [
        'scsslint',
        'sass',
        'autoprefixer'
    ]);

    grunt.registerTask('copy-build', [
        'copy:frontOffice',
        'copy:fonts',
        'copy:images',
        'copy:other_json'
    ]);

    grunt.registerTask('build-app', [
        'jshint',
        'clean',
        'preprocss',
        'concat',
        'bower_concat',
        'uglify',
        'cssmin',
        'imagemin',
        'clean:temp',
        'copy-build',

        // --- HACK
        'wonderful-hack',
        // HACK ---

        'compress',
        'clean:output'
    ]);

    /* Prod: build .zip */
    grunt.registerTask('build', [
        'build-app',
        'open:build',
        'notify:build'
    ]);
    grunt.registerTask('upload', function () {
        nbUploadWarns = 0;
        var config = grunt.file.readJSON('.bridge-apikey.json');
        if (config.apiKey !== '') {
            grunt.task.run(
                'build-app',
                'http_upload_with_fallback',
                'http_upload_nossl',
                'clean:build',
                'notify:upload');
        } else {
            grunt.log.error('HEY, you can\'t use "grunt upload" because the API key is missing. Use "yo brige-template" to init one.');
            return false;
        }
    });

    grunt.registerTask('check_version', function () {
        var done = this.async();
        request.get({
            url: 'https://api.github.com/repos/Leadformance/generator-bridge-template/tags',
            json: true,
            timeout: 5000,
            headers: {'User-Agent': 'request'}
        }, function (error, response, data) {

            if (error !== null) {
                grunt.log.error();
                grunt.warn('Can\'t download the last github version of generator-bridge-template');
            } else {

                // Get the last released commit installed from the last "npm install" execution
                grunt.log.writeln('Github version commit ' + data[0].commit.sha + ' (tag:' + data[0].name + ')');

                // Get the last released commit installed from the last "yo brisdge-template" execution in this directory
                var pkgl = grunt.file.readJSON('.bridge-apikey.json');
                grunt.log.writeln('Local version commit ' + pkgl.githubVersionCommit);

                if (pkgl.githubVersionCommit !== data[0].commit.sha) {
                    grunt.log.error('You must run the npm install command to upgrade your version to "' + data[0].name + '" and run after the command "yo bridge-template" in this directory');
                    grunt.log.error();
                } else {
                    grunt.log.ok('Your version is up to date');
                    grunt.log.ok();
                }

            }
            done();
        });
    });

    grunt.registerTask('template', function () {
        var config = grunt.file.readJSON('.bridge-apikey.json');
        grunt.log.write('You work on the template named "' + config.templateSlotName + '" (#' + config.templateSlot + ')');
    });

    // Default task.
    grunt.registerTask('default', 'lint');


    // --- HACK
    grunt.registerTask('wonderful-hack', [
        'copy:hack'
    ]);
    // HACK ---

    // --- Live Reload
    grunt.registerTask('updateSnippet', function(path) {
        var done = this.async();

        var snippetName = new RegExp('([a-zA-Z]*)\.html$', 'g').exec(path)[1].toLowerCase();
        var snippetId = snippetMapping[snippetName];

        if (isNaN(snippetId)) {
            grunt.log.warn('Update failed for file: ' + path);
            done();
        } else {
            var req = config.serverUrl + '/templates/' + config.templateSlot + '/snippets/' + snippetId + '?oauth_token=' + config.apiKey;
            grunt.log.write('Update: ' + req);

            request.put({
                url: req,
                json: true,
                body: {
                    snippet: {
                        content: grunt.file.read(path)
                    }
                }
            }, function() {
                done();
            });
        }
    });

    grunt.event.on('watch', function(action, filepath) {
        grunt.task.run('updateSnippet:' + filepath);
    });

    grunt.registerTask('serve', function() {
        snippetMapping = {};

        var done = this.async();

        request.get({
            url: config.serverUrl + '/templates/' + config.templateSlot + '?oauth_token=' + config.apiKey,
            json: true
        }, function(err, response, data) {
            data.drops.forEach(function(snippet) {
                snippetMapping[snippet.name] = snippet.id;
            });

            data.layouts.forEach(function(snippet) {
                snippetMapping[snippet.name] = snippet.id;
            });

            grunt.task.run('watch:snippets');

            done();
        });
    });

    // Live Reload ---
};
