const GameController = require("./game-controller.js")
const Shared = require("./shared.js")

const totalPlayers = 3
const numWerewolves = 1
const gc = new GameController.GameController(totalPlayers, numWerewolves)

gc.joinPlayer("Alice")
gc.joinPlayer("Bob")
gc.joinPlayer("Cory")