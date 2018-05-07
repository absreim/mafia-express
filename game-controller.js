require("shared.js")

/* Format of single message returned GameController
handleMessage function. To preserve type across
different situations, all messages are returned inside
an array, even if there is only one message. */
class GameControllerMessage {
    constructor(recipients, payload){
        this.recipients = recipients
        this.payload = payload
    }
}

/* Represents a single game instance. */
class GameController {
    constructor(totalPlayers, numWerewolves){
        this.gameState = new GameState()
        this.totalPlayers = totalPlayers
        this.numWerewolves = numWerewolves
        this.livingPlayersCache = null // Set of all players still alive
    }
    /* Return list of messages to send and a list of recipients for each message
    or return null if there is no message to send. */
    handleMessage(message, sendingPlayer){
        switch(message.type){
            case ClientMessageType.GAMESTATEREQ:
                return this.gameStateReqHandler(sendingPlayer)
            case ClientMessageType.VOTECAST:
                if(!("choice" in message)) {
                    console.log("Warning: Missing \"choice\" property in received vote cast message.")
                    return null
                }
                else {
                    return this.voteCastHandler(sendingPlayer, message.choice)
                }
            default:
                console.log("Warning: Unknown message type received: \"" + message.type + "\".")
                return null
        }
    }
    gameStateReqHandler(sendingPlayer){
        if(sendingPlayer in gameState.players){
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
    voteCastHandler(sendingPlayer, choice){
        if(sendingPlayer in votes){
            console.log("Warning: Vote cast message received for player that already voted.")
            return null
        }
        if(!(sendingPlayer in livingPlayersCache)){
            console.log("Warning: Vote cast message received for player that is dead.")
            return null
        }
        this.votes[sendingPlayer] = choice
        if(this.phase == Phases.DAYTIMEVOTING){
            if(this.votes.keys().length == this.livingPlayersCache.size){
                if(this.countVotes()){
                    this.killPlayer(this.gameState.chosenPlayer)
                    this.gameState.phase = phases.ENDOFDAY
                }
                else{
                    this.gameState.phase = phases.DAYTIMEVOTEFAILED
                }
                return gameStateUpdateAll()
            }
            else {
                const recipients = this.gameState.players.keys()
                const payload =
                    {   
                        type: ServerMessageType.VOTECAST,
                        playerName: sendingPlayer,
                        choice: choice
                    }
                return [new GameControllerMessage(recipients, payload)]
            }
        }
        if(this.phase == Phases.NIGHTTIMEVOTING){
            if(this.gameState.players[sendingPlayer].isWerewolf){
                const livingWerewolves = this.gameState.players.keys().filter(
                    player => this.gameState.players[player].isWerewolf && this.gameState.players[player].isAlive
                )
                if(this.votes.keys().length == this.livingWerewolves.length){
                    if(this.countVotes()){
                        this.killPlayer(this.gameState.chosenPlayer)
                        this.gameState.phase = phases.ENDOFNIGHT
                        return gameStateUpdateAll()
                    }
                    else{
                        this.gameState.phase = phases.NIGHTTIMEVOTEFAILED
                        const recipients = this.gameState.players.keys().filter(
                            player => this.gameState.players[player].isWerewolf
                        )
                        const payload = gameStateMessage(true)
                        return [new GameControllerMessage(recipients, payload)]
                    }
                }
                else{
                    const recipients = this.gameState.players.keys().filter(
                        player => this.gameState.players[player].isWerewolf
                    )
                    const payload =
                    {   
                        type: ServerMessageType.VOTECAST,
                        playerName: sendingPlayer,
                        choice: choice
                    }
                    return [new GameControllerMessage(recipients, payload)]
                }
            }
            else{
                console.log(`Warning: privileged vote received by non-privileged player: "${sendingPlayer}".`)
                return null
            }
        }
        // TODO: nighttime voting and failure case
    }
    /* Placeholder. Move this code to the function that initlializes the set of players. */
    livingPlayers(){
        const livingPlayers = new Set()
        for (var i in this.gameState.players){
            if(this.gameState.players[i].isAlive){
                this.livingPlayers.add(i)
            }
        }
        return livingPlayers
    }
    /* Return message payload describing game state. Non-privileged messages have faction
    information removed to prevents clients who are villagers from determining
    the identity of the werewolf. */
    gameStateMessage(isPrivileged){
        const gameStateCopy = new GameState()
        gameStateCopy.phase = this.gameState.phase
        gameStateCopy.chosenPlayer = this.gameState.chosenPlayer
        for (var player in this.gameState.votes){
            gameStateCopy.votes[player] = this.gameState.votes[player]
        }
        if(isPrivileged){
            for(var player in this.gameState.players){
                if(this.gameState.players[player]){
                    gameStateCopy.players[player] = new PlayerDetails(this.gameState.players[player].isWerewolf)
                    gameStateCopy.players[player].isAlive = this.gameState.players[player].isAlive
                }
                else{
                    console.log("Warning: player \"" + player + "\" with falsy value found in players object.")
                }
            }
        }
        else{ // to simulate lack to privileged information, all players are marked as villagers
            for(var player in this.gameState.players){
                if(this.gameState.players[player]){
                    gameStateCopy.players[player] = new PlayerDetails(false)
                    gameStateCopy.players[player].isAlive = this.gameState.players[player].isAlive
                }
                else{
                    console.log("Warning: player \"" + player + "\" with falsy value found in players object.")
                }
            }
        }
        const stateInfoPayload =
            {
                type: ServerMessageType.GAMESTATEINFO,
                info: gameStateCopy
            }
        return stateInfoPayload
    }
    /* Return an array of messages that updates game state for all players. */
    gameStateUpdateAll(){
        const privilegedPayload = this.gameStateMessage(true)
        const nonPrivilegedPayload = this.gameStateMessage(false)
        const privilegedRecipients = this.gameState.players.keys().filter(
            player => this.gameState.players[player].isWerewolf
        )
        const nonPrivilegedRecipients = this.gameState.players.keys().filter(
            player => !this.gameState.players[player].isWerewolf
        )
        const privilegedMessage = new GameControllerMessage(privilegedRecipients, privilegedPayload)
        const nonPrivilegedMessage = new GameControllerMessage(nonPrivilegedRecipients, nonPrivilegedPayload)
        return [privilegedMessage, nonPrivilegedMessage]
    }
    /* Analyze votes, returning whether there is a majority of yea votes.*/
    countVotes(){
        var yeaCount = 0
        var nayCount = 0
        for (var player in this.gameState.votes){
            if(this.gameState.votes[player]){
                yeaCount++
            }
            else{
                nayCount++
            }
        }
        return yeaCount > nayCount
    }
    killPlayer(player){
        this.livingPlayersCache.delete(player)
        this.gameState.players[player].isAlive = false
    }
}