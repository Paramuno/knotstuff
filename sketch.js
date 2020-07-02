const w = 700
const h = 700
let drawControls = true

let activeBpoint // vector location of activebpoint

let activeBezier // active bezier bpoint object
let prevactiveBezier
let bpointArray = []
let baseArray = [] // array of base bpoint objects

let finalBeziers = [] // array of copied bpoint subobjects for saving
let jsonCount = 0
let pageCenter // offset for centering

let knotspaceX // Current position in whislte range
let interpolating = false // Are we interpolating rn?

// let tempBezier // tempBezier for comparison, the tempBezier is drawn with another draw function
// let canvas
// let ctx

function preload() {
  savedknots = loadJSON("data/knotJSON0.json")
  savedknots1 = loadJSON("data/knotJSON1.json")
}

function setup() {
  createCanvas(windowWidth, windowHeight - 4);
  // canvas = document.getElementById("defaultCanvas0") // initializing drawcanvas
  // ctx = canvas.getContext("2d")
  background(240);
  noStroke();
  let cw = (width / 2)
  let ch = (height / 2)
  bpointArray.push(new Bpoint(true, createVector(cw - 200, ch - 50), createVector(cw - 125, ch - 50), createVector(cw - 275, ch - 50), 0))
  bpointArray.push(new Bpoint(true, createVector(cw - 200, ch + 50), createVector(cw - 275, ch + 50), createVector(cw - 125, ch + 50), 1))
  bpointArray.push(new Bpoint(true, createVector(cw + 200, ch + 50), createVector(cw + 125, ch + 50), createVector(cw + 275, ch + 50), 2))
  bpointArray.push(new Bpoint(true, createVector(cw + 200, ch - 50), createVector(cw + 275, ch - 50), createVector(cw + 125, ch - 50), 3))
  for (let i = 0; i < bpointArray.length; i++) { // init baseArray
    if (bpointArray[i].isBase) {
      baseArray.push(bpointArray[i])
    }
  }
  knotspaceX = createSlider(0, 100, 0);
  knotspaceX.position(150, 5);
  // tempBezier = new Bezier(100,25 , 10,90 , 110,100 , 150,195) //Initializing tempBezier
}

function draw() {
  background(240)
  if (drawControls) {
    for (let i = 0; i < bpointArray.length; i++) { //control Bpoints and handles
      bpointArray[i].calcMouse();
      bpointArray[i].displayBpoint();
    }
  }
  drawBezier()
  drawAttractor()
  if (interpolating) {
    interpolatebpointArray(savedknots, savedknots1)
  }
}

function Bpoint(basestatus, pos, h1pos, h2pos, index) {
  //function Bpoint(posx, posy, h1posx, h1posy, h2posx, h2posy, cornerstatus) {
  this.index = index
  this.isBase = basestatus
  this.isAsymmetrical = true
  this.isCorner = false // Is this a Bezier corner
  this.location = createVector(pos.x, pos.y);
  this.h1location = createVector(h1pos.x, h1pos.y);
  this.h2location = createVector(h2pos.x, h2pos.y);
  this.clickable
  this.h1clickable
  this.h2clickable
  this.bpointsize = 20
  this.hsize = this.bpointsize - 5 // Handle size


  this.drag = function() { // If point is clickable and last activated, drag with mouse
    if (this.clickable && activeBpoint == this.location) {
      this.location.x = mouseX
      this.location.y = mouseY
      let offset = .642 // Offset by which pmouse exceeds mousedrag
      this.h1location.add((mouseX - pmouseX) * offset, (mouseY - pmouseY) * offset) //adding mousechange to handle vectors
      this.h2location.add((mouseX - pmouseX) * offset, (mouseY - pmouseY) * offset)

    } else if (this.h1clickable && activeBpoint == this.h1location) {
      if (this.isCorner) {
        this.h1location.x = mouseX
        this.h1location.y = mouseY
      } else {
        this.h1location.x = mouseX
        this.h1location.y = mouseY
        this.h2location = p5.Vector.lerp(this.h1location, this.location, 2) // defines h2 as in the path between h1 and Bpoint multiplied by 2
      }
    } else if (this.h2clickable && activeBpoint == this.h2location) {
      if (this.isCorner) {
        this.h2location.x = mouseX;
        this.h2location.y = mouseY;
      } else {
        this.h2location.x = mouseX
        this.h2location.y = mouseY
        this.h1location = p5.Vector.lerp(this.h2location, this.location, 2)
      }
    }
  }
  this.calcMouse = function() { //evaluating pointClickable for each of the 3 points
    if (pointClickable(this.location, this.bpointsize)) {
      this.clickable = true
      //canvas.style.cursor='move'; //You could change pointer styles
    } else {
      this.clickable = false
    }
    if (pointClickable(this.h1location, this.hsize)) {
      this.h1clickable = true
    } else {
      this.h1clickable = false
    }
    if (pointClickable(this.h2location, this.hsize)) {
      this.h2clickable = true
    } else {
      this.h2clickable = false
    }
  }
  this.displayBpoint = function() { // draw points and links in screen
    stroke(100)
    strokeWeight(1)
    line(this.location.x, this.location.y, this.h1location.x, this.h1location.y)
    line(this.location.x, this.location.y, this.h2location.x, this.h2location.y)
    noStroke()
    if (activeBezier == this) {
      fill(50, 255, 255)
    } else if (prevactiveBezier == this) {
      fill(50, 175, 255)
    } else {
      fill(255, 139, 0)
    }
    ellipse(this.location.x, this.location.y, this.bpointsize)
    stroke(255, 0, 0)
    noFill()
    ellipse(this.h1location.x, this.h1location.y, this.hsize)
    stroke(200, 100, 0)
    ellipse(this.h2location.x, this.h2location.y, this.hsize)

  }
}

function pointClickable(point, size) { // Is my mouse over this point?
  let distance
  if (mouseX > point.x - 100 && mouseX < point.x + 100 && mouseY > point.y - 100 && mouseY < point.y + 100) { //gaining 4-5 fps
    distance = dist(mouseX, mouseY, point.x, point.y); // calc distance betwwen mouse and this pos
    if (distance < size / 2) {
      return true
    } else {
      return false
    }
  } else {
    return false
  }
}

function drawBezier() {
  stroke(50);
  strokeWeight(10);
  noFill();
  beginShape();
  for (let i = 0; i < bpointArray.length - 1; i++) { // Draw bezier
    bezier(bpointArray[i].location.x, bpointArray[i].location.y, //anchor1
      bpointArray[i].h2location.x, bpointArray[i].h2location.y, //control1
      bpointArray[i + 1].h1location.x, bpointArray[i + 1].h1location.y, //control2
      bpointArray[i + 1].location.x, bpointArray[i + 1].location.y) //anchor2
  }
  bezier(bpointArray[bpointArray.length - 1].location.x, bpointArray[bpointArray.length - 1].location.y, // connect last one w/first
    bpointArray[bpointArray.length - 1].h2location.x, bpointArray[bpointArray.length - 1].h2location.y,
    bpointArray[0].h1location.x, bpointArray[0].h1location.y,
    bpointArray[0].location.x, bpointArray[0].location.y)
  endShape();


  // drawCurve(tempBezier) //other drawcurve function
}

function updatebpointArray(json) {
  if (bpointArray.length == Object.keys(json).length) {
    print("bby")
    for (i = 0; i < bpointArray.length; i++) { // replacing bpoint params, addingcenter and window offset to positions
      bpointArray[i].location.x = json[i].lx + ((windowWidth / 2) - json[i].cx) + json[i].offx
      bpointArray[i].location.y = json[i].ly + ((windowHeight / 2) - json[i].cy) + json[i].offy
      bpointArray[i].h1location.x = json[i].h1x + ((windowWidth / 2) - json[i].cx) + json[i].offx
      bpointArray[i].h1location.y = json[i].h1y + ((windowHeight / 2) - json[i].cy) + json[i].offy
      bpointArray[i].h2location.x = json[i].h2x + ((windowWidth / 2) - json[i].cx) + json[i].offx
      bpointArray[i].h2location.y = json[i].h2y + ((windowHeight / 2) - json[i].cy) + json[i].offy
      bpointArray[i].index = json[i].index;
      bpointArray[i].isBase = json[i].isBase;
    }
    baseArray.length = 0 //emptying base Array
    for (i = 0; i < bpointArray.length; i++) { // filling with new bases
      if (bpointArray[i].isBase) {
        baseArray.push(bpointArray[i])
      }
    }
  } else { // consoleprint the number of bpoints required
    print("add Bpoints:" + bpointArray.length + "/" + Object.keys(json).length)
  }
}

function drawAttractor() { // Drawing attractors between base bpoints
  let apos1 = p5.Vector.lerp(baseArray[0].location, baseArray[1].location, .5)
  let apos2 = p5.Vector.lerp(baseArray[2].location, baseArray[3].location, .5)
  strokeWeight(5)
  stroke(200)
  fill(240)
  ellipse(apos1.x, apos1.y, 20)
  ellipse(apos2.x, apos2.y, 20)
  pageCenter = p5.Vector.lerp(apos1, apos2, .5)
}

// function drawCurve(curve, offset) {
//   stroke(50)
//   strokeWeight(1)
//   offset = offset || {
//     x: 0,
//     y: 0
//   };
//   var ox = offset.x;
//   var oy = offset.y;
//   ctx.beginPath();
//   var p = curve.points,
//     i;
//   ctx.moveTo(p[0].x + ox, p[0].y + oy);
//   if (p.length === 3) {
//     ctx.quadraticCurveTo(
//       p[1].x + ox, p[1].y + oy,
//       p[2].x + ox, p[2].y + oy
//     );
//   }
//   if (p.length === 4) {
//     ctx.bezierCurveTo(
//       p[1].x + ox, p[1].y + oy,
//       p[2].x + ox, p[2].y + oy,
//       p[3].x + ox, p[3].y + oy
//     );
//   }
//   ctx.stroke();
//   ctx.closePath();
// } // other drawcurve function

function createBpoint() {
  if ((activeBezier && prevactiveBezier != undefined)) {
    if ((activeBezier.index < prevactiveBezier.index) && (activeBezier.index !== 0)) {
      [activeBezier, prevactiveBezier] = [prevactiveBezier, activeBezier] // switches activeBeziers
    }
    // let r = p5.Vector.lerp(activeBezier.location, prevactiveBezier.location, 0.5) // previous system which created newbpoint in the .5lerp of actiev bpoints
    // let h1 = p5.Vector.lerp(r, prevactiveBezier.location, .2)
    // let h2 = p5.Vector.lerp(r, activeBezier.location, .2)
    tempBezier = new Bezier(activeBezier.location.x, activeBezier.location.y, activeBezier.h1location.x, activeBezier.h1location.y,
      prevactiveBezier.h2location.x, prevactiveBezier.h2location.y, prevactiveBezier.location.x, prevactiveBezier.location.y)

    let r = tempBezier.get(.5)

    if ((activeBezier.index && prevactiveBezier.index) !== 0) {
      //bpointArray.splice(prevactiveBezier.index + 1, 0, new Bpoint(false, r, h1, h2, activeBezier.index)) // Old system: creates newBpoint in the path between active and preactvie Beiers
      bpointArray.splice(prevactiveBezier.index + 1, 0, new Bpoint(false, r, r, r, activeBezier.index))
      compensateHandle(true)
    } else if (prevactiveBezier.index == 0) { // Fixed invertion of handles for special case preactivebezier.index = 0

      tempBezier = new Bezier(activeBezier.location.x, activeBezier.location.y, activeBezier.h2location.x, activeBezier.h2location.y,
        prevactiveBezier.h1location.x, prevactiveBezier.h1location.y, prevactiveBezier.location.x, prevactiveBezier.location.y)
      r = tempBezier.get(.5)

      bpointArray.push(new Bpoint(false, r, r, r, bpointArray.length))
      compensateHandle(false)
    } else { // if activeBezier is 0, push new Bpoint instead of splicing
      bpointArray.push(new Bpoint(false, r, r, r, bpointArray.length))
      compensateHandle(true)
    }
  }
  for (let i = 0; i < bpointArray.length; i++) { //updatinng indexes
    bpointArray[i].index = i
  }
  print("current Bpoints:" + bpointArray.length)
}

function compensateHandle(h1isfirst) { // reducing the handle length to compensate for new point in the middle of previous bezier
  let factor = .245
  if (h1isfirst) {
    activeBezier.h1location = p5.Vector.lerp(activeBezier.h1location, activeBezier.location, factor)
    prevactiveBezier.h2location = p5.Vector.lerp(prevactiveBezier.h2location, prevactiveBezier.location, factor)
  } else {
    activeBezier.h2location = p5.Vector.lerp(activeBezier.h2location, activeBezier.location, factor)
    prevactiveBezier.h1location = p5.Vector.lerp(prevactiveBezier.h1location, prevactiveBezier.location, factor)
  }
}

function interpolateVec(p1, p2, i) { // interpolates 2 points at one i pos
  let ix = p1.x + (p2.x - p1.x) * i;
  let iy = p1.y + (p2.y - p1.y) * i;
  let a = createVector(ix, iy);
  return a; // returns vector iterpolated at point i
}

function interpolatebpointArray(json1, json2) {
  let ksX = map(knotspaceX.value(), 0, 100, 0, 1)

  let locorigin = createVector()
  let h1origin = createVector()
  let h2origin = createVector()
  let loctarget = createVector()
  let h1target = createVector()
  let h2target = createVector()

  if (bpointArray.length == Object.keys(json1).length) {
    for (i = 0; i < bpointArray.length; i++) {
      locorigin.x = json1[i].lx + ((windowWidth / 2) - json1[i].cx) + json1[i].offx
      locorigin.y = json1[i].ly + ((windowHeight / 2) - json1[i].cy) + json1[i].offy
      h1origin.x = json1[i].h1x + ((windowWidth / 2) - json1[i].cx) + json1[i].offx
      h1origin.y = json1[i].h1y + ((windowHeight / 2) - json1[i].cy) + json1[i].offy
      h2origin.x = json1[i].h2x + ((windowWidth / 2) - json1[i].cx) + json1[i].offx
      h2origin.y = json1[i].h2y + ((windowHeight / 2) - json1[i].cy) + json1[i].offy

      loctarget.x = json2[i].lx + ((windowWidth / 2) - json2[i].cx) + json2[i].offx
      loctarget.y = json2[i].ly + ((windowHeight / 2) - json2[i].cy) + json2[i].offy
      h1target.x = json2[i].h1x + ((windowWidth / 2) - json2[i].cx) + json2[i].offx
      h1target.y = json2[i].h1y + ((windowHeight / 2) - json2[i].cy) + json2[i].offy
      h2target.x = json2[i].h2x + ((windowWidth / 2) - json2[i].cx) + json2[i].offx
      h2target.y = json2[i].h2y + ((windowHeight / 2) - json2[i].cy) + json2[i].offy

      bpointArray[i].location = p5.Vector.lerp(locorigin, loctarget, ksX)
      bpointArray[i].h1location = p5.Vector.lerp(h1origin, h1target, ksX)
      bpointArray[i].h2location = p5.Vector.lerp(h2origin, h2target, ksX)
    }
  } else { // consoleprint the number of bpoints required
    print("add Bpoints:" + bpointArray.length + "/" + Object.keys(json1).length)
  }
}


function deleteBpoint() {
  bpointArray.splice(activeBezier.index, 1) // in position index, delete 1 element
  for (let i = 0; i < bpointArray.length; i++) { //updatinng indexes
    bpointArray[i].index = i
  }
}

function keyPressed() {
  if (keyCode === 86) { //v
    activeBezier.isCorner = !activeBezier.isCorner
  }
  if (keyCode === 88) { // x
    [activeBezier.h1location, activeBezier.h2location] = [activeBezier.h2location, activeBezier.h1location] // Switches handle locations
  }
  if (keyCode === 90) { //z
    createBpoint()
  }
  if (keyCode === 65) { //a
    deleteBpoint()
  }
  if (keyCode === 68) { //d
    drawControls = !drawControls
  }
  if (keyCode === 67) { //c
    activeBezier.isAsymmetrical = !activeBezier.isAsymmetrical // locked handle but asym lenghts is not defined yet
  }
  if (keyCode === 83) { //s
    for (let i = 0; i < bpointArray.length; i++) { // filling finalBeziers array with Bpointpos objects (simplified Bpoints)
      finalBeziers.push(new Bpointpos(bpointArray[i].index, bpointArray[i].isBase,
        bpointArray[i].location.x, bpointArray[i].location.y,
        bpointArray[i].h1location.x, bpointArray[i].h1location.y,
        bpointArray[i].h2location.x, bpointArray[i].h2location.y))
    }
    downloadObjectAsJson(finalBeziers, "knotJSON" + jsonCount)
    jsonCount++
    print("saved json")
  }
  if (keyCode === 84) { // t
    updatebpointArray(savedknots1) // change location for dots to savedknots json
  }
  if (keyCode === 73) { // i
    interpolating = !interpolating // allow interpolation
  }
}

function Bpointpos(index, basestatus, posx, posy, h1posx, h1posy, h2posx, h2posy) { // simplified Bpoints for saving in json
  this.index = index
  this.isBase = basestatus
  this.offx = (windowWidth / 2) - pageCenter.x //saving the offset, the diff between center of bases and center of page
  this.offy = (windowHeight / 2) - pageCenter.y
  this.cx = (windowWidth / 2) // saving the current canvas size
  this.cy = (windowHeight / 2)
  this.lx = posx
  this.ly = posy
  this.h1x = h1posx
  this.h1y = h1posy
  this.h2x = h2posx
  this.h2y = h2posy
}

function mousePressed() { //Points activate with a click before being able to drag them
  for (let i = 0; i < bpointArray.length; i++) {
    if (pointClickable(bpointArray[i].location, bpointArray[i].bpointsize)) {
      activeBpoint = bpointArray[i].location
      prevactiveBezier = activeBezier
      activeBezier = bpointArray[i]
      print(activeBezier.index)
    } else if (pointClickable(bpointArray[i].h1location, bpointArray[i].hsize)) {
      activeBpoint = bpointArray[i].h1location
    } else if (pointClickable(bpointArray[i].h2location, bpointArray[i].hsize)) {
      activeBpoint = bpointArray[i].h2location
    }
  }
}

function mouseDragged() {
  for (let i = 0; i < bpointArray.length; i++) {
    bpointArray[i].drag();
  }
  return false; // prevent default
}

function downloadObjectAsJson(exportObj, exportName) {
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 4));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
