var request = require('request');

/*global module:false*/
module.exports = function(grunt) {
    var config = grunt.file.readJSON('.bridge-apikey.json');
    var snippetMapping = {};

    // Helpers
    function shellCheckCallback(err, stdout, stderr, callback) {
        // API should output a string containing the template id after successful upload
        if (stdout.indexOf('Status: 200') == -1) {
            grunt.log.error();
            grunt.warn("Can't upload template, check your .bridge-apikey.json");
        } else {
            console.log(stdout);
            grunt.log.ok();
        }
        callback();
    }

    function shellUploadCallback(err, stdout, stderr, callback) {
        // API should output a string containing the template id after successful upload
        if (stdout.indexOf('{"id":') == -1) {
            grunt.fatal("Can't upload template, check your .bridge-apikey.json");
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
            js:     'javascripts',
            css:    'stylesheets',
            img:    'images',
            output: '_output',
            build:  '_build',
            temp:   '<%= dirs.output %>/_temp',
            version:  '_version',
        },

        // Task configuration.

        /* Lint JS */
        jshint: {
            options: {
                curly:      true,
                immed:      true,
                latedef:    true,
                newcap:     true,
                noarg:      true,
                sub:        true,
                undef:      false,
                unused:     true,
                boss:       true,
                eqnull:     true,
                browser:    true,
                globals: {
                    jQuery:   true,
                    console:  true,
                    module:   true,
                    document: true
                }
            },
            gruntfile: {
                src: 'Gruntfile.js'
            },
            all: {
                // do not lint external resources (like bootstrap / jquery), too messy
                src: ['<%= dirs.js %>/**/*.js', '!**/*bootstrap*.js', '!**/*jquery*.js']
            }
        },
        /* Lint CSS */
        csslint: {
            all: {
                options: {
                    /* This set of options is only made to catch potentially harmful errors. Writing beautiful CSS is still up to you. */
                    'important': false,
                    'adjoining-classes': false,
                    'known-properties': false,
                    'box-sizing': false,
                    'box-model': false,
                    'overqualified-elements': false,
                    // 'display-property-grouping': false,
                    // 'bulletproof-font-face': false,
                    'compatible-vendor-prefixes': false,
                    'regex-selectors': false,
                    // 'errors': false,
                    'duplicate-background-images': false,
                    // 'duplicate-properties': false,
                    'empty-rules': false,
                    // 'selector-max-approaching': false,
                    // 'gradients': false,
                    // 'fallback-colors': false,
                    'font-sizes': false,
                    // 'font-faces': false,
                    'floats': false,
                    'star-property-hack': false,
                    'outline-none': false,
                    // 'import': false,
                    'ids': false,
                    // 'underscore-property-hack': false,
                    // 'rules-count': false,
                    'qualified-headings': false,
                    // 'selector-max': false,
                    // 'shorthand': false,
                    'text-indent': false,
                    'unique-headings': false,
                    'universal-selector': false,
                    'unqualified-attributes': false,
                    // 'vendor-prefix': false,
                    'zero-units': false
                },
                src: ['<%= dirs.css %>/**/*.css', '!**/*bootstrap*.css', '!**/*jquery*.css']
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
                src: ['<%= dirs.js %>/**/*.js'],
                dest: '<%= dirs.temp %>/<%= dirs.js %>/combined.js'
            }
        },
        /* Minify JS */
        uglify: {
            options: {
                banner: '<%= banner %>'
            },
            build: {
                src:  '<%= concat.build.dest %>',
                dest: '<%= dirs.output %>/<%= dirs.js %>/combined.min.js'
            }
        },
        /* Concat & Minify CSS */
        cssmin: {
            add_banner: {
                options: {
                    banner: '<%= banner %>'
                },
                files: {
                    '<%= dirs.output %>/<%= dirs.css %>/combined.min.css': ['<%= dirs.css %>/**/*.css']
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
                    cwd:  '<%= dirs.img %>',
                    src:  '**/*.{png,jpg,jpeg,gif,PNG,JPG,JPEG,GIF}',
                    dest: '<%= dirs.output %>/<%= dirs.img %>'
                }]
            }
        },
        /* Clean dirs */
        clean: {
            temp:   ["<%= dirs.temp %>"],
            output: ["<%= dirs.output %>"],
            build:  ["<%= dirs.build %>"],
            version:  ["<%= dirs.version %>"]
        },
        /* Copy other files to output directory */
        copy: {
            build: {
                files: [{
                    expand: true,
                    // exclude (npm/grunt/build/js/css/images) files
                    src: ['**',
                        '!node_modules/**',
                        '!.bridge-apikey.json',
                        '!grunt-README.md',
                        '!Gruntfile.js',
                        '!package.json',
                        '!<%= dirs.output %>/**',
                        '!<%= dirs.js %>/**',
                        '!<%= dirs.css %>/**',
                        '!<%= dirs.img %>/**'],
                    dest: '<%= dirs.output %>'
                }]
            },
            other_images: {
                files: [{
                    expand: true,
                    cwd:  '<%= dirs.img %>',
                    src:  '**/*.{webp,ico,svg,WEBP,ICO,SVG}',
                    dest: '<%= dirs.output %>/<%= dirs.img %>'
                }]
            },
            other_json: {
                files: [{
                    expand: true,
                    cwd:  '<%= dirs.js %>',
                    src:  '**/*.json',
                    dest: '<%= dirs.output %>/<%= dirs.js %>'
                }]
            }
        },
        /* Rev assets */
        /* Do not use rev + usemin for now, as of now, Bridge's CSS & JS are not compatible. Would need some CSS preprocessor to input image names in variables, and some time to clean JS... */
        // rev: {
        //   assets: {
        //     files: [{
        //       src: [
        //         '<%= dirs.output %>/<%= dirs.js %>/**/*.js',
        //         '<%= dirs.output %>/<%= dirs.css %>/**/*.css',
        //         '<%= dirs.output %>/<%= dirs.img %>/**/*.{jpg,jpeg,gif,png}',
        //         '<%= dirs.output %>/fonts/**/*.{eot,svg,ttf,woff}'
        //       ]
        //     }]
        //   }
        // },
        // usemin: {
        //     html: ['<%= dirs.output %>/**/*.html'],
        //     css: ['<%= dirs.output %>/<%= dirs.css %>/**/*.css'],
        //     options: {
        //         dirs: ['<%= dirs.output %>']
        //     }
        // },
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
        open : {
            build : {
                path : '<%= dirs.build %>'
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
                files: '*.html',
                options: {
                    spawn: false
                }
            }
        },
        /* Notify Hooks */
        notify_hooks: {
            options: {
                enabled: true,
                max_jshint_notifications: 5, // maximum number of notifications from jshint output
                title: "Bridge Grunt"
            }
        },
        /* Notify specific messages */
        notify: {
            build: {
                options: {
                    title: "Bridge Grunt BUILD",
                    message: "HOY, template zip'd!"
                }
            },
            upload: {
                options: {
                    title: "Bridge Grunt UPLOAD",
                    message: "YAY, template's been uploaded (slot #<%= config.templateSlot %>)"
                }
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-csslint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-open');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-notify');
    grunt.loadNpmTasks('grunt-http-upload');
    // grunt.loadNpmTasks('grunt-rev');
    // grunt.loadNpmTasks('grunt-usemin');

    // This is required if you use any options.
    grunt.task.run('notify_hooks');

    // Register tasks.

    // Try upload and track the number of warns and errors before
    grunt.registerTask('http_upload_with_fallback', function() {
        nbUploadWarns = grunt.fail.warncount+grunt.fail.errorcount;
        grunt.task.run('http_upload:template');
    });

    // Try upload:nossl if there is a warn or error after the upload
    grunt.registerTask('http_upload_nossl', function() {
        if ((grunt.fail.warncount+grunt.fail.errorcount) > nbUploadWarns) {
            grunt.log.writeln('"http_upload:template" failed, try the "http_upload:nossl" mode');
            grunt.task.run('http_upload:nossl');
        }
    });

    /* Dev: test */
    grunt.registerTask('check', [
        'jshint',
        'csslint'
    ]);
    /* Prod: build .zip */
    grunt.registerTask('build', [
        'jshint',
        'csslint',
        'clean',
        'concat',
        'uglify',
        'clean:temp',
        'cssmin',
        'imagemin',
        'copy',
        'compress',
        'clean:output',
        'open:build',
        'notify:build'
    ]);
    grunt.registerTask('upload', function() {
        nbUploadWarns = 0;
        config = grunt.file.readJSON('.bridge-apikey.json');
        if (config.apiKey !== '') {
            grunt.task.run('jshint',
                'csslint',
                'clean',
                'concat',
                'uglify',
                'clean:temp',
                'cssmin',
                'imagemin',
                'copy',
                'compress',
                'clean:output',
                'http_upload_with_fallback',
                'http_upload_nossl',
                'clean:build',
                'notify:upload');
        } else {
            grunt.log.error("HEY, you can't use 'grunt upload' because the API key is missing. Use 'yo brige-template' to init one.");
            return false;
        }
    });

    grunt.registerTask('check_version', function() {
        var done = this.async();
        request.get({url:'https://api.github.com/repos/Leadformance/generator-bridge-template/tags',json: true,timeout: 5000,headers: {'User-Agent': 'request'}}, function (error, response, data) {

            if (error !== null) {
                grunt.log.error();
                grunt.warn("Can't download the last github version of generator-bridge-template");
            } else {

                // Get the last released commit installed from the last "npm install" execution
                grunt.log.writeln("Github version commit " + data[0].commit.sha + " (tag:"+data[0].name+")");

                // Get the last released commit installed from the last "yo brisdge-template" execution in this directory
                var pkgl = grunt.file.readJSON('.bridge-apikey.json');
                grunt.log.writeln("Local version commit " + pkgl.githubVersionCommit );

                if (pkgl.githubVersionCommit !== data[0].commit.sha) {
                    grunt.log.error("You must run the npm install command to upgrade your version to '"+ data[0].name +"' and run after the command 'yo bridge-template' in this directory");
                    grunt.log.error();
                } else {
                    grunt.log.ok("Your version is up to date");
                    grunt.log.ok();
                }

            }
            done();
        });
    });

    grunt.registerTask('template', function() {
        config = grunt.file.readJSON('.bridge-apikey.json');
        grunt.log.write("You work on the template named '" + config.templateSlotName + "' (#" + config.templateSlot + ")");
    });

    // Default task.
    grunt.registerTask('default', 'check');

    // --- Live Reload
    grunt.registerTask('updateSnippet', function(path) {
        var done = this.async();

        var snippetName = new RegExp('([_a-zA-Z]*).html$', 'g').exec(path)[1];
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
