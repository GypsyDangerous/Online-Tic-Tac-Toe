let socket
let a
let cols = 50;
let w;
let dots = [
  []
];
let lines = [];
let selected_dot;
let transVec, scalar;
let players = [];
let playerIndex = 0;
let boxes = []
let playerP;

const randomColor = () => {
  let x = random(255)
  let y = random(255)
  let z = random(255)
  return color(x, y, z)
}

function setup() {
  createCanvas(400, 400);
  players = ["red", color(0, 0, 255)]
  background(51);
  socket = io.connect("http://localhost:3000")
  console.log(socket);
  playerP = createP();

  socket.on("mouse", newDrawing)
  socket.on("reset", (data) => {
    data = { 
      lines: lines.map(l => l.toData()), 
      boxes: boxes.map(b => b.toData()), 
      player: playerIndex
    }
    socket.emit("send", data)
  })

  socket.on("receive", (data) => {
    lines = (data.lines.map(l => Line.from(l)))
    boxes = data.boxes.map(l => Box.from(l))
    playerIndex = data.player
  })

  socket.emit("reset", {})

  w = width / cols;
  for (let i = 0; i < cols; i++) {
    dots.push([])
    for (let j = 0; j < cols; j++) {
      dots[i].push(createVector(i * w + 5 + w / 3, j * w + 5 + w / 3));
    }
  }
  transVec = createVector(0, 0)
  scalar = 1
}

function getClosestDot(x, y) {
  let p = createVector(x, y);
  let closest, minD = Infinity;
  for (let row of dots) {
    for (let dot of row) {
      let d = p.dist(dot);
      if (d < minD) {
        minD = d
        closest = dot.copy()
      }
    }
  }
  return closest
}

function newDrawing(data) {
  noStroke();
  lines.push(Line.from(data))
  addBox()
}

function keyPressed(){
  if(keyCode == 27){
    selected_dot = null
  }
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight)
}

function draw() {
  playerP.html(players[playerIndex])
  background(220);
  translate(transVec.x, transVec.y);
  scale(scalar);
  stroke(0);
  strokeWeight(min(5 / scalar, 5));

  for (let b of boxes) {
    b.show();
  }

  let mouse = transMouse()
  if (selected_dot != undefined && selected_dot != null) {
    line(selected_dot.x, selected_dot.y, mouse.x, mouse.y);
  }
  for (let row of dots) {
    for (let dot of row) {
      noStroke();
      fill(0)
      circle(dot.x, dot.y, min(5 / scalar, 5));
    }
  }
  for (let {
    a,
    b,
    color
  } of lines) {
    stroke(0);
    strokeWeight(min(5 / scalar, 5))
    line(a.x, a.y, b.x, b.y);
  }
  if (keyIsDown(UP_ARROW)) {
    scalar -= .01
  } else if (keyIsDown(DOWN_ARROW)) {
    scalar += .01
  }
}

function transMouse() {
  let mouse = createVector(mouseX, mouseY);
  return p5.Vector.div(p5.Vector.sub(mouse, transVec), scalar);
}

function mouseDragged() {
  if (keyIsDown(16)) {
    let mouse = createVector(mouseX, mouseY);
    let pmouse = createVector(pmouseX, pmouseY);
    transVec.add(p5.Vector.sub(mouse, pmouse));
  }
}

function getLine(dot) {
  for (let lines of line) {
    if (line.a == dot) return line
  }
}

function checkBox(i, j) {
  let a = dots[i][j];
  let c = dots[i + 1][j + 1];
  let b = dots[i][j + 1];
  let d = dots[i + 1][j];
  let checks = [
    [a, b],
    [b, c],
    [c, d],
    [d, a]
  ]
  let isBox = true
  for (let i = 0; i < 4; i++) {
    let connected = false
    let [first, second] = checks[i]
    for (let l of lines) {
      if (l.connects(first, second)) {
        connected = true
      }
    }
    if (!connected) {
      isBox = false
      break;
    }
  }
  if (isBox) {
    let box = new Box(a.x, a.y, players[playerIndex]);
    if (!boxIn(box)) {
      boxes.push(box);
      return true
    }
  }
}

function boxIn(b) {
  let In = false
  for (let box of boxes) {
    if (box.equals(b)) {
      In = true
    }
  }
  return In
}

function vec(vec){
  return {x: vec.x, y: vec.y}
}

function mousePressed() {
  if (!keyIsDown(16)) {
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
      let mouse = transMouse()
      if (!selected_dot) {
        selected_dot = getClosestDot(mouse.x, mouse.y);
      } else {
        let b = getClosestDot(mouse.x, mouse.y);
        if (selected_dot.dist(b) <= w * 1.25 && selected_dot.dist(b) > 0) {
          let data = {x: vec(selected_dot), y: vec(b)}
          socket.emit("mouse", data)
          lines.push(Line.from(data));
          selected_dot = null;
          addBox();
        }
      }
    }
  }
}

function addBox(){
  let newBox = false
  for (let i = 0; i < cols - 1; i++) {
    for (let j = 0; j < cols - 1; j++) {
      let box = checkBox(i, j)
      if (box) newBox = true
    }
  }
  if (!newBox) {
    playerIndex = (playerIndex + 1) % (players.length)
    // print(players[playerIndex])
  }
}

window.addEventListener("keydown", function (e) {
  // space and arrow keys
  if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
    e.preventDefault();
  }
}, false);






class Line {
  constructor(a, b, color) {
    this.a = a;
    this.b = b;
  }

  connects(a, b) {
    return (this.a.dist(a) == 0 && this.b.dist(b) == 0) || (this.a.dist(b) == 0 && this.b.dist(a) == 0);
  }

  show(){
    line(this.a.x, this.a.y, this.b.x, this.b.y)
  }

  toData() {
    return { x: vec(this.a), y: vec(this.b) }
  }

  static from(data){
    const temp = new Line()
    temp.a = toVec(data.x)
    temp.b = toVec(data.y)
    return temp
  }
}

function toVec(data) {
  return createVector(data.x, data.y)
}

class dot {
  constructor(pos, i, j) {
    this.pos = pos;
    this.i = i;
    this.j = j;
  }

  show() {
    noStroke();
    fill(0);
    circle(this.pos.x, this.pos.y, 5);
  }

  static from(data){
    const temp = new dot()
    temp.pos = data.pos
    temp.i = data.i
    temp.j = data.j
    return data
  }
}

class Box {
  constructor(x, y, col) {
    this.Pos = {x, y};
    this.color = color(col)
  }

  get pos(){
    return createVector(this.Pos.x, this.Pos.y)
  }

  toData(){
    return { Pos: this.Pos, color: colToData(this.color)}
  }

  equals(other) {
    return this.pos.dist(other.pos) == 0
  }

  show() {
    fill(this.color)
    rect(this.pos.x, this.pos.y, w, w);
  }

  static from(data){
    const temp = new Box(0, 0, "red")
    temp.Pos = data.Pos
    temp.color = toColor(data.color)
    return temp
  }
}

function colToData(col){
  let levels = col.levels.slice(0, 3)
  return {x:levels[0], y:levels[1], z:levels[2]}
}

function toColor(col){
  return color(col.x, col.y, col.z)
}