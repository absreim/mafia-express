require("shared.js")
const Util = require("util.js")

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
    /* numWerewolves should be less than half of total players.
    Minimum totalPlayers in a game is 3. */
    constructor(totalPlayers, numWerewolves){
        this.gameState = new GameState()
        this.totalPlayers = totalPlayers
        this.numWerewolves = numWerewolves
        this.livingPlayersCache = null // Set of all players still alive
    }
    joinPlayer(playerName){
        if(playerName in this.gameState.players){
            console.log("Warning: attempt to join player that is already joined.")
        }
        else{
            if(this.gameState.players.keys().length == this.totalPlayers - 1){
                this.gameState.players[playerName] = new PlayerDetails(false)
                return this.initializeGame()
            }
            else{
                const recipients = this.gameState.player.keys() // exclude player that just joined
                this.gameState.players[playerName] = new PlayerDetails(false)
                const payload =
                    {
                        type: ServerMessageType.PLAYERJOINED,
                        playerName: playerName
                    }
                const playerJoinedMessage = new GameControllerMessage(recipients, payload)
                const stateUpdateMessage = new GameControllerMessage([playerName], this.gameStateMessage(false))
                // initial game state update for player that just joined
                return [playerJoinedMessage, stateUpdateMessage]
            }
        }
    }
    removePlayer(playerName){
        if(playerName in this.gameState.players){
            delete this.gameState.players[playerName]
            const recipients = this.gameState.player.keys()
            const payload =
            {
                type: ServerMessageType.PLAYERLEFT,
                playerName: playerName
            }
            return [new GameControllerMessage(recipients, payload)]
        }
        else{
            console.log("Warning: attempt to remove player that doesn't exist.")
        }
    }
    /* Return list of messages to send and a list of recipients for each message
    or return null if there is no message to send. */
    handleMessage(message, sendingPlayer){
        if(!sendingPlayer in this.gameState.players){
            console.log("Warning: message sent by player that does not exist in the game.")
            return null
        }
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
            case ClientMessageType.ACKNOWLEDGE:
                return this.ackHandler(sendingPlayer)
            case ClientMessageType.SUGGESTTARGET:
                if(!("target" in message)) {
                    console.log("Warning: missing \"target\" property in received suggest target message.")
                    return null
                }
                else{
                    return this.suggestHandler(sendingPlayer, message.target)
                }
            default:
                console.log(`Warning: Unknown message type received: \"${message.type}\".`)
                return null
        }
    }
    gameStateReqHandler(sendingPlayer){
        if(sendingPlayer in gameState.players){
            const recipients = [sendingPlayer]
            const payload = this.gameStateMessage(gameState.players[sendingPlayer].isWerewolf)
            return [new GameControllerMessage(recipients,payload)]
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
        if(!(livingPlayersCache.has(sendingPlayer))){
            console.log("Warning: Vote cast message received for player that is dead.")
            return null
        }
        this.votes[sendingPlayer] = choice
        if(this.phase == Phases.DAYTIMEVOTING){
            if(this.votes.keys().length == this.livingPlayersCache.size){
                if(this.countVotes()){
                    this.killPlayer(this.gameState.chosenPlayer)
                    if(this.checkGameOver()){
                        this.gameState.phase = Phases.OVER
                    }
                    else{
                        this.gameState.phase = Phases.ENDOFDAY
                        this.gameState.acks.clear()
                    }
                }
                else{
                    this.gameState.phase = Phases.DAYTIMEVOTEFAILED
                    this.gameState.acks.clear()
                }
                return this.gameStateUpdateAll()
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
        else if(this.phase == Phases.NIGHTTIMEVOTING){
            if(this.gameState.players[sendingPlayer].isWerewolf){
                if(this.votes.keys().length == this.livingWerewolves().length){
                    if(this.countVotes()){
                        this.killPlayer(this.gameState.chosenPlayer)
                        if(this.checkGameOver()){
                            this.gameState.phase = Phases.OVER
                        }
                        else{
                            this.gameState.phase = Phases.ENDOFNIGHT
                            this.gameState.acks.clear()
                        }
                        return this.gameStateUpdateAll()
                    }
                    else{
                        this.gameState.phase = Phases.NIGHTTIMEVOTEFAILED
                        this.gameState.acks.clear()
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
        else{
            console.log("Warning: vote received at inappropriate phase.")
            return null
        }
    }
    ackHandler(sendingPlayer){
        if(this.gameState.acks.has(sendingPlayer)){
            console.log("Warning: acknowledgement received by player who already sent an acknowledgement.")
            return null
        }
        switch(this.gameState.phase){
            case Phases.ENDOFDAY:
                this.gameState.acks.add(sendingPlayer)
                if(this.gameState.acks.size == this.livingPlayersCache.size){
                    this.gameState.phase = Phases.NIGHTTIME
                    this.gameState.chosenPlayer = null
                    return this.gameStateUpdateAll()
                }
                else{
                    const recipients = this.gameState.players.keys()
                    const payload = 
                        {
                            type: ServerMessageType.ACKNOWLEDGEMENT,
                            playerName: sendingPlayer
                        }
                    return [new GameControllerMessage(recipients, payload)]
                }
            case Phases.ENDOFNIGHT:
                this.gameState.acks.add(sendingPlayer)
                if(this.gameState.acks.size == this.livingWerewolves().length){
                    this.gameState.phase = Phases.DAYTIME
                    this.gameState.chosenPlayer = null
                    return this.gameStateUpdateAll()
                }
                else{
                    const recipients = this.gameState.players.keys()
                    const payload = 
                        {
                            type: ServerMessageType.ACKNOWLEDGEMENT,
                            playerName: sendingPlayer
                        }
                    return [new GameControllerMessage(recipients, payload)]
                }
            case Phases.DAYTIMEVOTEFAILED:
                this.gameState.acks.add(sendingPlayer)
                if(this.gameState.acks.size == this.livingPlayersCache.size){
                    this.gameState.phase = Phases.DAYTIME
                    this.gameState.chosenPlayer = null
                    return this.gameStateUpdateAll()
                }
                else{
                    const recipients = this.gameState.players.keys()
                    const payload = 
                        {
                            type: ServerMessageType.ACKNOWLEDGEMENT,
                            playerName: sendingPlayer
                        }
                    return [new GameControllerMessage(recipients, payload)]
                }
            case Phases.NIGHTTIMEVOTEFAILED:
                if(this.gameState.players[sendingPlayer].isWerewolf){
                    this.gameState.acks.add(sendingPlayer)
                    if(this.gameState.acks.size == this.livingWerewolves().length){
                        this.gameState.phase = Phases.NIGHTTIME
                        this.gameState.chosenPlayer = null
                        return this.gameStateUpdateAll()
                    }
                    else{
                        const recipients = this.gameState.players.keys().filter(
                            player => this.gameState.players[player].isWerewolf
                        )
                        const payload = 
                            {
                                type: ServerMessageType.ACKNOWLEDGEMENT,
                                playerName: sendingPlayer
                            }
                        return [new GameControllerMessage(recipients, payload)]
                    }
                }
                else{
                    console.log("Warning: ack received by non-werewolf for werewolf-only end of night ack screen.")
                    return null
                }
            case Phases.STARTED:
                this.gameState.acks.add(sendingPlayer)
                if(this.gameState.acks.size == this.gameState.players.keys().length){
                    this.gameState.phases = Phases.NIGHTTIME
                    return this.gameStateUpdateAll()
                }
                else{
                    return null
                }
            default:
                console.log("Warning: ack received at inappropriate phase.")
                return null
        }
    }
    suggestHander(sendingPlayer, target){
        switch(this.gameState.phase){
            case Phases.DAYTIME:
                if(this.livingPlayersCache.has(sendingPlayer)){
                    if(this.livingPlayersCache.has(target)){
                        this.gameState.phase = Phases.DAYTIMEVOTING
                        this.gameState.chosenPlayer = target
                        this.gameState.votes = {}
                        return this.gameStateUpdateAll()
                    }
                    else{
                        console.log("Warning: target player not in set of living players.")
                        return null
                    }
                }
                else{
                    console.log("Warning: player that chose target not in set of living players.")
                    return null
                }
            case Phases.NIGHTTIME:
                if(this.gameState.players[sendingPlayer].isAlive && this.gameState.players[sendingPlayer].isWerewolf){
                    if(!this.gameState.players[target].isWerewolf && this.gameState.players[target].isAlive){
                        this.gameState.phase = Phases.NIGHTTIMEVOTING
                        this.gameState.chosenPlayer = target
                        this.gameState.votes = {}
                        return this.gameStateUpdateAll()
                    }
                    else{
                        console.log("Warning: target player not in set of living villagers.")
                        return null
                    }
                }
                else{
                    console.log("Warning: player that chose target not in set of living werewolves.")
                    return null
                }
            /* Fairly high chance for race condition to occur where multiple targets are suggested
            before the game phase changes. Therefore, there will be no warning message printed here. */
            default:
                return null
        }
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
    livingWerewolves(){
        return this.gameState.players.keys().filter(
            player => this.gameState.players[player].isWerewolf && this.gameState.players[player].isAlive
        )
    }
    /* Return message payload describing game state. Non-privileged messages have faction
    information removed to prevents clients who are villagers from determining
    the identity of the werewolf. If calling this function before game has started,
    isPrivileged must be false. */
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
                    console.log(`Warning: player "${player}" with falsy value found in players object.`)
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
                    console.log(`Warning: player "${player}" with falsy value found in players object.`)
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
    checkGameOver(){
        const livingVillagers = this.gameState.players.keys.filter(
            player => !this.gameState.players[player].isWerewolf && this.gameState.players[player].isAlive
        )
        const numLivingVillagers = livingVillagers.length
        const numLivingWerewolves = livingWerewolves().length
        return numLivingWerewolves == 0 || numLivingVillagers <= numLivingWerewolves
    }
    initializeGame(){
        if(this.numWerewolves / this.totalPlayers >= 0.5){
            console.log(`Warning: attempt to start game half or more of the players as werewolves. 
                Using default computed value instead.`)
            this.numWerewolves = Math.floor(Math.sqrt(this.totalPlayers))
        }
        const playerNamesArray = this.gameState.players.keys()
        Util.shuffle(playerNamesArray)
        for(var i = 0; i < this.numWerewolves; i++){
            this.gameState.players[playerNamesArray[i]].isWerewolf = true
        }
        this.livingPlayersCache = new Set()
        for(var player of playerNamesArray){
            this.livingPlayersCache.add(player)
        }
        this.gameState.phase = Phases.STARTED
        return this.gameStateUpdateAll()
    }
}