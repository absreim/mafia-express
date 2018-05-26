const bcrypt = require("bcrypt")
const saltRounds = 10;

const Authentication = class {
    constructor(db){
        this.db = db
    }
    createUser(username, password){
        bcrypt.hash(password, saltRounds, function(err, hash){
            if(err){
                throw new Error("Error computing password hash.")
            }
            else{
                try{
                    db.none("INSERT INTO accounts (username, hash) VALUES ($1, $2)",[username, hash])
                }
                catch(e){
                    throw new Error("Error inserting user info into database.")
                }
            }
        })
    }
    userExists(username){
        try{
            const rows = yield db.oneOrNone("SELECT FROM accounts WHERE username = $1",[username])
            return rows.length == 1
        }
        catch(e){
            throw new Error("Error querying database for the existence of a user.")
        }
    }
    changePassword(username, password){
        bcrypt.hash(password, saltRounds, function(err, hash){
            if(err){
                throw new Error("Error computing password hash.")
            }
            else{
                try{
                    db.none("UPDATE accounts SET hash = $1 WHERE username = $2",[hash,username])
                }
                catch(e){
                    throw new Error("Error updating password hash in database.")
                }
            }
        })
    }
    deleteUser(username){
        try{
            db.none("DELETE FROM accounts WHERE username = $1",[username])
        }
        catch(e){
            throw new Error("Error deleting user from database.")
        }
    }
    authenticate(username, password){
        var hash = null
        try{
            hash = yield db.one("SELECT hash FROM accounts WHERE username = $1",[username])
        }
        catch(e){
            throw new Error("Error querying database for password hash.")
        }
        return bcrypt.compare(password, hash, function(err, res){
            if(err){
                throw new Error("Error occurred while comparing password hash.")
            }
            return res
        })
    }
}

module.exports = Authentication