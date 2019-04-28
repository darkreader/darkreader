//functions for unit testing
//these functions are imported by hover.tests.ts
export function rgbtoHSV(rgbArray){
    //rgb values need to be in float (0 - 1) instead of (0 - 255)
    var red = rgbArray[0] / 255.0;
    var green = rgbArray[1] / 255.0;
    var blue = rgbArray[2] / 255.0;
    
    var res = [];
    var k = 0.0;
    var temp;
    
    if(green < blue){
        temp = green;
        green = blue;
        blue = temp;
        k = -1.0;
    }
    if(red < green){
        temp = red;
        red = green;
        green = temp;
        k = -2.0 / 6.0 - k;
    }
    var chroma = red;
    if(green < blue){
        chroma -= green;
    }
    else{
        chroma -= blue;
    }
    res[0] = Math.round((Math.abs(k + (green - blue) / (6.0 * chroma + 1e-20)) * 360));
    res[1] = Math.round(chroma / (red + 1e-20));
    res[2] = Math.round(red);
    return res; 
}
export function rgbToColor(rgbArray){
    var colorArray = [];
    var rgbArrayMinIndex = 0;
    var tempMinDistance = 10000000;
    var rgb_final_color = "unknown";
    var r1 = rgbArray[0];
    var b1 = rgbArray[1];
    var g1 = rgbArray[2];

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
    colorArray.push([128,0,0]);         //maroon

    for(var i = 0; i < colorArray.length; i++){
        
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
export function HSVtoColor(hsvArray){
    var hue = hsvArray[0];
    var sat = hsvArray[1];
    var val = hsvArray[2];
    
    //Begin Error checking
    if(hue < 0 || hue > 360){
        console.log("Hue value: " + hue + " Hue is not between 0 and 360");
    }
    //Begin HSV testing
    //TODO: Add black, white, gray, orange
    var color;
    if(val < 0.2){
        color = "black";
    }
    else if((sat < 0.2) && (val < 0.85)){
        color = "grey";
    }
    else if((sat < 0.15) && (val > 0.85)){
        color = "white";
    }
    else if((hue >= 0) && (hue < 30)){
        color = "red";
    }
    else if((hue >= 30) && (hue < 60)){
        color = "orange";
    }
    else if((hue >= 60) && (hue < 110)){
        color = "yellow";
    }
    else if((hue >= 110) && (hue < 180)){
        color = "green";
    }
    else if((hue >= 180) && (hue < 240)){
        color = "cyan";
    }
    else if((hue >= 240) && (hue < 300)){
        color = "blue";
    }
    else if((hue >= 300) && (hue < 360)){
        color = "magenta";
    }
    else{
        color = "unknown?"
    }
    return color;
}