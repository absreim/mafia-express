const GameController = require("./game-controller.js")
const Shared = require("./shared.js")

const totalPlayers = 3
const numWerewolves = 2
var gc = null

beforeEach(() => {
    gc = new GameController.GameController(totalPlayers, numWerewolves)
    gc.joinPlayer("Alice")
    gc.joinPlayer("Bob")
    gc.joinPlayer("Cory")
})

test("Alice, Bob, and Cory should be in the game.", () => {
    const playerNames = Object.keys(gc.gameState.players)
    expect(playerNames).toContain("Alice")
    expect(playerNames).toContain("Bob")
    expect(playerNames).toContain("Cory")
})

test("Number of werewolves should be automatically scaled down to 1.", () => {
    const claimedNumWerewolves = gc.numWerewolves
    const actualNumWerewolves = Object.keys(gc.gameState.players).filter(
        player => gc.gameState.players[player].isWerewolf).length
    expect(claimedNumWerewolves).toEqual(1)
    expect(actualNumWerewolves).toEqual(1)
    })

test("Game should be in STARTED phase.", () => {
        const phase = gc.gameState.phase
        expect(phase).toEqual(Shared.Phases.STARTED)
    })

describe("After all players acknowledged STARTED phase.", () => {
    beforeEach(() => {
        gc.handleMessage({type: Shared.ClientMessageType.ACKNOWLEDGE},"Alice")
        gc.handleMessage({type: Shared.ClientMessageType.ACKNOWLEDGE},"Bob")
        gc.handleMessage({type: Shared.ClientMessageType.ACKNOWLEDGE},"Cory")
    })
    test("Game should be in NIGHTTIME phase.", () => {
        const phase = gc.gameState.phase
        expect(phase).toEqual(Shared.Phases.NIGHTTIME)
    })
})