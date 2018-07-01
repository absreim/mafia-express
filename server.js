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
        res.status(401).send({outcome: Shared.LoginOutcome.LOGGEDIN})
    }
    else if(req.body.username && req.body.password){
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
})

app.get("/logout", function(req, res){
    if(req.session){
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
            res.status(500).send({outcome: Shared.AccountDeleteOutcome.INTERNALERROR})
        }
    }
    else{
        res.status(403).send({outcome: Shared.AccountDeleteOutcome.NOTLOGGEDIN})
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
            res.status(500).send({outcome: Shared.ChangePasswordOutcome.INTERNALERROR})
        }
    }
    else{
        res.status(403).send({outcome: Shared.ChangePasswordOutcome.NOTLOGGEDIN})
    }
})

app.get("/loginstatus", function(req, res){
    if(req.session){
        if(req.session.userId){
            res.status(200).send({
                loginStatus: Shared.LoginStatus.LOGGEDIN,
                username: req.session.userId,
                details: "Logged in properly."
            })
        }
        else{
            res.status(200).send({
                loginStatus: Shared.LoginStatus.ERROR,
                username: null,
                details: "Session exists but username missing. Please log out and log in again."
            })
        }
    }
    else{
        res.status(200).send({
            loginStatus: Shared.LoginStatus.LOGGEDOUT,
            username: null,
            details: "Not logged in."
        })
    }
})

app.listen(3001, () => console.log('Mafia server listening on port 3000!'))