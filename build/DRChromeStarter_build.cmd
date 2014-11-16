set outfolder=DRChromeStarter
REM Compiling TS to single 'src\darkreader.js'.
"C:\Program Files (x86)\Microsoft SDKs\TypeScript\1.1\tsc.exe" @DRChromeStarter_files.txt --out %outfolder%\src\darkreader.js -t ES5
REM Copying contents.
XCOPY ..\src\DarkReader\chrome\starter\background.html %outfolder% /d /y
XCOPY ..\src\DarkReader\chrome\starter\manifest.json %outfolder% /d /y
XCOPY ..\src\DarkReader\generation\basic\*.json %outfolder%\ /d /y
XCOPY ..\src\DarkReader\img\*.* %outfolder%\img\ /d /y