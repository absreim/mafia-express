const http = require("http")
const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const expressSession = require("express-session")
const pgPromise = require("pg-promise")()
const pgSession = require("connect-pg-simple")(session)
const sharedSession = require("express-socket.io-session")
const socketIo = require("socket.io")

const Shared = require("./shared.js")
const Authentication = require("./authentication.js")
const GameController =  require("./game-controller.js")


const app = express()

const connection = {
    host: "localhost",
    port: "5432",
    database: "mafia_express",
    user: "mafia_server",
    password: "password"
}
const db = pgPromise(connection)
const sessionStore = new pgSession({pgPromise: db})
const auth = new Authentication(db)

const corsOptions = {
    origin: "http://localhost:3000",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
}

app.use(cors(corsOptions))

const session = expressSession({
    secret: "secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {domain: "localhost"}
 })

app.use(session)

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.post("/login", function(req, res){
    if(req.session){
        if(req.session.userId){
            res.status(401).send({outcome: Shared.LoginOutcome.LOGGEDIN})
        }
        else{
            if(req.body.username && req.body.password){
                auth.authenticate(req.body.username, req.body.password, function(err, data){
                    if(err){
                        res.status(500).send({outcome: Shared.LoginOutcome.INTERNALERROR})
                    }
                    if(data){
                        req.session.userId = req.body.username
                        res.status(200).send({outcome: Shared.LoginOutcome.SUCCESS})
                    }
                    else{
                        res.status(404).send({outcome: Shared.LoginOutcome.WRONGCREDENTIALS})
                    }
                })
            }
            else{
                res.status(400).send({outcome: Shared.LoginOutcome.MISSINGINFO})
            }
        }
    }
    else{
        res.status(500).send({outcome: Shared.LoginOutcome.INTERNALERROR})
    }
})

app.get("/logout", function(req, res){
    if(req.session){
        if(req.session.userId){
            req.session.destroy(function(err){
                if(err){
                    res.status(500).send({outcome: Shared.LogoutOutcome.INTERNALERROR})
                }
                else{
                    res.status(200).send({outcome: Shared.LogoutOutcome.SUCCESS})
                }
            })
        }
        else{
            res.status(403).send({outcome: Shared.LogoutOutcome.NOTLOGGEDIN})
        }
    }
    else{
        res.status(500).send({outcome: Shared.LogoutOutcome.INTERNALERROR})
    }
})

app.post("/signup", function(req, res){
    if(req.body.username && req.body.password){
        auth.userExists(req.body.username, function(err, result){
            if(err){
                res.status(500).send({outcome: Shared.AccountCreateOutcome.INTERNALERROR})
            }
            else{
                if(result){
                    res.status(401).send({outcome: Shared.AccountCreateOutcome.EXISTS})
                }
                else{
                    auth.createUser(req.body.username, req.body.password, function(err){
                        if(err){
                            res.status(500).send({outcome: Shared.AccountCreateOutcome.INTERNALERROR})
                        }
                        else{
                            res.status(200).send({outcome: Shared.AccountCreateOutcome.SUCCESS})
                        }
                    })
                }
            }
        })
    }
    else{
        res.status(400).send({outcome: Shared.AccountCreateOutcome.MISSINGINFO})
    }
})

app.post("/deleteAccount", function(req,res){
    if(req.session){
        if(req.session.userId){
            if(req.body.password){
                auth.authenticate(req.session.userId, req.body.password, function(err, result){
                    if(err){
                        console.log("Error encountered when attempting authentication for account deletion: " + err)
                        res.status(500).send({outcome: Shared.AccountDeleteOutcome.INTERNALERROR})
                    }
                    else{
                        if(result){
                            auth.deleteUser(req.session.userId, function(err){
                                if(err){
                                    console.log("Error encountered when attempting account deletion: " + err)
                                    res.status(500).send({outcome: Shared.AccountDeleteOutcome.INTERNALERROR})
                                }
                                else{
                                    req.session.destroy(function(err){
                                        if(err){
                                            console.log("Error destroying session after deleting account: " + err)
                                        }
                                        res.status(200).send({outcome: Shared.AccountDeleteOutcome.SUCCESS})
                                    })
                                }
                            })
                        }
                        else{
                            res.status(404).send({outcome: Shared.AccountDeleteOutcome.WRONGPASSWORD})
                        }
                    }
                })
            }
            else{
                res.status(400).send({outcome: Shared.AccountDeleteOutcome.MISSINGINFO})
            }
        }
        else{
            res.status(403).send({outcome: Shared.AccountDeleteOutcome.NOTLOGGEDIN})
        }
    }
    else{
        res.status(500).send({outcome: Shared.AccountDeleteOutcome.INTERNALERROR})
    }
})

app.post("/changePassword", function(req,res){
    if(req.session){
        if(req.session.userId){
            if(req.body.oldPassword && req.body.newPassword){
                auth.authenticate(req.session.userId, req.body.oldPassword, function(err, result){
                    if(err){
                        console.log("Error encountered when attempting authentication for password change: " + err)
                        res.status(500).send({outcome: Shared.ChangePasswordOutcome.INTERNALERROR})
                    }
                    else{
                        if(result){
                            auth.changePassword(req.session.userId, req.body.newPassword, function(err){
                                if(err){
                                    console.log("Error encountered when attempting password change: " + err)
                                    res.status(500).send({outcome: Shared.ChangePasswordOutcome.INTERNALERROR})
                                }
                                else{
                                    res.status(200).send({outcome: Shared.ChangePasswordOutcome.SUCCESS})
                                }
                            })
                        }
                        else{
                            res.status(404).send({outcome: Shared.ChangePasswordOutcome.WRONGPASSWORD})
                        }
                    }
                })
            }
            else{
                res.status(400).send({outcome: Shared.ChangePasswordOutcome.MISSINGINFO})
            }
        }
        else{
            res.status(403).send({outcome: Shared.ChangePasswordOutcome.NOTLOGGEDIN})
        }
    }
    else{
        res.status(500).send({outcome: Shared.ChangePasswordOutcome.INTERNALERROR})
    }
})

app.get("/loginstatus", function(req, res){
    if(req.session){
        if(req.session.userId){
            res.status(200).send({
                loginStatus: Shared.LoginStatus.LOGGEDIN,
                username: req.session.userId
            })
        }
        else{
            res.status(200).send({
                loginStatus: Shared.LoginStatus.LOGGEDOUT,
                username: null
            })
        }
    }
    else{
        res.status(200).send({
            loginStatus: Shared.LoginStatus.ERROR,
            username: null
        })
    }
})

const server = http.Server(app)
const io = socketIo(server)

io.origins(["localhost:3000"])
io.use(sharedSession(session))

const startedGames = {} // games that have started
const lobbyGames = {} // games in lobby that have not started
const userToGameMap = {}
const userToSocketMap = {}

function processGameControllerResponses(responses){
    if(responses){
        for(let response of responses){
            for(let recipient of response.recipients){
                let recipientSocket = userToSocketMap[recipient]
                if(recipientSocket){
                    recipientSocket.emit(Shared.SocketIOEvents.GAMEACTION, response.payload)
                }
                else{
                    console.log(`Warning: tried to send game action message to user "${recipient}", but that user does not have an associated socket.`)
                }
            }
        }
    }
}

function gameStartCallback(name){
    if(name in lobbyGames){
        startedGames[name] = lobbyGames[name]
        delete lobbyGames[name]
    }
    else{
        console.log("Warning: game start callback received from game that doesn't exist in the lobby.")
    }
}

function gameEndCallback(name, players){
    if(name in startedGames){
        delete startedGames[name]
        for(let player of players){
            if(player in userToGameMap){
                delete userToGameMap[player]
            }
            else{
                console.log("Warning: in game end callback, tried to delete player from user to game mapping, but user did not exist in the mapping.")
            }
        }
    }
    else{
        console.log("Warning: game end callback received from game that doesn't exist in the started games list.")
    }
}

io.on("connection", function(socket){
    const username = socket.handshake.session.userId
    if(username){
        userToSocketMap[username] = socket
        socket.on("disconnect", function(){
            delete userToSocketMap[username]
        })
        socket.on(Shared.ClientSocketEvent.GAMEACTION, function(data){
            const usersGame = userToGameMap[username]
            if(usersGame){
                processGameControllerResponses(usersGame.handleMessage(data, username))
            }
            else{
                socket.emit(Shared.ServerSocketEvent.SYSTEMNOTICE, "Received game action message, but you do not appear to be in a game.")
                console.log("Warning: game action message received from user not in a game.")
            }
        })
        socket.on(Shared.ClientSocketEvent.STATUSREQUEST, function(){
            if(userToGameMap[username]){
                socket.emit({game: userToGameMap[username]})
            }
            else{
                socket.emit({game: null})
            }
        })
        socket.on(Shared.ClientSocketEvent.LOBBYSTATEREQUEST, function(){
            socket.emit(Shared.ServerSocketEvent.LOBBYSTATE, lobbyGames)
        })
        socket.on(Shared.ClientSocketEvent.CREATEGAME, function(data){
            if(data && data.name && data.numPlayers && data.numWerewolves){
                if(data.name in lobbyGames || data.name in startedGames){
                    socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, Shared.CreateGameOutcome.NAMEEXISTS)
                }
                else if(data.numPlayers < 4){
                    socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, Shared.CreateGameOutcome.NOTENOUGHPLAYERS)
                }
                else if(data.numPlayers - data.numWerewolves < 2){
                    socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, Shared.CreateGameOutcome.TOOMANYWEREWOLVES)
                }
                else{
                    try{
                        lobbyGames[data.name] = new GameController(data.numPlayers, data.numWerewolves, () => gameStartCallback(data.name), (players) => gameEndCallback(data.name, players))
                    }
                    catch(error){
                        socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, Shared.CREATEGAMEOUTCOME.INTERNALERROR)
                        console.error("Error occurred while creating GameController instance: " + error)
                    }
                    try{
                        let responses = lobbyGames[data.name].joinPlayer(username)
                        processGameControllerResponses(responses)
                    }
                    catch(error){
                        socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, Shared.CREATEGAMEOUTCOME.INTERNALERROR)
                        console.error("Error occurred while joining a player to a game that was just created for that player: " + error)
                    }
                }
            }
            else{
                socket.emit(Shared.ServerSocketEvent.CREATEGAMEOUTCOME, Shared.CreateGameOutcome.MISSINGINFO)
            }
        })
    }
    else{
        socket.emit(Shared.ServerSocketEvent.SYSTEMNOTICE, "Unable to determine your user account. Disconnecting.")
        socket.disconnect(true)
        console.log("Warning: user connected without session information.")
    }
})

server.listen(3001, () => console.log('Mafia server listening on port 3001!'))