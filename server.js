const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const session = require("express-session")
const pgp = require("pg-promise")()
const pgSession = require("connect-pg-simple")(session)
const Authentication = require("./authentication.js")
const Shared = require("./shared.js")

const connection = {
    host: "localhost",
    port: "5432",
    database: "mafia_first_pass",
    user: "mafia_server",
    password: "password"
}
const db = pgp(connection)
const sessionStore = new pgSession({pgPromise: db})
const auth = new Authentication(db)

app.use(session({
   secret: "secret",
   store: sessionStore,
   resave: false,
   saveUninitialized: false
}))

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.post("/login", function(req, res){
    if(req.session){
        res.status(401).send("Already logged in. Please log out first.")
    }
    else if(req.body.username && req.body.password){
        auth.authenticate(req.body.username, req.body.password, function(err, data){
            if(err){
                res.status(500).send("Internal server error when attempting login.")
            }
            if(data){
                req.session.userId = req.body.username
                res.status(200).send("Login successful.")
            }
            else{
                res.status(404).send("Invalid username or password.")
            }
        })
    }
    else{
        res.status(400).send("Specify a username and password in the request body to log in.")
    }
})

app.post("/logout", function(req, res){
    if(req.session){
        req.session.destroy(function(err){
            if(err){
                res.status(500).send("Internal server error when attempting logout.")
            }
            else{
                res.status(200).send("Logout successful.")
            }
        })
    }
    else{
        res.status(403).send("You are not logged in.")
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

app.post("/manage", function(req, res){
    if(req.session){
        if(req.body.type == "DELETE"){
            if(req.session.userId){
                auth.deleteUser(req.session.userId, function(err){
                    if(err){
                        res.status(500).send("Internal server error encountered while attempting to delete account.")
                    }
                    else{
                        req.session.destroy(function(err){
                            if(err){
                                res.status(500).send(`Account deleted successfully, but internal server
                                 error encountered while logging out.`)
                            }
                            else{
                                res.status(200).send("Account deleted successfully and user logged out.")
                            }
                        })
                    }
                })
            }
            else{
                res.status(500).send("Internal server error retrieving session information.")
            }
        }
        else if(req.body.type == "CHANGEPASSWORD"){
            if(req.body.username && req.body.newPassword){
                auth.changePassword(req.body.username, req.body.newPassword, function(err){
                    if(err){
                        res.status(500).send("Internal server error encountered while attempting to change password.")
                    }
                    else{
                        res.status(200).send("Password changed successfully.")
                    }
                })
            }
            else{
                res.status(400).send("To change password, username and newPassword must specified in request body.")
            }
        }
    }
    else{
        res.status(403).send("You must be logged in to manage an account.")
    }
})

app.get("/loginstatus", function(req, res){
    if(req.session){
        if(req.session.userId){
            res.status(200).send({
                loginStatus: Shared.LoginState.LOGGEDIN,
                username: req.session.userId,
                details: "Logged in properly."
            })
        }
        else{
            res.status(200).send({
                loginStatus: Shared.LoginState.ERROR,
                username: null,
                details: "Session exists but username missing. Please log out and log in again."
            })
        }
    }
    else{
        res.status(200).send({
            loginStatus: Shared.LoginState.LOGGEDOUT,
            username: null,
            details: "Not logged in."
        })
    }
})

app.listen(3001, () => console.log('Mafia server listening on port 3000!'))