module.exports = function (grunt) {
    require('create-grunt-tasks')(grunt, function (create) {
        
        //
        // --- Release task ---
        
        create.task('release')
            .sub('clean', [
                'build/'
            ])
            .sub('typescript', {
                src: 'src/**/*.ts',
                dest: 'build/',
                expand: true,
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
                    'config/*.*',
                    'img/*.*',
                    'lib/**/*.js',
                    'popup/font/*.*',
                    'popup/img/*.*',
                    'manifest.json',
                ],
                dest: 'build/',
                expand: true
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
                tasks: ['debug-watch-js', 'debug-watch-css'],
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

        // --- Reload chrome extensions ---
        // WARNING: Seems like reloading doesn't work anymore in Chrome 45?
        create.task('ext-reload')
            .sub(function () {
                // Create server to communicate with Google Chrome reload extension
                // https://chrome.google.com/webstore/detail/chrome-unpacked-extension/fddfkmklefkhanofhlohnkemejcbamln?utm_source=chrome-app-launcher-info-dialog
                var done = this.async();
                var server = require('http').createServer();
                var io = require('socket.io')(server);
                var connected = false;
                var sockets = {};
                var socketId = 0;
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
                    sockets[socketId++] = socket;
                });
                io.sockets.on('connection', function (socket) {
                    if (!connected) {
                        grunt.log.writeln('Auto-reloader connected.');
                        socket.emit('file.change', {});
                        connected = true;
                        setTimeout(function () {
                            closeServer();
                        }, 1000);
                    }
                });
                io.sockets.on('error', function (e) {
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