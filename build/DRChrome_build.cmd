PROMPT $g
SET outfolder=DRChrome

ECHO "*** Compiling TS to single 'src\darkreader.js'... ***"
"C:\Program Files (x86)\Microsoft SDKs\TypeScript\1.1\tsc.exe" @DRChrome_files.txt --out %outfolder%\src\darkreader.js -t ES5 --declaration

ECHO "*** Compiling TS for pop-up page... ***"
"C:\Program Files (x86)\Microsoft SDKs\TypeScript\1.1\tsc.exe" @DRChrome_popup_files.txt %outfolder%\src\darkreader.d.ts --out %outfolder%\src\popup.js -t ES5

ECHO "*** Compiling event.ts for pop-up page... ***"
"C:\Program Files (x86)\Microsoft SDKs\TypeScript\1.1\tsc.exe" ..\src\DarkReader\app\event.ts --out %outfolder%\src\event.js -t ES5

ECHO "*** Removing type definition... ***"
DEL %outfolder%\src\darkreader.d.ts

ECHO "*** Copying contents... ***"
XCOPY ..\src\DarkReader\chrome\content\background.html %outfolder%\ /d /y
XCOPY ..\src\DarkReader\chrome\content\popup.html %outfolder%\ /d /y
XCOPY ..\src\DarkReader\chrome\content\manifest.json %outfolder%\ /d /y
XCOPY ..\src\DarkReader\chrome\content\img\* %outfolder%\img\ /d /y
XCOPY ..\src\DarkReader\chrome\content\font\* %outfolder%\font\ /d /y
XCOPY ..\src\DarkReader\chrome\content\style\style.css %outfolder%\style\ /d /y
XCOPY ..\src\DarkReader\generation\*.json %outfolder%\ /d /y
XCOPY ..\src\DarkReader\img\*.* %outfolder%\img\ /d /y