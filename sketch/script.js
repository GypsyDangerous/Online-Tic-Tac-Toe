$(document).ready(setup)

let tiles;
let gameTiles = []
let gameReady = false
let socket
let turn = "x"
let myTurn
let myname
let gameOver = false
let gameId;

const Otext = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" /></svg>`

let Xtext = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130.2 130.2">
  <line class="path line" fill="none" stroke="#D06079" stroke-width="6" stroke-linecap="round" stroke-miterlimit="10" x1="34.4" y1="37.9" x2="95.8" y2="92.3"/>
  <line class="path line second" fill="none" stroke="#D06079" stroke-width="6" stroke-linecap="round" stroke-miterlimit="10" x1="95.8" y1="38" x2="34.4" y2="92.2"/>
</svg>`


function setup(){
    $(".game").hide();
    tiles = $(".cell")
    socket = io.connect("http://localhost:3000")

    socket.on("click", data => {
        let [i, j] = data.index
        set(tiles[index(j, i)], data.player)
        turn = data.player == "x" ? "o" : "x";
    }) 

    socket.on("createdGame", id => gameId = id)

    socket.on("err", data => {
        if(data.error == "not found"){
            $(".input").show()
            $(".game").hide();
            myTurn = null
            $(".myturn").html("")
        }
        setTimeout(() => {
            alert(data.msg)
        }, 150);
    })

    socket.on("getPlayer", () => {
        socket.emit("getPlayer", myTurn)
    })

    socket.on("setPlayer", player => {
        myTurn = player
        $(".myturn").html(myname + ", You Are "+player.toUpperCase())
    })

    socket.on("redirect", url => window.location.replace(url))

    socket.on("reset", () => {
        reset(false)
    })

    socket.open()
}

function getIndex(tile){
    let i = Number($(tile).css("grid-column")[0])-1
    let j = Number($(tile).css("grid-row")[0])-1
    return [i, j]
}

function reset(clicked = true){
    for (let t of tiles){
        t = $(t)
        t.val("")
        t.html("")
    }
    $(".winner").html("Winner: ")
    $(".turn").html("X's Turn")
    turn = "x"
    gameOver = false
    if(clicked) {
        socket.emit("reset")
    }
}

function getvals(){
    let r = []
    for(let t of tiles){
        r.push($(t).val())
    }
    return r
}

function winner(){
    let board = values = getvals()

    let first = values[0]
    let diagonal = first != ""
    for(let i = 0; i < 3; i++){
        if(values[index(i, i)] != first){
            diagonal = false
            break
        }
    }

    if(diagonal)return first

    first = board[index(0, 2)]
    let back_diag = first != ""
    for (let i = 1; i < 4; i++) {
        if (board[index(i - 1, 3 - i)] != first) {
            back_diag = false
            break
        }
    }
    if(back_diag) return first

    for (let i = 0; i < 3; i++) {
        first = board[index(i, 0)]
        let sideways = first != ""
        for (let j = 0; j < 3; j++) {
            if(board[index(i, j)] != first){
                sideways = false
                break
            }
        }
        if(sideways) return first
    }

    for (let i = 0; i < 3; i++) {
        first = board[index(0, i)]
        let sideways = first != ""
        for (let j = 0; j < 3; j++) {
            if (board[index(j, i)] != first) {
                sideways = false
                break
            }
        }
        if (sideways) return first
    }
    return values.filter((v) => v == "").length == 0? "tie": undefined
}

function index(i, j){
    return 3*i+j
}

function set(tile, player){
    if ($(tile).html() == "") {
        $(tile).html(player == "o" ? Otext : Xtext)
        $(tile).val(player)
        player = player == "x" ? "o" : "x"
        $(".turn").html(player.toUpperCase()+"'s Turn")
    }
    if (winner()) {
        $(".winner").html("Winner: " + winner())
        gameOver = true
    }
}

$('.cell').click(function () {
    if ($(this).html() == "" && turn == myTurn && !gameOver) {
        let index = getIndex(this)
        let player = turn
        console.log("clicked")
        socket.emit("click", {index, player})
    }
});

$(".create-button").click(function () {
    let name = $("#create-name").val()
    if(name){
        data = {
            name: name
        }
        socket.emit("createGame", data)
        $(".input").hide()
        $(".game").show();
        myTurn = "x"
        myname = name
        $(".myturn").html(name+", You Are X")
        setTimeout(() => {
            $(".id").html("Game ID: "+gameId)
        }, 300);
    }
})

$(".join-button").click(function () {
    let name = $("#join-name").val()
    let id = $("#game-id").val()
    if(name && id){
        let data = {name, id}
        socket.emit("JoinGame", data)
        $(".input").hide()
        $(".game").show();
        myTurn = "o"
        myname = name
        $(".myturn").html(name+", You Are O")
        setTimeout(() => {
            $(".id").html("Game ID: " + id)
        }, 300);
    }
})



$(".info-button").click(function () {
    $(".inner-info").toggleClass("show")
})