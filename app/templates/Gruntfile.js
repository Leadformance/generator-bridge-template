'use strict';

module.exports = function (grunt) {
    var nbUploadWarns = 0;
    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);

    grunt.initConfig({
        config: grunt.file.readJSON('.bridge-apikey.json'),

        dirs: {
            app: 'app',
            assets: 'assets',
            bower: 'bower_components',
            components: 'components',
            dist: 'dist',
            fonts: 'fonts',
            img: 'images',
            js: 'js',
            src: 'src',
            tmp: '.tmp'
        },

        clean: {
            tmp: ['<%= dirs.tmp %>'],
            dist: ['<%= dirs.dist %>']
        },

        rev: {
            dist: {
                files: {
                    src: [
                        '<%= dirs.dist %>/{,*/}*.js',
                        '<%= dirs.dist %>/{,*/}*.css',
                        '<%= dirs.dist %>/fonts/*'
                    ]
                }
            }
        },

        useminPrepare: {
            html: '<%= dirs.src %>/index.html',
            options: {
                dest: '<%= dirs.dist %>'
            }
        },

        useminPrepareDev: {
            html: '<%= dirs.src %>/index.html',
            options: {
                dest: '<%= dirs.dist %>',
                flow: {
                    html: {
                        steps: {
                            css: ['concat'],
                            js: ['concat']
                        },
                        post: {}
                    }
                }
            }
        },

        usemin: {
            html: ['<%= dirs.dist %>/index.html'],
            css: ['<%= dirs.dist %>/{,*/}*.css'],
            js: ['<%= dirs.dist %>/{,*/}*.js'],
            options: {
                assetsDirs: [
                    '<%= dirs.dist %>',
                    '<%= dirs.dist %>/<%= dirs.img %>'
                ],
                patterns: {
                    js: [
                        [/(images\/.*?\.(?:gif|jpeg|jpg|png|webp|svg))/gm, 'Update the JS to reference our revved images']
                    ],
                    css: [
                        [/(images\/.*?\.(?:gif|jpeg|jpg|png|webp|svg))/gm, 'Update the CSS to reference our revved images'],
                        [/(fonts\/.*?\.(?:eot|ttf|svg|woff))/gm, 'Update the CSS to reference our revved fonts']
                    ]
                }
            }
        },

        imagemin: {
            dist: {
                options: {
                    optimizationLevel: 3,
                    progressive: true,
                    cache: false
                },
                files: [{
                    expand: true,
                    cwd: '<%= dirs.src %>/<%= dirs.assets %>/<%= dirs.img %>',
                    src: '**/*.{png,jpg,jpeg,gif,PNG,JPG,JPEG,GIF}',
                    dest: '<%= dirs.dist %>/<%= dirs.img %>'
                }]
            }
        },

        copy: {
            html: {
                files: [{
                    expand: true,
                    flatten: true,
                    cwd: '<%= dirs.src %>',
                    src: ['*.html', '<%= dirs.app %>/**/*.html', '!<%= dirs.bower %>/**'],
                    dest: '<%= dirs.dist %>',
                    rename: function(dest, src) {
                        return dest + '/' + src.replace(/[A-Z]/ig, function(match) {
                                return match.toLowerCase();
                            });
                    }
                }]
            },
            fonts: {
                files: [{
                    expand: true,
                    flatten: true,
                    src: '<%= dirs.src %>/<%= dirs.assets %>/<%= dirs.fonts %>/**/*',
                    dest: '<%= dirs.dist %>/<%= dirs.fonts %>'
                }]
            },
            images: {
                files: [{
                    expand: true,
                    flatten: true,
                    src: '<%= dirs.src %>/<%= dirs.assets %>/<%= dirs.img %>/**/*.{webp,ico,svg,WEBP,ICO,SVG}',
                    dest: '<%= dirs.dist %>/<%= dirs.img %>'
                }]
            },
            frontOffice: {
                files: [{
                    expand: true,
                    src: [
                        'frontoffice/**/*',
                        'pages.json'
                    ],
                    dest: '<%= dirs.dist %>'
                }]
            },
            updateResourcesPath: {
                src: '<%= dirs.dist %>/index.html',
                dest: '<%= dirs.dist %>/index.html',
                options: {
                    process: function(content) {
                        return content.replace(/script src="js/g, 'script src="{{ frontoffice.view_short_template_path }}/javascripts')
                            .replace(/href="stylesheets/g, 'href="{{ frontoffice.view_short_template_path }}/stylesheets')
                            .replace(/="bower_components/g, '="{{ frontoffice.view_short_template_path }}/bower_components');
                    }
                }
            },
            devJsCss: {
                expand: true,
                cwd: '<%= dirs.tmp %>/concat',
                src: '**/*',
                dest: '<%= dirs.dist %>'
            },
            devVendors: {//TODO remove all vendors from src
                expand: true,
                cwd: 'src_old/<%= dirs.js %>/vendors',
                src: '**/*',
                dest: '<%= dirs.dist %>/<%= dirs.js %>'
            },
            devImages: {
                expand: true,
                cwd:'<%= dirs.src %>/<%= dirs.assets %>/<%= dirs.img %>',
                src: '**/*',
                dest: '<%= dirs.dist %>/<%= dirs.img %>'
            }
        },

        sass: {
            dev: {
                options: {
                    outputStyle: 'expanded',
                    sourceComments: true
                },
                files: {
                    '<%= dirs.tmp %>/app.css': '<%= dirs.src %>/app.scss'
                }
            },
            dist: {
                options: {
                    outputStyle: 'compressed'
                },
                files: {
                    '<%= dirs.tmp %>/app.css': '<%= dirs.src %>/app.scss'
                }
            }
        },

        postcss: {
            options: {
                processors: [
                    require('autoprefixer-core')({browsers: ['last 2 versions', 'ie 8', 'ie 9']})
                ]
            },
            dist: {
                src: '<%= dirs.tmp %>/app.css'
            }
        },

        browserify: {
            options: {
                transform: [['babelify', { stage: 0 }]]
            },
            dev: {
                options: {
                    browserifyOptions: {
                        debug: true
                    }
                },
                files: [{
                    expand: true,
                    flatten: true,
                    src: '<%= dirs.src %>/app.js',
                    dest: '<%= dirs.tmp %>/<%= dirs.js %>'
                }]
            },
            dist: {
                files: [{
                    expand: true,
                    flatten: true,
                    src: '<%= dirs.src %>/app.js',
                    dest: '<%= dirs.tmp %>/<%= dirs.js %>'
                }]
            }
        },

        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: {
                src: ['<%= dirs.src %>/*.js', '<%= dirs.src %>/<%= dirs.app %>/**/*.js']
            }
        },

        scsslint: {
            allFiles: [
                '<%= dirs.src %>/*.scss',
                '<%= dirs.src %>/<%= dirs.app %>/**/*.scss',
                '<%= dirs.src %>/<%= dirs.components %>/**/*.scss',
                '!<%= dirs.src %>/<%= dirs.components %>/_header.scss',
                '!<%= dirs.src %>/<%= dirs.components %>/_footer.scss'
            ],
            options: {
                config: '.scss-lint.yml',
                colorizeOutput: true
            }
        },

        wiredep: {
            bower: {
                src: '<%= dirs.src %>/index.html',
                ignorePath: '<%= dirs.src %>/'
            }
        },

        compress: {
            build: {
                options: {
                    archive: '<%= dirs.dist %>/_template.zip',
                    level: 9,
                    pretty: true
                },
                files: [
                    {
                        expand: true,
                        cwd: '<%= dirs.dist %>/',
                        src: ['**'],
                        dest: ''
                    }
                ]
            }
        },

        shell: {
            check: {
                command: 'curl --head --insecure "<%= config.serverUrl %>/templates/<%= config.templateSlot %>.json?oauth_token=<%= config.apiKey %>"',
                options: {
                    callback: shellCheckCallback
                }
            },
            upload: {
                command: 'curl -F "template=@<%= dirs.dist %>/_template.zip" -F "_method=PUT" --insecure "<%= config.serverUrl %>/templates/<%= config.templateSlot %>.json?oauth_token=<%= config.apiKey %>"',
                options: {
                    callback: shellUploadCallback
                }
            }
        },

        http_upload: {
            template: {
                options: {
                    url: '<%= config.serverUrl %>/templates/<%= config.templateSlot %>.json?oauth_token=<%= config.apiKey %>',
                    method: 'PUT'
                },
                src: '<%= dirs.dist %>/_template.zip',
                dest: 'template'
            },
            nossl: {
                options: {
                    url: '<%= config.serverUrl %>/templates/<%= config.templateSlot %>.json?oauth_token=<%= config.apiKey %>',
                    method: 'PUT',
                    rejectUnauthorized: false
                },
                src: '<%= dirs.dist %>/_template.zip',
                dest: 'template'
            }
        }
    });

    grunt.registerTask('lint', [
        'jshint',
        'scsslint'
    ]);

    // No bower wiredep, compressed css, no js source map
    grunt.registerTask('build-fast', [
        'clean',
        'sass:dist',
        'postcss',
        'browserify:dist',
        'useminPrepareDev',
        'concat',
        'copy:html',
        'copy:fonts',
        'copy:frontOffice',
        'copy:devJsCss',
        'copy:devImages',
        'usemin',
        'copy:devVendors',//TODO remove all vendors from src
        'copy:updateResourcesPath',
        'compress'
    ]);

    grunt.registerTask('build-dev', [
        'clean',
        'sass:dev',
        'wiredep',
        'browserify:dev',
        'useminPrepareDev',
        'postcss',
        'concat',
        'copy:html',
        'copy:fonts',
        'copy:frontOffice',
        'copy:devJsCss',
        'copy:devImages',
        'usemin',
        'copy:devVendors',//TODO remove all vendors from src
        'copy:updateResourcesPath',
        'compress'
    ]);

    grunt.registerTask('build', [
        'lint',
        'clean',
        'sass:dist',
        'imagemin',
        'wiredep',
        'browserify:dist',
        'useminPrepare',
        'postcss',
        'concat',
        'cssmin',
        'uglify',
        'rev',
        'copy:html',
        'copy:fonts',
        'copy:images',
        'copy:frontOffice',
        'usemin',
        'copy:devVendors',//TODO remove all vendors from src
        'copy:updateResourcesPath',
        'compress'
    ]);

    grunt.registerTask('template', function() {
        grunt.log.write('You work on the template named "' + grunt.config.data.config.templateSlotName + '" (#' + grunt.config.data.config.templateSlot + ')');
    });

    grunt.registerTask('upload-dev', ['upload:dev']);
    grunt.registerTask('upload-fast', ['upload:fast']);

    grunt.registerTask('upload', function(dev) {
        nbUploadWarns = 0;
        var build = dev ? 'build-' + dev : 'build';

        if (grunt.config.data.config.apiKey !== '') {
            grunt.task.run(
                build,
                'http_upload_with_fallback',
                'http_upload_nossl',
                'clean');
        } else {
            grunt.log.error('HEY, you can\'t use "grunt upload" because the API key is missing. Use "yo brige-template" to init one.');
            return false;
        }
    });

    grunt.registerTask('http_upload_with_fallback', function() {
        nbUploadWarns = grunt.fail.warncount + grunt.fail.errorcount;
        grunt.task.run('http_upload:template');
    });

    // Try upload:nossl if there is a warn or error after the upload
    grunt.registerTask('http_upload_nossl', function() {
        if ((grunt.fail.warncount + grunt.fail.errorcount) > nbUploadWarns) {
            grunt.log.writeln('"http_upload:template" failed, try the "http_upload:nossl" mode');
            grunt.task.run('http_upload:nossl');
        }
    });

    grunt.registerTask('useminPrepareDev', function () {
        var useminPrepareDevConfig = grunt.config('useminPrepareDev');
        grunt.config.set('useminPrepare', useminPrepareDevConfig);
        grunt.task.run('useminPrepare');
    });
};

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
