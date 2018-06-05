const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const session = require("express-session")
const pgp = require("pg-promise")()
const pgSession = require("connect-pg-simple")(session)
const Authentication = require("./authentication.js")

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

app.post("/login", function(req, res, next){
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

app.post("/logout", function(req, res, next){
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

app.post("/signup", function(req, res, next){
    if(req.session){
        res.status(401).send("Already logged in. Please log out first.")
    }
    else if(req.body.username && req.body.password){
        auth.userExists(req.body.username, function(err, result){
            if(err){
                res.status(500).send("Internal server error attempting to check for existence of user.")
            }
            else{
                if(result){
                    res.status(401).send("User with specified name already exists.")
                }
                else{
                    auth.createUser(req.body.username, req.body.password, function(err){
                        if(err){
                            res.status(500).send("Internal server error creating user account.")
                        }
                        else{
                            res.status(200).send("Account created successfully.")
                        }
                    })
                }
            }
        })
    }
    else{
        res.status(400).send("Specify a username and password in the request body to sign up.")
    }
})

app.post("/manage", function(req, res, next){
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

app.get('/', (req, res) => res.send("Hello, World!"))
app.listen(3000, () => console.log('Example app listening on port 3000!'))