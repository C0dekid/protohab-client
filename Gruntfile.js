module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
			},
			build: {
				src: 'src/js/app.js',
				dest: 'build/js/app.min.js'
			}
		},

		sass: {
			dist: {
				options: {
					style: 'compressed'
				},
				files: {
					'build/css/main.min.css': 'src/scss/main.scss',
				}
			}
		},

		copy: {
			html: {
				expand: true,
				cwd: 'src',
				src: '*.html',
				dest: 'build/'
			},
			images: {
				expand: true,
				cwd: 'src/img',
				src: '*.{png,jpg,jpeg,gif}',
				dest: 'build/img/'
			}
		},

		eslint: {
			src: ["src/js/app.js"]
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-copy');

	grunt.registerTask('default', ['uglify', 'sass', 'copy:html', 'copy:images']);
};
