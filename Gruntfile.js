module.exports = function (grunt) {
    require('create-grunt-tasks')(grunt, function (create) {

        //
        // --- Release task ---

        create.task('release')
            .sub('clean', [
                'build/'
            ])
            .sub('ts', {
                cwd: 'src',
                src: 'src/**/*.ts',
                dest: 'build/'
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
                cwd: 'build/',
                src: ['build/**/*'],
                dest: 'build.zip',
                compression: 'DEFLATE'
            })
            // Firefox
            .sub('clean', 'build-firefox')
            .sub('copy', {
                expand: true,
                cwd: 'build/',
                src: '**/*.*',
                dest: 'build-firefox/'
            })
            .sub('copy', {
                expand: true,
                cwd: 'src/',
                src: 'manifest.json',
                dest: 'build-firefox/',
                options: {
                    process: (content) => {
                        const fs = require('fs');
                        const path = require('path');
                        const obj = JSON.parse(content);
                        const ff = fs.readFileSync('src/manifest_firefox.json');
                        const ext = JSON.parse(ff);
                        Object.assign(obj, ext);
                        return JSON.stringify(obj, null, 4);
                    }
                }
            })
            .sub('copy', {
                expand: true,
                cwd: 'build-firefox/',
                src: 'background/extension.js',
                dest: 'build-firefox/',
                options: {
                    process: (content) => {
                        return content
                            .replace(/chrome\.fontSettings\.getFontList/g, 'chrome["font" + "Settings"]["get" + "Font" + "List"]')
                            .replace(/chrome\.fontSettings/g, 'chrome["font" + "Settings"]');
                    }
                }
            })
            .sub('zip', {
                cwd: 'build-firefox',
                src: ['build-firefox/**/*'],
                dest: 'build-firefox.zip',
                compression: 'DEFLATE'
            })
            .sub('ext-reload');

        //
        // --- Debug tasks ---

        create.task('debug')
            .sub('debug-js')
            // .sub('debug-css')
            .sub('debug-copy')
            .sub('ext-reload');

        function createJSConfig({ input, output, globalName, dependencies = {} }) {
            const depsNames = Object.keys(dependencies);
            return {
                options: {
                    format: 'iife',
                    moduleName: globalName,
                    useStrict: true,
                    // sourceMap: 'inline',
                    external: depsNames,
                    globals: dependencies,
                    plugins: [
                        require('@alexlur/rollup-plugin-typescript')({
                            typescript: require('typescript')
                        })
                    ]
                },
                files: {
                    [output]: input
                }
            };
        }

        create.task('debug-js')
            .sub('rollup', createJSConfig({
                input: 'src/ui/popup/index.tsx',
                output: 'debug/ui/popup/index.js',
                globalName: 'DarkReader.UI.Popup',
                dependencies: {
                    'malevic': 'Malevic',
                    'malevic/forms': 'Malevic.Forms'
                }
            }))
            .sub('rollup', createJSConfig({
                input: 'src/background/index.ts',
                output: 'debug/background/index.js',
                globalName: 'DarkReader.Background',
            }));

        create.task('debug-css')
            .sub('less', {
                files: {
                    'debug/ui/popup/style.css': 'src/popup/style/style.less'
                },
                options: {
                    paths: ['src/']
                }
            });

        create.task('debug-copy')
            .sub('copy', {
                expand: true,
                cwd: 'src/',
                src: [
                    'background/index.html',
                    'config/**/*.*',
                    'img/**/*.*',
                    'ui/popup/index.html',
                    'manifest.json',
                ],
                dest: 'debug/'
            })
            .sub('copy', {
                expand: true,
                cwd: 'node_modules/malevic/umd/',
                src: [
                    'index.js',
                    'forms.js',
                ],
                dest: 'debug/lib/malevic/'
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
            .sub('watch', {
                files: ['src/**/*.ts'],
                tasks: ['debug-js', 'ext-reload']
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