const w = 700
const h = 700
let activeBpoint
let activeBezier
let prevactiveBezier
let bpointArray = []
let baseArray = []
let drawControls = true
//let bpointAmmount = 4

function setup() {
  createCanvas(windowWidth, windowHeight - 4);
  background(240);
  noStroke();
  // for (let i = 0; i < bpointAmmount; i++) { /// Initializing Bpoints
  //   let rpos = createVector(50 + (i * ((width - 50) / bpointAmmount)), height / 2) // In a line
  //   let h1 = createVector(rpos.x - 20, rpos.y - 20)
  //   let h2 = createVector(rpos.x + 20, rpos.y + 20)
  //   bpointArray.push(new Bpoint(rpos, h1, h2, false))
  // }
  let cw = (width / 2)
  let ch = (height / 2)
  bpointArray.push(new Bpoint(true,createVector(cw - 200, ch - 50), createVector(cw - 125, ch - 50), createVector(cw - 275, ch - 50), 0))
  bpointArray.push(new Bpoint(true,createVector(cw - 200, ch + 50), createVector(cw - 275, ch + 50), createVector(cw - 125, ch + 50), 1))
  bpointArray.push(new Bpoint(true,createVector(cw + 200, ch + 50), createVector(cw + 125, ch + 50), createVector(cw + 275, ch + 50), 2))
  bpointArray.push(new Bpoint(true,createVector(cw + 200, ch - 50), createVector(cw + 275, ch - 50), createVector(cw + 125, ch - 50), 3))

}

function draw() {
  background(240)
  if (drawControls = true){
  for (let i = 0; i < bpointArray.length; i++) { //control Bpoints and handles
    bpointArray[i].calcMouse();
    bpointArray[i].displayBpoint();
  }
}
  drawBezier()
  drawAttractor()
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
      this.h1location.add((mouseX-pmouseX)*offset,(mouseY-pmouseY)*offset) //adding mousechange to handle vectors
      this.h2location.add((mouseX-pmouseX)*offset,(mouseY-pmouseY)*offset)

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
  stroke(30);
  strokeWeight(8);
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
}

function drawAttractor() { // Drawing attractors between base bpoints
  for (let i = 0; i < bpointArray.length; i++) { //checking for base bpoints
    if (bpointArray[i].isBase) {
      baseArray.push(bpointArray[i])
    }
  }
  let apos1 = p5.Vector.lerp(baseArray[0].location, baseArray[1].location, .5)
  let apos2 = p5.Vector.lerp(baseArray[2].location, baseArray[3].location, .5)
  strokeWeight(5)
  stroke(200)
  fill(240)
  ellipse(apos1.x, apos1.y, 20)
  ellipse(apos2.x, apos2.y, 20)
}

function createBpoint() {
  if ((activeBezier && prevactiveBezier != undefined)) {
    // if (activeBezier.index == 0){
    //   let r = p5.Vector.lerp(activeBezier.location,prevactiveBezier.location,0.5)
    //   let h1 = p5.Vector.lerp(r,prevactiveBezier.location,.2)
    //   let h2 = p5.Vector.lerp(r,activeBezier.location,.2)
    //   bpointArray.splice(prevactiveBezier.index+1,0,new Bpoint(r, h1, h2, false,activeBezier.index))
    // }
    if ((activeBezier.index < prevactiveBezier.index) && (activeBezier.index !== 0)) {
      [activeBezier, prevactiveBezier] = [prevactiveBezier, activeBezier] // switches activeBeziers
    }
      let r = p5.Vector.lerp(activeBezier.location, prevactiveBezier.location, 0.5)
      let h1 = p5.Vector.lerp(r, prevactiveBezier.location, .2)
      let h2 = p5.Vector.lerp(r, activeBezier.location, .2)
      if ((activeBezier.index && prevactiveBezier.index) !== 0) {
        bpointArray.splice(prevactiveBezier.index + 1, 0, new Bpoint(false, r, h1, h2, activeBezier.index)) //creates newBpoint in the path between active and preactvie Beiers
      } else {
        bpointArray.push(new Bpoint(false, r, h1, h2, bpointArray.length))
      }
  }
  for (let i = 0; i < bpointArray.length; i++) { //updatinng indexes
    bpointArray[i].index = i
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
    drawControls = true
  }
  if (keyCode === 67) { //c
    activeBezier.isAsymmetrical = !activeBezier.isAsymmetrical
  }
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
