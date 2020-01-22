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

const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

class game{
    constructor(){
        this.id = randomString(15)
        this.players = []
        this.sockets = []
        this.names = {}
        this.turn = "o"
    }

    isFull(){
        return this.players.length >= 2
    }

    add(socket, name){
        if(!this.isFull()){
            this.players.push(socket.id)
            this.sockets.push(socket)
            this.names[socket.id] = name
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

io.sockets.on("connection", (socket) => {
    let Game;
    const id = socket.id;
    let name;

    socket.on("click", (data) => {
        if(Game.isFull()){
            Game.emit(socket, "click", data)
        }
    })

    socket.on("createGame", data => {
        Game = new game()
        Game.add(socket, data.name)
        name = data.name
        games.push(Game)
        socket.emit("createdGame", Game.id)
        Game.emit(socket, "message", capitalize(data.name) + " Created the game")
    });

    socket.on("getPlayer", player => {
        socket.broadcast.to(Game.id).emit("setPlayer", player == "x" ? "o" : "x")
    })

    socket.on("JoinGame", data => {
        Game = gameFromId(data.id)
        if (Game && !Game.isFull()){
            Game.add(socket)
            socket.broadcast.to(Game.id).emit("getPlayer", {})
            Game.emit(socket, "message", capitalize(data.name) + " Joined the game")
            name = data.name
        }else{
            socket.emit("err", {error: "not found", msg: "There is no open game available width id: " + data.id})
        }
    })

    socket.on("reset", () => {
        Game.emit(socket, "reset")
    })

    socket.on("message", msg => {
        Game.emit(socket, "message", msg, false)
    })

    socket.on("disconnect", () => {
        let g = Game;
        if(g){
            g.players.pop(g.players.indexOf(id));
            if(g.players.length == 0){
                games.pop(games.indexOf(g))
            }else{
                g.emit(g.sockets[0], "leftGame")
                g.emit(g.sockets[0], "message", capitalize(name)+ " left the game")
            }
        }
    })
})
