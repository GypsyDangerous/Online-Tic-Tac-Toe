let tiles;
let gameTiles = []
let gameReady = false
let socket
let turn = "x"
let myTurn
let myname
let gameOver = false
let gameId; 

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

const index = (i, j) => {
    return 3*i+j
}

// html that will be injected in the cells for the 'x' and 'o' animation
const Otext = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" /></svg>`

const Xtext = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130.2 130.2">
  <line class="path line" fill="none" stroke="#FF0000" stroke-width="6" stroke-linecap="round" stroke-miterlimit="10" x1="34.4" y1="37.9" x2="95.8" y2="92.3"/>
  <line class="path line second" fill="none" stroke="#FF0000" stroke-width="6" stroke-linecap="round" stroke-miterlimit="10" x1="95.8" y1="38" x2="34.4" y2="92.2"/>
</svg>`

// function that executes on page load
function setup(){
    // prevent p5 from adding a canvas to the window
    noCanvas();

    // these divs should be hidden until the game starts
    $(".game").hide();
    $(".chat-area").hide();

    // shorthand for all items with 'cell' class
    tiles = $(".cell")

    // connect to socket
    socket = io.connect(window.location.hostname)
    if(!socket){
        socket = io.connect(window.location.hostname+":3000")
    }

    // add a message received from the server to the chat area
    socket.on("message", msg => {
        addMsg(msg)
    })

    // set a tile with an i and j, and an 'x' or 'o' based on data from the server
    socket.on("click", data => {
        let [i, j] = data.index
        move(tiles[index(j, i)], data.player)
        turn = data.player === "x" ? "o" : "x";
    }) 

    // set the local gameId from the id received from the server
    socket.on("createdGame", id => gameId = id)


    // reset the game if the other person leaves the game
    socket.on("leftGame", reset)

    // alert the user to an error if the server sends one
    socket.on("err", data => {
        if(data.error === "not found"){
            // a game wasn't found so rehide these things
            $(".input").show()
            $(".game").hide();
        }
        setTimeout(() => {
            alert(data.msg)
        }, 150);
    })

    // send the server which player you are when asked
    socket.on("getPlayer", () => {
        socket.emit("getPlayer", myTurn)
    })

    // set my player based on data from the server
    socket.on("setPlayer", player => {
        myTurn = player
        $(".myturn").html(myname + ", You Are "+player.toUpperCase())
    })

    // try to reset the game if the server tells you to
    socket.on("reset", () => {
        reset(false)
    })
}

// get the i and j position of a tile
function getIndex(tile){
    let i = Number($(tile).css("grid-column")[0])-1
    let j = Number($(tile).css("grid-row")[0])-1
    return [i, j]
}

function reset(clicked = true){
    // only reset when game is over
    if(gameOver){
        for (let t of tiles){
            t = $(t)
            // clear the values and innerhtml for all the cells
            t.val("")
            t.html("")
        }
        // clear the winner and set it to x's turn cause x goes first
        $(".winner").html("Winner: ")
        $(".turn").html("X's Turn")
        turn = "x"
        gameOver = false
        // if the button on the webpage was clicked, send a message for others to reset, if I received a message to reset then don't
        if(clicked) {
            socket.emit("reset")
        }
    }
}

// get all the values from the cells to be used the in the winner function
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
    return values.filter((v) => v === "").length === 0? "tie": undefined
}


function move(tile, player){
    if ($(tile).html() === "") {
        $(tile).html(player === "o" ? Otext : Xtext)
        $(tile).val(player)
        player = player === "x" ? "o" : "x"
        $(".turn").html(player.toUpperCase()+"'s Turn")
    }
    if (winner()) {
        $(".winner").html("Winner: " + winner().toUpperCase())
        gameOver = true
    }
}

// when a cell div is clicked figure out if it already has a move there and if not send a message telling all sockets to set a move there
$('.cell').click(function () {
    if ($(this).html() === "" && turn === myTurn && !gameOver) {
        let index = getIndex(this)
        let player = turn
        console.log("clicked")
        socket.emit("click", {index, player})
    }
});

// prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


$(".create-button").click(function () {
    let name = $("#create-name").val()
    name = escapeHtml(name)
    if(name){
        socket.emit("createGame", {name})
        $(".input").hide()
        $(".game").show();
        $(".chat-area").show();
        select("#game").removeClass("expand")
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
    name = escapeHtml(name)
    id = escapeHtml(id)
    if(name && id){
        let data = {name, id}
        socket.emit("JoinGame", data)
        $(".input").hide()
        $(".game").show();
        $(".chat-area").show();
        select("#game").removeClass("expand")
        myTurn = "o"
        myname = name
        $(".myturn").html(name+", You Are O")
        setTimeout(() => {
            $(".id").html("Game ID: " + id)
        }, 300);
    }
})

// add a message the chat area div
function addMsg(msg){
    createDiv(escapeHtml(msg)).addClass("message").parent("messages")
}

// toggle hiding and showing the extra game info that is currently only the game id
$(".info-button").click(function () {
    $(".inner-info").toggleClass("show")
})

// send a message if there is one to send when the 'send' button is pressed
$(".send").click(() => {
    let msg = $(".msg-input").val()
    if(msg){
        addMsg(msg)
        $(".msg-input").val("")
        socket.emit("message", capitalize(myname) + ": " + msg)
    }
})

// link the enter key to sending a message
$(document).keyup(function (event) {
    if (event.keyCode === 13) {
        $(".send").click();
    }
});
