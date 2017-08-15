module.exports = function (grunt) {
    require('create-grunt-tasks')(grunt, function (create) {
        
        //
        // --- Release task ---
        
        create.task('release')
            .sub('clean', [
                'build/'
            ])
            .sub('typescript', {
                cwd: 'src',
                src: 'src/**/*.ts',
                dest: 'build/',
                options: { target: 'es5' }
            })
            .sub('less', {
                files: {
                    'build/popup/style/style.css': 'src/popup/style/style.less'
                },
                options: {
                    paths: ['src/']
                }
            })
            .sub('copy', {
                cwd: 'src/',
                src: [
                    '**/*.html',
                    'config/*.json',
                    'img/*.*',
                    'lib/**/*.js',
                    'popup/font/*.*',
                    'popup/img/*.*',
                    'manifest.json',
                ],
                dest: 'build/',
                expand: true
            })
            .sub('zip', {
                src: ['build/**/*.*'],
                dest: 'build.zip',
                compression: 'DEFLATE'
            })
            .sub('ext-reload');

        //
        // --- Debug tasks ---
        
        create.task('debug')
            .sub('debug-js')
            .sub('debug-css')
            .sub('ext-reload');

        create.task('debug-js')
            .sub('typescript', {
                src: 'src/**/*.ts',
                options: {
                    sourceMap: true,
                    declaration: false,
                    target: 'es5'
                }
            });

        create.task('debug-css')
            .sub('less', {
                files: {
                    'src/popup/style/style.css': 'src/popup/style/style.less'
                },
                options: {
                    paths: ['src/']
                }
            });
            
        // ---- Watch ----
            
        create.task('debug-watch')
            .sub('concurrent', {
                tasks: ['debug-watch-js', 'debug-watch-css', 'debug-watch-other'],
                options: {
                    logConcurrentOutput: true
                },
            });

        create.task('debug-watch-js')
            .sub('typescript', {
                src: 'src/**/*.ts',
                options: {
                    sourceMap: true,
                    declaration: false,
                    target: 'es5',
                    watch: {
                        path: 'src',
                        after: ['ext-reload']
                    }
                }
            });

        create.task('debug-watch-css')
            .sub('watch', {
                files: ['src/**/*.less'],
                tasks: ['debug-css', 'ext-reload']
            });
            
        create.task('debug-watch-other')
            .sub('watch', {
                files: ['src/**/*.{json,html,png,svg,ttf}'],
                tasks: ['ext-reload']
            });

        // --- Reload chrome extensions ---
        create.task('ext-reload')
            .sub(function () {
                // Create server to communicate with extension
                var done = this.async();
                var server = require('http').createServer(function (req, res) {
                    res.end('reload');
                });
                var connected = false;
                var sockets = {};
                var socketCount = 0;
                var closeServer = function () {
                    server.close(function () {
                        grunt.log.writeln('Server closed gracefully.');
                        done();
                    });
                    for (var id in sockets) {
                        sockets[id].destroy();
                    }
                    setTimeout(function () {
                        grunt.log.writeln('Server was not closed gracefully.');
                        done();
                    }, 2000);
                };
                server.on('connection', function (socket) {
                    sockets[socketCount++] = socket;
                    if (!connected) {
                        grunt.log.writeln('Auto-reloader connected.');
                        socket.emit('reload', {});
                        connected = true;
                        setTimeout(function () {
                            closeServer();
                        }, 1000);
                    }
                });
                server.on('error', function (e) {
                    grunt.log.writeln('Server error: ' + e.description);
                    closeServer();
                });
                server.listen(8890);
                
                // Close server if no listeners
                setTimeout(function () {
                    grunt.log.writeln('Auto-reloader did not connect.');
                    closeServer();
                }, 5000);
            });
    });
};