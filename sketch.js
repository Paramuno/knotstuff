let drawControls = true

let activeBpoint // vector location of activebpoint

let activeBezier // active bezier bpoint object
let prevactiveBezier
let bpointArray = []
let baseArray = [] // array of base bpoint objects

let finalBeziers = [] // array of copied bpoint subobjects for saving
let jsonCount = 0
let pageCenter // offset for centering

// let knotspaceX // Slider for position in whislte range
let knotspace = [] // Array which contains all saved JSONs
let vel = .00001 // default initial velocity for interpolating to looseknot
let looseknot = false // does the knot return to loose all the time?
let permissiongiven = false
let whistling = false // Is whistling detected?
let whistlingArray = [] // A buffer array to smooth out whistling signals
const minHz = 550 // defined whistling range in Hz
const maxHz = 2000
let currCidBuffer = [] // centroid Buffer (may be unnecessary now that currC is synchronized)

// let tempBezier // tempBezier for comparison, the tempBezier is drawn with a ctx draw function
// let canvas
// let ctx

let spectrum // fft analyze product
let spectralCentroid // centroid in Hz
let centroids = [] // A centroid buffer
let averagingCentroids = true // smoothing Centroid by averaging with buffer

let chooseBuffer // A buffer to save the last chosen word and display it
const knotsNum = 4 // Number of available knot JSONs

let floaters = [] // floaters img array
let floRots = [] // array for rotations of the floaters
let seed1 = 0 // noise seeds
let seed2 = 1000

function preload() {
  for (let i = 0; i < knotsNum; i++) { // initialize all available knots
    knotspace.push(loadJSON("data/knotJSON" + i + ".json"))
  }
  loosejson = loadJSON("data/loosejson.json")
  keyWords = loadJSON("data/WordSets.json")
  for (let i = 0; i < 6; i++) { //initalizing 6 floater bois and pushing random rotations in a matching array
    floaters.push(loadImage("images/floater" + i + ".png"))
    floRots.push(random(-180, 180))
  }
}

var gl, noctaves, c;

function setup() {
  //createCanvas(windowWidth, windowHeight - 4);
  ///
  createCanvas(windowWidth, windowHeight - 4)
  texShader = createGraphics(windowWidth, windowHeight - 4, WEBGL)
  gl = texShader.canvas.getContext('webgl')
  gl.disable(gl.DEPTH_TEST)
  noctaves = 5; // noise octaves def5
  c = []
  for (var i = 0; i < 22; i++) {
    c[i] = random(-5, 5); // blob matrix
  }
  hyp = new p5.Shader(texShader._renderer, vert, frag) // Using live shader
  texShader.shader(hyp) // loading shader into Graphics buffer
  texShader.noStroke()
  ///
  angleMode(DEGREES) // for the floaters rotations

  getAudioContext().suspend();
  // canvas = document.getElementById("defaultCanvas0") // initializing drawcanvas
  // ctx = canvas.getContext("2d")
  //background(240);
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

  // knotspaceX = createSlider(0, 100, 0)
  // knotspaceX.position(150, 5)
  // tempBezier = new Bezier(100,25 , 10,90 , 110,100 , 150,195) //Initializing tempBezier
  print("Knotsize: 24 Bpoints")

  sound = new p5.AudioIn()
  sound.start()
  fft = new p5.FFT()
  sound.connect(fft)
  sound.amp(.05)
  fft.smooth()
  for (let i = 0; i < 8; i++) { // 8 frames of non whistling won't stop whistlingswitch
    whistlingArray.push(0)
  }
  for (let i = 0; i < 5; i++) { // making a 5 frame buffer for centroids
    centroids.push(0)
  }
  for (let i = 0; i < 2; i++) { // making a 2 frame buffer for centroids
    currCidBuffer.push(0)
  }
  amplitude = new p5.Amplitude()
  sound.connect(amplitude)
}

function draw() {

  if (getAudioContext().state !== 'running') { // If audio context is running
    background(41, 36, 36)
    textFont('ubuntu')
    textSize(width / 50)
    textAlign(CENTER)
    fill(255)
    text('🎤 Click para activar micrófono, silba para navegar', width / 2, height / 2)
    textSize(width / 25)
    fill(255,175)
    text('Cómo ver con los ojos cerrados', width / 2, height * .45)
  } else {
    hyp.setUniform("iResolution", [width, height]); //pass some values to the shader
    hyp.setUniform("iTime", millis() * .0012); // timefactor
    hyp.setUniform('iMouse', [map(spectralCentroid,600,2200,0,width),map(amplitude.getLevel(),0,.02,0,height)]); //Mapping iMouse functions to sound Hz & amp
    hyp.setUniform("noctaves", noctaves);
    hyp.setUniform("c", c);
    texShader.shader(hyp);
    texShader.box(width, height);
    imageMode(CORNER)
    image(texShader, 0, 0, width, height)
    noStroke()
    fill(30, 240) //38,33,33,250)
    rect(0, 0, width, height)


    //background(240)
    imageMode(CENTER)
    for (let i = 0; i < floaters.length; i++) { //drawing all floaters in the array
      drawFloaters(floaters[i], i * 100, i) //passing floaterimg noiseseed and index
    }
    if (drawControls) {
      for (let i = 0; i < bpointArray.length; i++) { //control Bpoints and handles
        bpointArray[i].calcMouse();
        bpointArray[i].displayBpoint();
      }
    }
    drawBezier()
    drawAttractor()

    for (let w of whistlingArray) { // Checking if there's any whistling in the buffer
      if (w > 0) {
        whistling = true
      }
    }
    whistlingArray.push(0) // cleaning Buffer
    whistlingArray.shift()
    if (whistling) {
      spectrum = fft.analyze()
      spectralCentroid = fft.getCentroid()

      fill(200)
      text(round(spectralCentroid) + ' Hz', width / 2, 100)
      centroids.push(spectralCentroid) //push Centroid to average it with previous
      centroids.shift()
      interpolatebpointArray(knotspace)
      drawKeywords(true, chooseKeywords()) // drawKeywords(whistling?)
      whistling = false // reset whistling
    } else if (looseknot) {
      interpolatetoLooseKnot(loosejson) // interpolate until the knot is loose
      drawKeywords(false, chooseBuffer) // use the last randomly chosen word
    }
  }
}

function analyzeSound() { // Activates whistling switch, function executed whenever whistling is detected by library
  // let position = map(spectralCentroid, 500, 2000, 0, windowHeight)
  // ellipse(200, position, 100, 100)
  whistlingArray.push(1) // adds 1 at the end
  whistlingArray.shift() // Removes first element and shifts
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
  stroke(201, 255, 250);
  strokeWeight(10);
  noFill()
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
  // drawCurve(tempBezier) // drawcurve function that uses ctxCanvas instead
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

function chooseKeywords() {
  let choice
  if (currC(spectralCentroid, knotspace, 0) != undefined) { //if currC is defined, choose a random between 0 and the length of currC keyword array
    choice = floor(random(keyWords[currC(spectralCentroid, knotspace, 0)].s.length)) // choose a random id between the available ids in the current Compartment keyword array
    //print(keyWords[currC(spectralCentroid, knotspace, 0)].s.length,choice)
  } else if (spectralCentroid <= minHz) {
    choice = floor(random(keyWords[0].s.length))
    print("outsiderange - low")
  } else if (spectralCentroid >= maxHz) {
    choice = floor(random(keyWords[knotsNum - 2].s.length)) // to get the desired length of keywordsJSON I link it to knots, 4 knots, 3 spaces: 0,1,2, last one is always -2 of knotnum
    print("outsiderange - high")
  }
  return choice
}

function drawFloaters(floater, seedOffset, index) { // drawing them floaters
  push()
  let floX = noise(seed1 + seedOffset);
  floX = map(floX, 0, 1, -100, width + 100);//map nise to canvas size
  let floY = noise(seed2 + seedOffset);
  floY = map(floY, 0, 1, -100, height + 100);
  seed1 += .00017; //move in noisespace
  seed2 += .00017;
  translate(floX,floY) // translate by xy noisypos
  rotate(floRots[index]) // rotate by rotationsarray
  floRots[index] += map(noise(seed1),0,1,-.4,.4) // adding a noisy ammount to rotationsarray
  image(floater, 0, 0)
  pop()
}

function drawKeywords(arewewhistling, choose) {
  // Choose randomly between set depending on currComparment and display them
  // Display also all texts where that word is found, let the user choose one
  if (choose != undefined) { // safety feature
    chooseBuffer = choose
  }
  textSize(width / 30)
  //make switch for mobile
  fill(200)
  noStroke()
  textAlign(CENTER)
  if (currC(spectralCentroid, knotspace, 0) != undefined) { //if currC is defined, draw chosen keyword, else draw the buffer keyword
    if (arewewhistling) {
      text(keyWords[currC(spectralCentroid, knotspace, 0)].s[choose], width / 2, height * .2)
    } else {
      text(keyWords[currC(spectralCentroid, knotspace, 0)].s[chooseBuffer], width / 2, height * .2)
    }
  } else if (spectralCentroid <= minHz) {
    text(keyWords[0].s[chooseBuffer], width / 2, height * .2)
  } else if (spectralCentroid >= maxHz) {
    text(keyWords[knotsNum - 2].s[chooseBuffer], width / 2, height * .2)
  }
}

function drawAttractor() { // Drawing attractors between base bpoints
  let apos1 = p5.Vector.lerp(baseArray[0].location, baseArray[1].location, .5)
  let apos2 = p5.Vector.lerp(baseArray[2].location, baseArray[3].location, .5)
  strokeWeight(5)
  stroke(200, 75)
  noFill()
  ellipse(apos1.x, apos1.y, 20)
  ellipse(apos2.x, apos2.y, 20)
  pageCenter = p5.Vector.lerp(apos1, apos2, .5)
}

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

function interpolatebpointArray(jsonArray) { //add the possibility to undulate in the static points
  //let ksX = map(knotspaceX.value(), 0, 100, 0, 1) // this is for the slider
  let ks // defines the lerp factor between active jsons
  let averageCentroid = centroids.reduce((a, b) => a + b, 0) / centroids.length // averaging array contents
  // if (averagingCentroids) { // this was for choosing between avg and raw centroids
  //ks = map(averageCentroid, minHz, maxHz, 0, 1, true) // avg
  // } else {
  //   ks = map(spectralCentroid, minHz, maxHz, 0, 1, true) // raw
  // }
  let locorigin = createVector()
  let h1origin = createVector()
  let h2origin = createVector()
  let loctarget = createVector()
  let h1target = createVector()
  let h2target = createVector()
  let json1
  let json2

  currCidBuffer.push(new currCholder(averageCentroid, jsonArray)) // maybe this is not necessary anymore, old: push new currC holder object into the buffer
  currCidBuffer.shift()

  if (spectralCentroid <= minHz + 1 || averageCentroid <= minHz + 1) { // defining jsons for out of range centroids
    json1 = jsonArray[0]
    json2 = jsonArray[1]
    ks = 0
  } else if (spectralCentroid >= maxHz - 1 || averageCentroid >= maxHz - 1) { // defining jsons for out of range centroids
    json1 = jsonArray[jsonArray.length - 2]
    json2 = jsonArray[jsonArray.length - 1]
    ks = 1
  } else if (currC(averageCentroid, jsonArray, 0) == undefined) { // when avgCentroid = exact compartment division it crashed, old: If currC is desynchronyzed and spews undefined, take data from CurrCidBuffer
    json1 = jsonArray[currCidBuffer[0].id]
    json2 = jsonArray[currCidBuffer[0].id + 1]
    ks = map(averageCentroid, currCidBuffer[0].lower, currCidBuffer[0].upper, 0, 1, true)
    print(jsonArray[currCidBuffer[0].id], "centroid undefined", "l:" + currCidBuffer[0].lower,
      "u:" + currCidBuffer[0].upper, "raw:" + spectralCentroid, "avg" + averageCentroid)
  } else {
    json1 = jsonArray[currC(averageCentroid, jsonArray, 0)] // define jsons as jsonArray with id currCompartment
    json2 = jsonArray[currC(averageCentroid, jsonArray, 0) + 1]

    // ks = map(averageCentroid, currCidBuffer[currCidBuffer.length-2].lower, // maps ks to currClower and upper limits
    //   currCidBuffer[currCidBuffer.length-2].upper, 0, 1, true)
    ks = map(averageCentroid, currC(averageCentroid, jsonArray, 1), // maps ks to currClower and upper limits
      currC(averageCentroid, jsonArray, 2), 0, 1, true)
    print(currC(averageCentroid, jsonArray, 0))
  }
  if (json1 == undefined || json2 == undefined) { // Avoid crashing with a json=undefined
    json1 = jsonArray[0]
    json2 = jsonArray[1]
    ks = .5
    print("json undefined, this should've crashed")
  }

  if (bpointArray.length == Object.keys(jsonArray[0]).length) { // if bpointArray length is enough, defines origins and targets and lerps by ks
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

      bpointArray[i].location = p5.Vector.lerp(locorigin, loctarget, ks)
      bpointArray[i].h1location = p5.Vector.lerp(h1origin, h1target, ks)
      bpointArray[i].h2location = p5.Vector.lerp(h2origin, h2target, ks)
    }
  } else { // consoleprint the number of bpoints required
    print("Saved knot - add Bpoints:" + bpointArray.length + "/" + Object.keys(jsonArray[0]).length)
  }
}

function currCholder(centroid, jsonArray) { // current Compartment holder to save on buffer
  this.id = currC(centroid, jsonArray, 0)
  this.lower = currC(centroid, jsonArray, 1)
  this.upper = currC(centroid, jsonArray, 2)
}

function currC(centroid, jsonArray, returnmode) { // current compartment, returns currC id or currC lowerrange or currC upperrange
  const kcAmm = knotspace.length - 1 // |  |  | -> 3 knots means only 2 compartments
  const range = maxHz - minHz // range of whistling
  const kcSize = range / (knotspace.length - 1) // knot compartment size
  let currentkCmin
  let currentkCmax
  if (returnmode == 0) {
    for (i = 0; i < kcAmm; i++) { // return i if centroid is in between min&maxHz values for compartment[i]
      currentkCmin = minHz + (kcSize * i)
      currentkCmax = minHz + (kcSize * (i + 1))
      if (isBetween(centroid, currentkCmin, currentkCmax, true)) { // This shit was crashing it => old: Adding +1 so that include range doesn't overlap w/ previous
        return i
      }
    }
  } else if (returnmode == 1) {
    for (i = 0; i < kcAmm; i++) { // return currentkCmin
      currentkCmin = minHz + (kcSize * i)
      currentkCmax = minHz + (kcSize * (i + 1))
      if (isBetween(centroid, currentkCmin, currentkCmax, true)) {
        return currentkCmin
      }
    }
  } else if (returnmode == 2) {
    for (i = 0; i < kcAmm; i++) { // return currentkCmax
      currentkCmin = minHz + (kcSize * i)
      currentkCmax = minHz + (kcSize * (i + 1))
      if (isBetween(centroid, currentkCmin, currentkCmax, true)) {
        return currentkCmax
      }
    }
  }
}

function isBetween(num, rangelower, rangeupper, inclusive) { // is a number between these two?
  let min = Math.min(rangelower, rangeupper)
  let max = Math.max(rangelower, rangeupper)
  return inclusive ? num >= min && num <= max : num > min && num < max
}

function interpolatetoLooseKnot(json) { // advance every frame
  let loctarget = createVector()
  let h1target = createVector()
  let h2target = createVector()

  if (bpointArray.length == Object.keys(loosejson).length) {
    for (i = 0; i < bpointArray.length; i++) {
      loctarget.x = json[i].lx + ((windowWidth / 2) - json[i].cx) + json[i].offx
      loctarget.y = json[i].ly + ((windowHeight / 2) - json[i].cy) + json[i].offy
      h1target.x = json[i].h1x + ((windowWidth / 2) - json[i].cx) + json[i].offx
      h1target.y = json[i].h1y + ((windowHeight / 2) - json[i].cy) + json[i].offy
      h2target.x = json[i].h2x + ((windowWidth / 2) - json[i].cx) + json[i].offx
      h2target.y = json[i].h2y + ((windowHeight / 2) - json[i].cy) + json[i].offy

      bpointArray[i].location = p5.Vector.lerp(bpointArray[i].location, loctarget, vel)
      bpointArray[i].h1location = p5.Vector.lerp(bpointArray[i].h1location, h1target, vel)
      bpointArray[i].h2location = p5.Vector.lerp(bpointArray[i].h2location, h2target, vel)
    }
    vel *= 1.1 // accelerate vel exponentially
    if (near(bpointArray[5].location.y,
        json[5].ly + ((windowHeight / 2) - json[5].cy) + json[5].offy,
        .05)) { // if near to looseknot by .05, reset vel
      vel = .0001
    }
  } else { // consoleprint the number of bpoints required
    print("Loose knot - add Bpoints:" + bpointArray.length + "/" + Object.keys(json).length)
  }
}

function near(num1, num2, factor) {
  return (num1 > (num2 - factor) && num1 < (num2 + factor))
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
    updatebpointArray(knotspace[0]) // immediately change location for dots to specified knot
  }
  if (keyCode === 48) { // normal 0
    averagingCentroids = !averagingCentroids // avg or raw centroid?
  }
  if (keyCode === 76) { // l
    looseknot = !looseknot // does the knot return to loose?
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

function mousePressed() { //Activate audio, Points activate with a click before being able to drag them
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
  if (!permissiongiven) {
    permissiongiven = true // variable so that this only is defined once
    userStartAudio() // p5 sound is initialized
    whistlerr.detect(() => analyzeSound()) // Whistlerr needs to recieve a function created right here
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

// function drawCurve(curve, offset) { // other drawfunction in ctx Canvas
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
// }

// Shader by Pierre MARZIN
var frag = `

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 iResolution;
uniform vec2 iMouse;
uniform float iTime;
uniform int noctaves;
uniform float c[22];
float mousefactor;

float noise( in vec2 x )
{
	return sin(1.5*x.x)*sin(1.5*x.y);
}

const mat2 rot = mat2( 0.80,  0.6, -0.6,  0.8 );
float fbm ( in vec2 _st) {
    float v = 0.0;
    float a = 0.6;
    vec2 shift = 10.0*vec2(c[11],c[12]);
    for (int i = 0; i < 12; ++i) {
		if(i>=noctaves)break;
        v += a * noise(_st);
        _st = rot*_st* 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

//manipulate b,c,s
mat4 brightnessMatrix( float brightness )
{
    return mat4( 1, 0, 0, 0,
                 0, 1, 0, 0,
                 0, 0, 1, 0,
                 brightness, brightness, brightness, 1 );
}

mat4 contrastMatrix( float contrast )
{
	float t = ( 1.0 - contrast ) / 2.0;

    return mat4( contrast, 0, 0, 0,
                 0, contrast, 0, 0,
                 0, 0, contrast, 0,
                 t, t, t, 1 );

}

mat4 saturationMatrix( float saturation )
{
    vec3 luminance = vec3( 0.3086, 0.6094, 0.0820 );

    float oneMinusSat = 1.0 - saturation;

    vec3 red = vec3( luminance.x * oneMinusSat );
    red+= vec3( saturation, 0, 0 );

    vec3 green = vec3( luminance.y * oneMinusSat );
    green += vec3( 0, saturation, 0 );

    vec3 blue = vec3( luminance.z * oneMinusSat );
    blue += vec3( 0, 0, saturation );

    return mat4( red,     0,
                 green,   0,
                 blue,    0,
                 0, 0, 0, 1 );
}

const float brightness = 0.15; //def.15
const float contrast = 1.2; //def1.2
const float saturation = 1.5; // def1.5

void main() {
		vec2 mouse=iMouse/iResolution;
    vec2 st =(-iResolution.xy+2.0*gl_FragCoord.xy)/iResolution.y;//(gl_FragCoord.xy/iResolution.xy);//
    vec3 color = vec3(0.);
    vec2 q = vec2(0.);


    q.x = fbm( st+vec2(c[0],3.*.04*iTime) ); // def.01 is angle of movement
    q.y = fbm( st+vec2(c[2],c[3]) );
    vec2 r = vec2(0.);

//play with the values here!
		r.x = fbm( st+ (3.0*mouse.x+0.4)*q+vec2(c[5],c[6]));
    r.y = fbm( st+ (6.0*mouse.y+0.5)*q*sin(.01*iTime)+vec2(c[8]*.05*iTime,c[9]));
    float f = fbm(st+c[10]*(r+length(q) ));
    color = smoothstep(vec3(0.101961,0.19608,0.666667),vec3(0.666667,0.666667,0.98039),color); //(0.101961,0.19608,0.666667),vec3(0.666667,0.666667,0.98039)

    //color = mix(color,vec3(1.856,.05*(1.0+cos(1.5+.2*iTime)),0.164706),r.y+length(q));//
    color = mix(color,vec3(1.,.05*(1.0+cos(1.5+.2*iTime)),0.164706),r.y+length(q));//

    //color = mix(color,vec3(1.5*sin(.1*iTime),0.0,cos(.13*iTime)),length(r+q))
    color = mix(color,vec3(1.5*sin(.2*iTime),0.0,1.2*cos(.25*iTime)),length(r+q));// titilation between colors//.2+.2*(1.0+cos(0.5+.3*iTime)) //

    color = mix( color, vec3(0.9,0.9,0.9), dot(r,r) ); //def .9.9.9
		color*=(.6*f*f*f*f+.6*f*f+.6*f); // mixing of channels def (1.5*f*f*f+1.8*f*f+1.7*f); like .6.8.6
		color+=.4*vec3(1.8+r.x,0.7+q); // brightness def color+=.4*vec3(1.8+r.x,0.7+q)
		color=pow(color, vec3(1.5)); // contrast def.5 like .8

    vec4 finalcolor = vec4(color,1.);
    finalcolor = brightnessMatrix( brightness ) *
        		contrastMatrix( contrast ) *
        		saturationMatrix( saturation ) *
        		finalcolor;

    gl_FragColor = vec4(color,1.);
}

`
var vert = `
//standard vertex shader
#ifdef GL_ES
      precision highp float;
    #endif
		#extension GL_OES_standard_derivatives : enable
    // attributes, in
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aTexCoord;
    attribute vec4 aVertexColor;

    // attributes, out
    varying vec3 var_vertPos;
    varying vec4 var_vertCol;
    varying vec3 var_vertNormal;
    varying vec2 var_vertTexCoord;

    // matrices
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat3 uNormalMatrix;

    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);

      // just passing things through
      var_vertPos      = aPosition;
      var_vertCol      = aVertexColor;
      var_vertNormal   = aNormal;
      var_vertTexCoord = aTexCoord;
    }
`;
