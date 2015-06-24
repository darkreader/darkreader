module.exports = function (grunt) {
    require('create-grunt-tasks')(grunt, function (create) {
        var config = getConfig();
        
        //
        // --- Release task ---
        
        create.task('release')
            .sub('clean', [
                'build/'
            ])
            .sub('typescript', {
                //cwd: 'src/',
                src: config.tsFiles,
                dest: 'build/',
                options: { target: 'es5' },
                //expand: true
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
                    //'**/*.js',
                    //'**/*.css',
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
            });

        //
        // --- Debug tasks ---
        
        create.task('debug')
            .sub('debug-js')
            .sub('debug-css');

        create.task('debug-js')
            .sub('typescript', {
                cwd: 'src/',
                src: config.tsFiles,
                options: { 
                    sourceMap: true, 
                    declaration: false,
                    target: 'es5',
                    //watch: 'src'
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
                cwd: 'src/',
                src: config.tsFiles,
                options: { 
                    sourceMap: true, 
                    declaration: false,
                    target: 'es5',
                    watch: 'src'
                }
            });
            
        create.task('debug-watch-css')
            .sub('watch', {
                files: ['src/**/*.less'],
                tasks: ['debug-css']
            });   

    });
};

function getConfig() {
    return {
        tsFiles:[
            'src/background/background.ts',
            'src/background/config_management.ts',
            'src/background/extension.ts',
            'src/background/filter_css_generator.ts',
            'src/popup/popup.ts',
            'src/popup/ui/font_select.ts',
            'src/popup/ui/popup_window.ts',
            'src/popup/ui/site_list.ts',
            'src/popup/ui/tab_panel.ts',
            'src/popup/ui/toggle.ts',
            'src/popup/ui/up_down.ts'
        ]
    };
}