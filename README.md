# generator-bridge-template

A generator for Leadformance Bridge templates, using [Yeoman](http://yeoman.io).
He will help you scaffold templates, and create [Grunt](http://gruntjs.com) tasks to test and upload your templates on Bridge.

![](http://i.imgur.com/CYiHTVE.png)

## Before starting...

### Install NodeJS

[Download NodeJS installer](http://nodejs.org).
Also available on [Homebrew](http://brew.sh) for OSX users: `brew install node`

### Install (or update) the generator

To install (or update) generator-bridge-template, run:

```
$ npm install -g git+https://github.com/Leadformance/generator-bridge-template.git
```

### If it doesn't work

For some reasons, you might need to be an administrator to install it.

- On Windows, you should open your terminal as an admin, then paste the line above. See [this tutorial](http://www.howtogeek.com/howto/windows-vista/run-a-command-as-administrator-from-the-windows-vista-run-box/).
- On OSX, you can use `sudo`, like this:

```
$ sudo npm install -g git+https://github.com/Leadformance/generator-bridge-template.git
```

You should try to [fix this permission issue](#i-get-npm-err-errors-when-installingupdating-the-generator).

## Getting Started

### Creating Grunt tasks in an existing template

*Note*: these grunt tasks are not compatible with the old "Magic" template structure. Use only with the newest Liquid templates.

If your template doesn't have any Grunt tasks yet, you can generate them automatically.
Go into your template's directory, and run:

```
$ yo bridge-template
```

### Scaffolding a generic template

You can choose to automatically create a generic starter template at the same time than creating the grunt tasks.
You will then be able to immediately work on the template.

Once you answered all the questions, some additional files will be created: these are the [Grunt tasks](#using-grunt-tasks), ready to be used.
You should commit these new files with the template, so anyone else working on that template will already have the Grunt tasks available.

An additional config file, .bridge-apikey.json, will be generated as well.
This file should *not* be committed to git, as it contains the API key.
A .gitignore file has been generated as well, which excludes .bridge-apikey.json.
Keep this in mind if you need to edit your .gitignore.

*Note that this will generate files in the current directory, so be sure to change to a new directory first if you don't want to overwrite existing files.*

### Using Grunt tasks

Grunt tasks are defined by a `Gruntfile.js` at the root of your template.
They will help you do boring stuff a lot easier.

In the template directory, you just need to run:

```
grunt
```

By default, it will run the `check` task.

You can run additional tasks, like:

- `grunt check` (alias for `grunt`): lint js & css once, and output a report so you can fix them.
- `grunt server`: this will watch your changes in .css and .js files in the background, and automatically lint them as you save them. A notification will pop up if there is any error.
- `grunt build`: lint, concat, minify js & css, optimize images, and build a `/_output/_template.zip`, ready to be uploaded manually in Bridge Back Office.
- `grunt upload`: lint and prepare a build, then upload it in the template slot specified in the .bridge-apikey.json (generated by `yo`).

## FAQ

### I heard you added nice new tasks, how do I update them?

Update the generator itself ([see full instructions](#install-or-update-the-generator))

```
$ npm install -g git+https://github.com/Leadformance/generator-bridge-template.git
```

Then, while in the folder of the template, generate Grunt tasks once again

```
$ yo bridge-template
```

and select "Generate Grunt tasks only" when asked if you want to scaffold a template.

Done, you can use the updated tasks!

**Note:** you should update the tasks as soon as you resume work on a previous project. This will give you the latest features, and as tasks are part of the repo, everyone will benefit from an update.

### I get `npm ERR!` errors when installing/updating the generator!

This might be a permission issue.
[This StackOverflow](http://stackoverflow.com/a/16151707) post might help you:

```
sudo chown -R `whoami` ~/.npm
```

Then try installing again.

If you still have issue, try prefixing your commands with sudo, like `sudo npm install ...`.

## Best-practices

### CSS & JS

Split your CSS & JS in as many files as you need. They will all be concatenated in alphabetic order.

Name them so they will be included in the order you need.
Ex: _1_bootstrap.js; _2_jquery.scrollpane.js; _3_base_template.js; _4_custom.js

- In your html, reference ONLY /javascripts/combined.min.js and /stylesheets/combined.min.css.

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)

# TODO

- [ ] Use SCSS preprocessor
- [ ] Shrink CSS with grunt-uncss - [See how to use](http://addyosmani.com/blog/removing-unused-css/).
