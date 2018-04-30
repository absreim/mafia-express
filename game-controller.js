/* 
WAITING: waiting for game to fill up with players
STARTED: just started game, displaying list of players 
and waiting for ready from each player
DAYTIME: daytime, voting on players to hang
ENDOFDAY: displaying results of daytime voting
NIGHTTIME: nighttime, villagers sleep, werewolves choose to kill
ENDOFNIGHT: displaying results of nighttime attacks
OVER: game over screen, waiting for players to ready up
before creating new game
*/
const Phases = {
    WAITING: "waiting",
    STARTED: "started",
    DAYTIME: "daytime",
    ENDOFDAY: "endOfDay",
    NIGHTTIME: "nighttime",
    ENDOFNIGHT: "endOfNight",
    OVER: "over"
}

const ClientMessageType = {
    GAMESTATEREQ: "gameStateReq",
    VOTECAST: "voteCast",
    ACKNOWLEDGE: "acknowledge" // acknowledge results of end of day and end of night
}

const ServerMessageType = {
    GAMESTATEINFO = "gameStateInfo",
    VOTECAST: "voteCast"
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
        this.players = {} // playername -> PlayerDetails object
        this.votes = null // playername -> playername
        this.killedPlayer = null
    }
}

/* Represents a single game instance. */
class GameController {
    constructor(){
        this.gameState = new GameState()
    }
    /* Return list of messages to send and a list of recipients for each message
    or return null if there is no message to send. */
    handleMessage(message, sendingPlayer){
        switch(message.type){
            case ClientMessageType.GAMESTATEREQ:
                return this.gameStateReqHandler(sendingPlayer)
            case ClientMessageType.VOTECAST:
                if (!("target" in message)) {
                    console.log("Warning: Missing \"target\" property in received vote cast message.")
                    return null
                }
                else {
                    return this.voteCastHandler(message.target)
                }
            default:
                console.log("Warning: Unknown message type received: " + message.type)
                return null
        }
    }
    gameStateReqHandler(sendingPlayer){
        if (sendingPlayer in gameState.players){
            return [{
                recipients: [sendingPlayer],
                payload: this.gameStateMessage(gameState.players[sendingPlayer].isWerewolf)
            }]
        }
        else {
            console.log("Warning: Request received to return game state for nonexistent player.")
            return null
        }
    }
    voteCastHandler(sendingPlayer, target){
        if (!(sendingPlayer in votes)){
            console.log("Warning: Vote cast message received for player that already voted.")
            return null
        }
        this.votes[playerName] = target
        if(this.votes.keys().length == this.livingPlayers().keys().length){
            const killedPlayer = this.countVotes()
            // TODO: adjust game state and append game state update messages
        }
        else {
            const voteCastMessage =
            {
                recipients: this.gameState.players.keys(),
                payload:
                {   
                    type: ServerMessageType.VOTECAST,
                    playerName: target
                }
            }
        }
        // TODO: return value
    }
    /* Return array of names of players that are still alive. */
    livingPlayers(){
        const living = new Set()
    }
    /* Return message describing game state. Non-privileged messages have faction
    information removed to prevents clients who are villagers from determining
    the identity of the werewolf. */
    gameStateMessage(isPrivileged){
        // TODO
    }
    /* Return an array of messages that updates game state for all players. */
    gameStateUpdateAll(){
        // TODO
    }
    /* Analyze votes, returning name of player killed by voting, or null if no one was killed.*/
    countVotes(){
        // TODO
    }
}