/*global module:false*/
module.exports = function(grunt) {

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
      temp:   '<%= dirs.output %>/_temp'
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
          // 'known-properties': false,
          // 'box-sizing': false,
          'box-model': false,
          // 'overqualified-elements': false,
          // 'display-property-grouping': false,
          // 'bulletproof-font-face': false,
          // 'compatible-vendor-prefixes': false,
          // 'regex-selectors': false,
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
          // 'text-indent': false,
          'unique-headings': false,
          'universal-selector': false,
          // 'unqualified-attributes': false,
          // 'vendor-prefix': false,
          'zero-units': false
        },
        src: ['<%= dirs.css %>/**/*.css', '!**/*bootstrap*.css']
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
          progressive: true
        },
        files: [{
          expand: true,
          cwd:  '<%= dirs.img %>',
          src:  '**/*.{png,jpg,jpeg}',
          dest: '<%= dirs.output %>/<%= dirs.img %>'
        }]
      }
    },
    /* Clean dirs */
    clean: {
      temp:   ["<%= dirs.temp %>"],
      output: ["<%= dirs.output %>"],
      build:  ["<%= dirs.build %>"]
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
        path : '<%= dirs.build %>/'
      }
    },
    /* Upload with cURL */
    shell: {
      check: {
        command: 'curl --head "<%= config.serverUrl %>/templates/<%= config.templateSlot %>.json?oauth_token=<%= config.apiKey %>"',
        options: {
          callback: shellCheckCallback
        }
      },
      upload: {
        command: 'curl -F "template=@<%= dirs.build %>/_template.zip" -F "_method=PUT" "<%= config.serverUrl %>/templates/<%= config.templateSlot %>.json?oauth_token=<%= config.apiKey %>"',
        options: {
          callback: shellUploadCallback
        }
      }
    },
    /* Watch */
    watch: {
      options: {
        livereload: true
      },
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      js: {
        files: ['<%= jshint.all.src %>'],
        tasks: ['jshint:all']
      },
      css: {
        files: ['<%= csslint.all.src %>'],
        tasks: ['csslint:all']
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
  // grunt.loadNpmTasks('grunt-rev');
  // grunt.loadNpmTasks('grunt-usemin');

  // This is required if you use any options.
  grunt.task.run('notify_hooks');

  // Register tasks.

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
  grunt.registerTask('upload', [
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
    'shell:check',
    'shell:upload',
    'clean:build',
    'notify:upload'
  ]);
  grunt.registerTask('server', [
    'watch'
  ]);

  // Default task.
  grunt.registerTask('default', 'check');

};
