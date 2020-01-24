const express = require("express")
const socket = require("socket.io")

const app = express()
app.use(express.static("sketch"))

Port = process.env.PORT || 3000

const server = app.listen(Port, () => console.log("Server running on port: "+Port))

// misc functions for generating a random string and for capitalizing the first letter of a work
const randomString = (n) => {
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


const gameFromId = (id) => {
    return games.find(g => g.id == id)
}


const games = []
const io = socket(server);

io.sockets.on("connection", (socket) => {

    //game this socket is in
    let Game;

    // shorthand for this sockets id
    const id = socket.id;

    // name of user who will connect to this socket
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
            Game.add(socket, data.name)
            Game.emit(socket, "getPlayer",)
            Game.emit(socket, "message", capitalize(data.name) + " Joined the game")
            name = data.name
        }else{
            socket.emit("err", {error: "not found", msg: "There is no open game available width id: " + data.id})
        }
    })

    // send a message to clients in the game to reset
    socket.on("reset", () => {
        Game.emit(socket, "reset")
    })

    // send a message to the other client in the game with a chat message
    socket.on("message", msg => {
        Game.emit(socket, "message", msg, false)
    })

    socket.on("disconnect", () => {
        /* remove the player from the game,
           delete the game if it is empty 
           and if not send messages to the other client to reset and add a message announcing the player leaveing */
        if (Game){
            Game.players.pop(Game.players.indexOf(id));
            if (Game.players.length === 0){
                games.pop(games.indexOf(Game))
            }else{
                Game.emit(Game.sockets[0], "leftGame")
                Game.emit(Game.sockets[0], "message", capitalize(name)+ " left the game")
            }
        }
    })
})
