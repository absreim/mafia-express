/* Shared constants and classes between client and server. 
This file is not intended to be used as is on the client side. 
Organizing the module this way is merely meant to make the 
structure of the app easier to understand. */

const Shared = {}

/* 
WAITING: waiting for game to fill up with players
STARTED: just started game, displaying list of players 
and waiting for ready from each player
DAYTIME: daytime, waiting for player to suggest target
DAYTIMEVOTING: daytime, target selected and waiting for votes
ENDOFDAY: displaying results of daytime voting
DAYTIMEVOTEFAILED: displaying vote results of failed vote
and waiting for acknowledgement from players
NIGHTTIME: nighttime, waiting for player to suggest target
NIGHTTIMEVOTING: nighttime, target selected and waiting for votes
NIGHTTIMEVOTEFAILED: displaying vote results of failed vote
and waiting for acknowledgement from players
ENDOFNIGHT: displaying results of nighttime attacks
OVER: game over screen, waiting for players to ready up
before creating new game
*/
Shared.Phases = {
    WAITING: "waiting",
    STARTED: "started",
    DAYTIME: "daytime",
    DAYTIMEVOTING: "daytimeVoting",
    ENDOFDAY: "endOfDay",
    DAYTIMEVOTEFAILED: "daytimeVoteFailed",
    NIGHTTIME: "nighttime",
    NIGHTTIMEVOTING: "nighttimeVoting",
    NIGHTTIMEVOTEFAILED: "nighttimeVoteFailed",
    ENDOFNIGHT: "endOfNight",
    OVER: "over"
}

Shared.ClientMessageType = {
    GAMESTATEREQ: "gameStateReq",
    SUGGESTTARGET: "suggestTarget",
    VOTECAST: "voteCast",
    ACKNOWLEDGE: "acknowledge" // acknowledge results of end of day and end of night
}

Shared.ServerMessageType = {
    GAMESTATEINFO: "gameStateInfo",
    ACKNOWLEDGEMENT: "acknoledgement",
    VOTECAST: "voteCast",
    PLAYERJOINED: "playerJoined",
    PLAYERLEFT: "playerLeft"
}

Shared.PlayerDetails = class {
    constructor(isWerewolf){
        this.isWerewolf = isWerewolf
        this.isAlive = true
    }
}

Shared.GameState = class {
    constructor(){
        this.phase = Shared.Phases.WAITING
        this.players = {} // player name -> PlayerDetails object
        this.votes = {} // player name -> value; true = yea, false = nay
        this.acks = new Set() // acknowledgements for information displayed in certain phases
        this.chosenPlayer = null // player chosen for voting or player just killed
    }
}

/* Details of session state returned to the client. */
Shared.LoginStatus = {
    LOGGEDIN: "loggedIn",
    LOGGEDOUT: "loggedOut",
    ERROR: "error"
}

/* Responses to account creation (/signup) requests */
Shared.AccountCreateOutcome = {
    INTERNALERROR: "internalError",
    EXISTS: "exists", // account with specified name already exists
    SUCCESS: "success",
    MISSINGINFO: "missingInfo" // required fields not present in body
}

/* Responses to logout requests */
Shared.LogoutOutcome = {
    NOTLOGGEDIN: "notLoggedIn",
    INTERNALERROR: "internalError",
    SUCCESS: "success"
}

Shared.AccountDeleteOutcome = {
    NOTLOGGEDIN: "notLoggedIn",
    INTERNALERROR: "internalError",
    MISSINGINFO: "missingInfo",
    WRONGPASSWORD: "wrongPassword",
    SUCCESS: "success"
}

Shared.LoginOutcome = {
    LOGGEDIN: "loggedIn", // already logged in
    INTERNALERROR: "internalError",
    MISSINGINFO: "missingInfo",
    WRONGCREDENTIALS: "wrongCredentials", // could be wrong username, password, or both
    SUCCESS: "success"
}

Shared.ChangePasswordOutcome = {
    NOTLOGGEDIN: "notLoggedIn",
    INTERNALERROR: "internalError",
    MISSINGINFO: "missingInfo",
    WRONGPASSWORD: "wrongPassword",
    SUCCESS: "success"
}

module.exports = Shared