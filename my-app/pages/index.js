import Head from "next/head";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { BigNumber, Contract, ethers, providers, utils } from "ethers";
import web3Modal from "web3modal";
import { lottery_address, abi } from "../contract";
import { subgraphQuery, fetch_game } from "../query";

export default function Home() {
    const zero = BigNumber.from("0");
    const [walletConnected, setWalletConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [gameStarted, setgameStarted] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [entryFee, setEntryFee] = useState(zero);
    const [maxPlayers, setMaxPlayers] = useState(0);
    const [winner, setWinner] = useState("");
    const [players, setPlayers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [pool, setPool] = useState(zero);
    const [isJoined, setIsJoined] = useState(false);
    const web3ModalRef = useRef();

    const forceUpdate = React.useReducer(() => ({}), {})[1];

    const getProviderOrSigner = async (needSigner = false) => {
        const instance = await web3ModalRef.current.connect();
        const provider = new providers.Web3Provider(instance);

        const { chainId } = await provider.getNetwork();
        if (chainId !== 80001) {
            window.alert("Change the network to Mumbai");
            throw new Error("Change network to Mumbai");
        }

        if (needSigner) {
            const signer = provider.getSigner();
            return signer;
        }
        return provider;
    };

    const connectWallet = async () => {
        try {
            await getProviderOrSigner();
            setWalletConnected(true);
        } catch (err) {
            console.error(err);
        }
    };

    const checkIfGameStarted = async () => {
        try {
            const provider = await getProviderOrSigner();
            const lottery_contract = new Contract(
                lottery_address,
                abi,
                provider
            );
            const status = await lottery_contract.gameStarted();
            const _event = await subgraphQuery(fetch_game());
            const _game_event = _event.games;
            const game_event = _game_event[0];
            let event_logs = [];

            if (status) {
                event_logs = [`Game has started with Id: ${game_event.id}`];
                if (game_event.players && game_event.players.length > 0) {
                    event_logs.push(
                        `${game_event.players.length}/${game_event.maxPlayers} has already joined`
                    );
                    game_event.players.forEach((player) => {
                        event_logs.push(`${player} has already joined 👀`);
                    });
                }
                checkPlayerJoined(game_event.players);
                setgameStarted(true);
                setMaxPlayers(game_event.maxPlayers);
                setEntryFee(BigNumber.from(game_event.entryFee));
                setPlayers(game_event.players);
            } else if (!status && game_event.winner) {
                event_logs.push(
                    `Last game has ended with ID: ${game_event.id}`,
                    `Winner is: ${game_event.winner} 🎉 `,
                    `Waiting for host to start new game....`
                );
                setWinner(game_event.winner);
                setgameStarted(false);
                getOwner();
            }
            setLogs(event_logs);
            forceUpdate();
        } catch (err) {
            console.log(err);
        }
    };

    const getOwner = async () => {
        try {
            const provider = await getProviderOrSigner();
            const signer = await getProviderOrSigner(true);
            const lottery_contract = new Contract(
                lottery_address,
                abi,
                provider
            );
            const address = await signer.getAddress();
            const owner = await lottery_contract.owner();
            if (address.toLowerCase() == owner.toLowerCase()) {
                setIsOwner(true);
            }
        } catch (err) {
            console.log(err);
        }
    };

    const startGame = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const lottery_contract = new Contract(lottery_address, abi, signer);
            setLoading(true);
            const tx = await lottery_contract.startGame(maxPlayers, entryFee);
            await tx.wait();
            setLoading(false);
        } catch (err) {
            console.log(err);
            setLoading(false);
        }
    };

    const joinGame = async () => {
        try {
            const signer = await getProviderOrSigner(true);
            const lottery_contract = new Contract(lottery_address, abi, signer);
            setLoading(true);
            const tx = await lottery_contract.joinGame({ value: entryFee });
            await tx.wait();
            setLoading(false);
        } catch (err) {
            console.log(err);
            setLoading(false);
        }
    };

    const getLotteryPool = async () => {
        try {
            const provider = await getProviderOrSigner();
            const balance = await provider.getBalance(lottery_address);
            setPool(balance);
        } catch (err) {
            console.log(err);
        }
    };

    const checkPlayerJoined = async (player) => {
        try {
            const signer = await getProviderOrSigner(true);
            const address = await signer.getAddress();
            player.forEach((addr) => {
                if (addr.toLowerCase() === address.toLowerCase()) {
                    setIsJoined(true);
                }
            });
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        if (!walletConnected) {
            web3ModalRef.current = new web3Modal({
                network: "mumbai",
                providerOptions: {},
                disableInjectedProvider: false,
            });
            connectWallet();
            getOwner();
            checkIfGameStarted();
            setInterval(() => {
                getLotteryPool();
                checkIfGameStarted();
            }, 1500);
        }
    }, [walletConnected]);

    const render = () => {
        if (!walletConnected) {
            return <button onClick={connectWallet}>Connect</button>;
        }
        if (loading) {
            return <p>Loading...</p>;
        }
        if (!gameStarted && isOwner) {
            return (
                <div>
                    <input
                        type="number"
                        placeholder="no of max players"
                        className="mx-2 rounded py-1"
                        onChange={(e) => {
                            setMaxPlayers(e.target.value || 0);
                        }}
                    />
                    <input
                        type="number"
                        placeholder="entry fee"
                        className="mx-2 rounded py-1"
                        onChange={(e) => {
                            setEntryFee(
                                utils.parseEther(
                                    e.target.value.toString() || "0"
                                )
                            );
                        }}
                    />
                    <button
                        onClick={startGame}
                        className="px-4 py-3 mx-auto my-5 block bg-gradient-to-r from-blue-400 to-pink-600 rounded shadow-lg shadow-pink-600/50 hover:from-pink-400 hover:to-blue-600 hover:shadow-blue-400/50 text-white"
                    >
                        start Game
                    </button>
                </div>
            );
        }
        if (gameStarted && !isJoined) {
            return (
                <button
                    className="px-4 py-3 mx-auto my-5 block bg-gradient-to-r from-blue-400 to-pink-600 rounded shadow-lg shadow-pink-600/50 hover:from-pink-400 hover:to-blue-600 hover:shadow-blue-400/50 text-white"
                    onClick={joinGame}
                >
                    join Game
                </button>
            );
        }
        if (isJoined) {
            return <p>you are already joined</p>;
        }
    };

    return (
        <div className="bg-[#b4d6d8]">
            <Head>
                <title>Lottery Dapp</title>
                <meta name="description" content="Decentralized Lottery app" />
            </Head>
            <div className="bg-[url('/bg.jpg')] bg-contain bg-right-bottom bg-no-repeat min-h-screen min-w-screen font-mono font-semibold text-center">
                <p className="font-sans font-bold text-3xl md:text-4xl py-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-pink-400">
                    Welcome to Random Picker Game!
                </p>
                <p className="pb-5">
                    Its a Lottery game where winner is picked at random and wins
                    the entire lottery pool
                </p>
                <p>Lottery pool : {utils.formatEther(pool)}</p>
                {render()}
                <div className="my-5">
                    {logs.map((item, i) => (
                        <p key={i}>{item}</p>
                    ))}
                </div>
            </div>
        </div>
    );
}
