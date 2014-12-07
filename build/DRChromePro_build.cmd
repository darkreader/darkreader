set outfolder=DRChromePro
ECHO "*** Compiling TS to single 'src\darkreader.js'... ***"
"C:\Program Files (x86)\Microsoft SDKs\TypeScript\1.1\tsc.exe" @DRChromePro_files.txt --out %outfolder%\src\darkreader.js -t ES5 --declaration
ECHO "*** Compiling TS for popup page... ***"
"C:\Program Files (x86)\Microsoft SDKs\TypeScript\1.1\tsc.exe" ..\src\DarkReader\chrome\pro\popup.ts ..\src\DarkReader\typings\chrome\chrome.d.ts %outfolder%\src\darkreader.d.ts
ECHO "*** Copying contents... ***"
XCOPY ..\src\DarkReader\chrome\pro\background.html %outfolder%\ /d /y
XCOPY ..\src\DarkReader\chrome\pro\popup.html %outfolder%\ /d /y
XCOPY ..\src\DarkReader\chrome\pro\popup.js %outfolder%\ /d /y
XCOPY ..\src\DarkReader\chrome\pro\manifest.json %outfolder%\ /d /y
XCOPY ..\src\DarkReader\chrome\pro\img\* %outfolder%\img\ /d /y
XCOPY ..\src\DarkReader\chrome\pro\style\style.css %outfolder%\style\ /d /y
XCOPY ..\src\DarkReader\generation\rules\*.json %outfolder%\ /d /y
XCOPY ..\src\DarkReader\img\*.* %outfolder%\img\ /d /y
ECHO "*** Removing type definition... ***"