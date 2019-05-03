//this version of hoverFunction uses chrome's capturevisibleTab method to obtain an image
/*
Things Checked:
    1. Image dataUrl is consistent with dataUrl obtained before code injection
    2. Image has consistent width and length parameters
    3. onmousemove seems to work correctly
    4. Image width and length correspond to cursor x,y maximums (image captures entire browser window)
    5. RGB values are correct, works with entire browser window
    6. HSV values are correct, works correctly with mouse x,y position
    7. Some exceptions are being thrown. These exceptions are related the the getImageData function
    from the prepareCanvas function. I believe this issue is due to how I'm drawing the image to the canvas.
    I looked into this issue, one mentioned fix was using the image's natural height and width instead of the
    regular height and width. I did this, but the exception was still being thrown. I have surrounded the 
    onmousemove statements in a try catch block to deal with these exceptions.
*/
export function hoverFunVer2(){
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var currentTab = tabs[0];

        var scriptInputs = [currentTab.id, currentTab.windowId];

        chrome.tabs.executeScript(currentTab.id, {
            code: '(' + 
                function(tabId, windowId) {
                    var dataUrl = null;

                    var latestRequestId = -1;
                    var latestFinishedRequestId = -1;
                    function captureVisibleTab(callback) {
                        var thisRequestId = ++latestRequestId;

                        chrome.runtime.sendMessage({
                            message: "Capture visible tab", 
                            tabId: tabId, 
                            windowId: windowId
                        }, function(response) {
                            if (response.message == "Captured visible tab") {
                                if (thisRequestId > latestFinishedRequestId) { 
                                    latestFinishedRequestId = thisRequestId; // TODO: fix race condition with if statement, and dataUrl update
                                    dataUrl = response.dataUrl; 
                                }
                                callback();
                            }
                        });
                    }
                    captureVisibleTab(function() { });

                    //all javascript here is executed by browser, not extension
                    function round(value, decimals){
                        return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
                    }
                    //gets x,y position of the cursor
                    function getMousePos(e){
                        return {x:e.clientX,y:e.clientY};
                    }
                    //gets the rgb values of a pixel
                    function getPixel(imgData, index) {
                        var i = index*4, d = imgData.data;
                        return [d[i],d[i+1],d[i+2],d[i+3]] // [R,G,B,A]
                    }
                    //input: image data, x,y location of the cursor
                    //output: rgb values of the pixel at cursor location  
                    function getPixelXY(imgData, x, y) {
                        return getPixel(imgData, y*imgData.width+x);
                    }
                    //prepares the canvas, returns image data of the entire image (browser window)
                    function prepareCanvas(){
                        var final_img = new Image();
                        final_img.src = dataUrl;

                        if (final_img.width > 0 && final_img.height > 0) {
                            var canvas = document.createElement('canvas');
                            canvas.width = final_img.width;
                            canvas.height = final_img.height;
                            var context = canvas.getContext("2d");
                            context.drawImage(final_img,0,0,canvas.width,canvas.height);
                            var idt = context.getImageData(0, 0, canvas.width, canvas.height);
                            return {image_data: idt, width: canvas.width, height: canvas.height};
                        } else {
                            return null;
                        }
                    }
                    function getViewportDimensions() {
                        return {width: window.innerWidth, height: window.innerHeight};
                    }
                    
                    function rgbToColor(rgbArray){
                        var colorArray = [];
                        var rgbArrayMinIndex = 0;
                        var tempMinDistance = 10000000;
                        var rgb_final_color = "unknown";
                        var r1 = rgbArray[0];
                        var b1 = rgbArray[1];
                        var g1 = rgbArray[2];

                        //Pink Colors
                        colorArray.push([255, 0, 0]);       //red
                        colorArray.push([0, 255, 0]);       //green
                        colorArray.push([0, 0, 255]);       //blue
                        colorArray.push([255, 192, 203]);   //pink
                        colorArray.push([144, 238, 144]);   //light green
                        colorArray.push([255, 165, 0]);     //orange
                        colorArray.push([255, 255, 0]);     //yellow
                        colorArray.push([165, 42, 42]);     //brown
                        colorArray.push([173, 216, 230]);   //light blue
                        colorArray.push([128, 0, 128]);     //purple
                        colorArray.push([255, 255, 255]);   //white
                        colorArray.push([128, 128, 128]);   //gray
                        colorArray.push([0, 0, 0]);         //black
                        colorArray.push([255, 182, 193]);   //light pink
                        colorArray.push([255, 105, 180]);   //hot pink
                        colorArray.push([255, 20, 147]);    //deep pink
                        colorArray.push([219, 112, 147]);   //pale violet red
                        colorArray.push([199, 21, 133]);    //medium violet red
                        colorArray.push([139, 0, 0]);       //dark red
                        colorArray.push([255, 160, 122]);   //light salmon
                        colorArray.push([255, 128, 114]);   //salmon
                        colorArray.push([240,248,255]);     //alice blue
                        colorArray.push([250,235,215]);     //antique white
                        colorArray.push([0,255,255]);       //aqua
                        colorArray.push([127,255,212]);     //aquamarine
                        colorArray.push([240,255,255]);     //azure
                        colorArray.push([245,245,220]);     //beige
                        colorArray.push([255,228,196]);     //bisque
                        colorArray.push([255,235,205]);     //blanched almond
                        colorArray.push([138,43,226]);      //blue violet
                        colorArray.push([222,184,135]);     //burly wood
                        colorArray.push([255,127,80]);      //coral
                        colorArray.push([255,140,0]);       //dark orange
                        colorArray.push([255,255,224]);     //light yellow
                        colorArray.push([255,215,0]);       //gold
                        colorArray.push([128,0,0]);         //maro

                        for(i = 0; i < colorArray.length; i++){
                            
                            var rgbDistance = Math.abs(r1 - colorArray[i][0]) + 
                                            Math.abs(b1 - colorArray[i][1]) + 
                                            Math.abs(g1 - colorArray[i][2]);
                            if(rgbDistance < tempMinDistance){
                                rgbArrayMinIndex = i;
                                tempMinDistance = rgbDistance;
                            }
                            
                        }

                                //NAMED COLOR                       //ACTUAL COLOR
                        switch (rgbArrayMinIndex) {
                            case 0:
                                rgb_final_color = "red";            //red
                                break;
                            case 1:
                                rgb_final_color = "green";          //green
                                break;
                            case 2:
                                rgb_final_color = "blue";           //blue
                                break;
                            case 3:
                                rgb_final_color = "pink";           //pink
                                break;
                            case 4:
                                rgb_final_color = "light green";    //light green
                                break;
                            case 5:
                                rgb_final_color = "orange";         //orange
                                break;
                            case 6:
                                rgb_final_color = "yellow";         //yellow
                                break;
                            case 7:
                                rgb_final_color = "brown";          //brown
                                break;
                            case 8:
                                rgb_final_color = "light blue";     //light blue
                                break;
                            case 9:
                                rgb_final_color = "purple";         //purple
                                break;
                            case 10:
                                rgb_final_color = "white";          //white
                                break;
                            case 11:
                                rgb_final_color = "gray";           //gray
                                break;
                            case 12:
                                rgb_final_color = "black";          //black
                                break;
                            case 13:
                                rgb_final_color = "light pink";     //light pink
                                break;
                            case 14:
                                rgb_final_color = "pink";           //hot pink
                                break;
                            case 15:
                                rgb_final_color = "dark pink";      //deep pink
                                break;
                            case 16:
                                rgb_final_color = "light pink";     //pale violet red
                                break;
                            case 17:
                                rgb_final_color = "dark pink";      //medium violet red
                                break;
                            case 18:
                                rgb_final_color = "dark red"        //dark red
                                break;
                            case 19:
                                rgb_final_color = "pink"            //light salmon POTENTIAL PROBLEM
                                break;
                            case 20:
                                rgb_final_color = "pink"            //salmon
                                break;
                            case 21:
                                rgb_final_color = "light blue"      //alice blue
                                break;
                            case 22:
                                rgb_final_color = "white"           //antique white
                                break;
                            case 23:
                                rgb_final_color = "light blue"      //aqua
                                break;
                            case 24:
                                rgb_final_color = "light blue"      //aquamarine
                                break;
                            case 25:
                                rgb_final_color = "white"           //azure
                                break;
                            case 26:
                                rgb_final_color = "white"           //beige
                                break;
                            case 27:
                                rgb_final_color = "light brown"     //bisque
                                break;
                            case 28:
                                rgb_final_color = "light brown"     //blanched almond POTENTIAL PROBLEM
                                break;
                            case 29:
                                rgb_final_color = "purple"           //blue violet
                                break;
                            case 30:
                                rgb_final_color = "light brown"      //burly wood
                                break;
                            case 31:
                                rgb_final_color = "light orange"    //coral
                                break;
                            case 32:
                                rgb_final_color = "dark orange"     //dark orange
                                break;
                            case 33:
                                rgb_final_color = "light yellow"    //light yellow
                                break;
                            case 34:
                                rgb_final_color = "dark yellow"     //gold
                                break;
                            case 35:
                                rgb_final_color = "dark brown"      //maroon
                                break;

                            default:
                                break;
                        }

                        return rgb_final_color;
                    }

                    var indicatorDiv = document.createElement('div');
                    indicatorDiv.style = "position: fixed; left: 200px; top: 30px; z-index: 9999; background-color: white; border: 2px solid black; display: flex; flex-direction: row; align-items: center";

                    var indicatorText = document.createElement('div');
                    indicatorText.textContent = "Color";
                    indicatorText.style = "font-size: 30px; color: black;";
                    indicatorDiv.appendChild(indicatorText);

                    var indicatorLoadingImage = document.createElement("img");
                    indicatorLoadingImage.src = "https://i.imgur.com/kfk1nBZ.gif";
                    indicatorLoadingImage.alt = "(loading)";
                    indicatorLoadingImage.style = "display: none";
                    indicatorLoadingImage.id = "hoverColorLoading"
                    indicatorDiv.appendChild(indicatorLoadingImage);

                    var root = document.documentElement;
                    root.prepend(indicatorDiv);

                    var mouseCoords = null;

                    function updateDisplayedColor() {
                        if (dataUrl != null && mouseCoords != null) {
                            var canvas = prepareCanvas();
                            if (canvas != null) {
                                var viewport = getViewportDimensions();
                                var adjustedMouseCoords = {
                                    x: Math.round(mouseCoords.x * (canvas.width / viewport.width)),
                                    y: Math.round(mouseCoords.y * (canvas.height / viewport.height))
                                };
                                var rgbArray = getPixelXY(canvas.image_data, adjustedMouseCoords.x, adjustedMouseCoords.y);
                                var final_color = rgbToColor(rgbArray);
    
                                indicatorText.textContent = final_color;
                            }
                        }
                    }

                    var mouseMoveFun = function(e){
                        mouseCoords = getMousePos(e);
                        updateDisplayedColor();
                    }
                    document.addEventListener("mousemove", mouseMoveFun);

                    var numberOfActiveScrollEvents = 0; 
                    window.addEventListener("scroll", function(e) { 
                        indicatorLoadingImage.style = "display: block";
                        numberOfActiveScrollEvents++;
                        
                        captureVisibleTab(function() { 
                            updateDisplayedColor();
                            numberOfActiveScrollEvents--; // TODO: fix race condition with if statement
                            if (numberOfActiveScrollEvents == 0) { 
                                indicatorLoadingImage.style = "display: none";
                            }
                        });
                    });

                } + ')(' + scriptInputs.join(", ") + ');'
        }, function() { });
    });
}