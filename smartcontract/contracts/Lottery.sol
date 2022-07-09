// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract Lottery is Ownable, VRFConsumerBase {
    // chainLink
    uint256 public fee;
    bytes32 public keyhash;

    uint8 public maxPlayers;
    address[] public participants;
    bool public gameStarted;
    uint256 public gameFee;
    uint256 public gameId;

    constructor(
        address vrfCoordinator,
        address linkToken,
        bytes32 vrfKeyHash,
        uint256 vrfFee
    ) VRFConsumerBase(vrfCoordinator, linkToken) {
        keyhash = vrfKeyHash;
        fee = vrfFee;
        gameStarted = false;
    }

    event GameStarted(uint256 gameId, uint8 maxPlayers, uint256 entryFee);
    event PlayerJoined(uint256 gameId, address player);
    event GameEnded(uint256 gameId, address winner, bytes32 requestId);

    function startGame(uint8 _maxPlayers, uint256 _entryFee) public onlyOwner {
        require(!gameStarted, "game already Started");
        delete participants;
        maxPlayers = _maxPlayers;
        gameFee = _entryFee;
        gameId += 1;
        gameStarted = true;
        emit GameStarted(gameId, maxPlayers, _entryFee);
    }

    function joinGame() public payable {
        require(msg.value >= gameFee, "invalid amount of entry fee");
        require(gameStarted, "game not started");
        require(participants.length < maxPlayers, "max players reached");
        participants.push(msg.sender);
        emit PlayerJoined(gameId, msg.sender);
        if (participants.length == maxPlayers) {
            getRandomWinner();
        }
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomness)
        internal
        virtual
        override
    {
        uint256 winnerIndex = randomness % participants.length;
        address winner = participants[winnerIndex];
        (bool sent, ) = winner.call{value: address(this).balance}("");
        require(sent, "Failed to send ether");
        gameStarted = false;
        emit GameEnded(gameId, winner, requestId);
    }

    function getRandomWinner() private returns (bytes32 requestedId) {
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK");
        return requestRandomness(keyhash, fee);
    }

    receive() external payable {}

    fallback() external payable {}
}
