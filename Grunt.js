module.exports = function(grunt) {
  
    grunt.initConfig({
      
      // Configure tasks
      uglify: {
        options: {
          banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
        },
        build: {
          src: 'src/*.js',
          dest: 'dist/app.min.js'
        }
      },
      
      watch: {
        scripts: {
          files: ['src/*.js'],
          tasks: ['uglify'],
          options: {
            spawn: false,
          },
        },
      },
      
      // Load plugins
      pkg: grunt.file.readJSON('package.json'),
      grunt.loadNpmTasks('grunt-contrib-uglify'),
      grunt.loadNpmTasks('grunt-contrib-watch')
      
    });
    
    // Register tasks
    grunt.registerTask('default', ['uglify']);
    
  };
  
