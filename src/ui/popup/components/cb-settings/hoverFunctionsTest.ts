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
    var red = [255, 0, 0];
    var green = [0, 255, 0];
    var blue = [0, 0, 255];
    var pink = [255, 192, 203];
    var light_green = [144, 238, 144];
    var orange = [255, 165, 0];
    var yellow = [255, 255, 0];
    var brown = [165, 42, 42];
    var light_blue = [173, 216, 230];
    var purple = [128, 0, 128];
    var white = [255, 255, 255];
    var gray = [128, 128, 128];
    var black = [0, 0, 0];
    var light_pink = [255, 182, 193];
    var hot_pink = [255, 105, 180];
    var deep_pink = [255, 20, 147];
    var pale_violet_red = [219, 112, 147];
    var medium_violet_red = [199, 21, 133];
    var dark_red = [139, 0, 0];


    colorArray.push(red);
    colorArray.push(green);
    colorArray.push(blue);
    colorArray.push(pink);
    colorArray.push(light_green);
    colorArray.push(orange);
    colorArray.push(yellow);
    colorArray.push(brown);
    colorArray.push(light_blue);
    colorArray.push(purple);
    colorArray.push(white);
    colorArray.push(gray);
    colorArray.push(black);
    colorArray.push(light_pink);
    colorArray.push(hot_pink);
    colorArray.push(deep_pink);
    colorArray.push(pale_violet_red);
    colorArray.push(medium_violet_red);
    colorArray.push(dark_red);
    //console.log(colorArray[0][1]);

    for(var i = 0; i < colorArray.length; i++){
        
        var rgbDistance = Math.abs(r1 - colorArray[i][0]) + 
                          Math.abs(b1 - colorArray[i][1]) + 
                          Math.abs(g1 - colorArray[i][2]);
        if(rgbDistance < tempMinDistance){
            rgbArrayMinIndex = i;
            tempMinDistance = rgbDistance;
        }
         
    }

    switch (rgbArrayMinIndex) {
        case 0:
            rgb_final_color = "red";
            break;
        case 1:
            rgb_final_color = "green";
            break;
        case 2:
            rgb_final_color = "blue";
            break;
        case 3:
            rgb_final_color = "pink";
            break;
        case 4:
            rgb_final_color = "light green";
            break;
        case 5:
            rgb_final_color = "orange";
            break;
        case 6:
            rgb_final_color = "yellow";
            break;
        case 7:
            rgb_final_color = "brown";
            break;
        case 8:
            rgb_final_color = "light blue";
            break;
        case 9:
            rgb_final_color = "purple";
            break;
        case 10:
            rgb_final_color = "white";
            break;
        case 11:
            rgb_final_color = "gray";
            break;
        case 12:
            rgb_final_color = "black";
            break;
        case 13:
            rgb_final_color = "light pink";
            break;
        case 14:
            rgb_final_color = "pink";
            break;
        case 15:
            rgb_final_color = "dark pink";
            break;
        case 16:
            rgb_final_color = "light pink";
            break;
        case 17:
            rgb_final_color = "dark pink";
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