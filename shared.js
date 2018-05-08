/* Shared constants and classes between client and server. */

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
const Phases = {
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

const ClientMessageType = {
    GAMESTATEREQ: "gameStateReq",
    SUGGESTTARGET: "suggestTarget",
    VOTECAST: "voteCast",
    ACKNOWLEDGE: "acknowledge" // acknowledge results of end of day and end of night
}

const ServerMessageType = {
    GAMESTATEINFO = "gameStateInfo",
    ACKNOWLEDGEMENT = "acknoledgement",
    VOTECAST: "voteCast",
    PLAYERJOINED: "playerJoined",
    PLAYERLEFT: "playerLeft"
}

class PlayerDetails {
    constructor(isWerewolf){
        this.isWerewolf = isWerewolf
        this.isAlive = true
    }
}

class GameState {
    constructor(){
        this.phase = Phases.WAITING
        this.players = {} // player name -> PlayerDetails object
        this.votes = {} // player name -> value; true = yea, false = nay
        this.acks = new Set() // acknowledgements for information displayed in certain phases
        this.chosenPlayer = null // player chosen for voting or player just killed
    }
}