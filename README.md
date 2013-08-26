# generator-bridge-template

A generator for Leadformance Bridge templates, using [Yeoman](http://yeoman.io).
He will help you scaffold templates, and create [Grunt](http://gruntjs.com) tasks to test and upload your templates on Bridge.

![](http://i.imgur.com/envEYKC.png)

## Before starting...

### Install NodeJS

[Download NodeJS installer](http://nodejs.org).
Also available on [Homebrew](http://brew.sh) for OSX users: `brew install node`

### cURL for Windows users

Download and install the latest [cURL](http://curl.haxx.se), needed for the upload task.
OSX users should already have it.

### Install the generator itself

To install (or update) generator-bridge-template, run:

```
$ npm install -g git+https://github.com/Leadformance/generator-bridge-template.git
```

## Getting Started

### Creating Grunt tasks in an existing template

*Note*: this generator is not compatible with the old "Magic" template structure. Use only with the newest Liquid templates.

If your template doesn't have any Grunt tasks yet, you can generate them automatically.
Go into your template's directory, and run:

```
$ yo bridge-template
```

You will be asked some questions, and some additional files will be created: these are the [Grunt tasks](#using-grunt-tasks), ready to be used.
You should commit these new files with the template, so anyone else working on that template will already have the Grunt tasks available.

An additional config file, .bridge-apikey.json, will be generated as well.
This file should *not* be commited to git, as it contains the API key.
A .gitignore file has been generated as well, which excludes .bridge-apikey.json.
Keep this in mind if you need to edit your .gitignore.

### Using Grunt tasks

Grunt tasks are defined by a `Gruntfile.js` at the root of your template.
They will help you do boring stuff a lot easier.

In the template directory, you just need to run:

```
grunt
```

By default, it will run the `check` task.

You can run additional tasks, like:

- `grunt check` (alias for `grunt`): lint js & css, and output a report so you can fix them.
- `grunt server`: run this once, and all your changes in .css and .js files will be automatically linted, as you save them. A notification will pop up if there is any error.
- `grunt build`: lint, concat, minify js & css, optimize images, and build a `/_output/_template.zip`, ready to be uploaded manually in Bridge Back Office.
- `grunt upload`: lint and prepare a build, then upload it in the template slot specified in the .bridge-apikey.json (generated by `yo`).

## FAQ

To be completed

## Best-practices

### CSS & JS

Split your CSS & JS in as many files as you need. They will all be concatenated in alphabetic order.

Name them so they will be included in the order you need.
Ex: _1_bootstrap.js; _2_jquery.scrollpane.js; _3_base_template.js; _4_custom.js

- In your html, reference ONLY /javascripts/combined.min.js and /stylesheets/combined.min.css.

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)
