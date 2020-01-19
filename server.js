const express = require("express")
const socket = require("socket.io")
const app = express()

Port = process.env.PORT || 3000

const server = app.listen(Port)

console.log("Server Running on Port " + Port)

const max = Math.max
const int = Math.floor

function randomString(n) {
    return [...Array(n)].map(i => (~~(Math.random() * 36)).toString(36)).join('')
}

class game{
    constructor(){
        this.id = randomString(15)
        this.players = []
        this.turn = "o"
    }

    isFull(){
        return this.players.length >= 2
    }

    add(socket){
        if(!this.isFull()){
            this.players.push(socket.id)
            socket.join(this.id)
        }
    }

    emit(socket, title, data, same=true){
        socket.broadcast.to(this.id).emit(title, data)
        if(same){
            socket.emit(title, data)
        }
    }
}

let games = []

const gameFromPlayerID = (id) => {
    return games.find(g => g.players.includes(id))
}

const gameFromId = (id) => {
    return games.find(g => g.id == id)
}

app.use(express.static("sketch"))

const io = socket(server);

let connectCounter = 0
io.sockets.on("connection", (socket) => {
    let Game;
    const id = socket.id;

    socket.on("click", (data) => {
        let {index, player} = data;
        Game.emit(socket, "click", {index, player})
    })

    socket.on("createGame", data => {
        Game = new game()
        Game.add(socket)
        games.push(Game)
        socket.emit("createdGame", Game.id)
    });

    socket.on("getPlayer", player => {
        socket.broadcast.to(Game.id).emit("setPlayer", player == "x" ? "o" : "x")
    })

    socket.on("JoinGame", data => {
        Game = gameFromId(data.id)
        if (Game && !Game.isFull()){
            Game.add(socket)
            socket.broadcast.to(Game.id).emit("getPlayer", {})
        }else{
            socket.emit("err", {error: "not found", msg: "There is no open game available width id: " + data.id})
        }
    })

    socket.on("reset", () => {
        Game.emit(socket, "reset")
    })

    socket.on("disconnect", () => {
        let g = gameFromPlayerID(id);
        if(g){
            g.players.pop(g.players.indexOf(id));
            if(g.players.length == 0){
                games.pop(games.indexOf(g))
            }
        }
    })
})
