import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("typing-race-backend-cndrbfc5hedhcea6.southindia-01.azurewebsites.net", {
    transports: ["websocket", "polling"],
    reconnection: true,
});

function App() {
    const [players, setPlayers] = useState([]);
    const [raceStarted, setRaceStarted] = useState(false);
    const [raceText, setRaceText] = useState("");
    const [typedText, setTypedText] = useState("");
    const [progress, setProgress] = useState(0);
    const [playersProgress, setPlayersProgress] = useState({});
    const [winner, setWinner] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [playerName, setPlayerName] = useState("");
    const [hasJoined, setHasJoined] = useState(false);
    const [raceCompleted, setRaceCompleted] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        socket.on("connect", () => {
            console.log("Connected to server:", socket.id);
        });

        socket.on("updatePlayers", (playerList) => {
            setPlayers(playerList);
        });

        socket.on("countdown", (timeLeft) => {
            setCountdown(timeLeft);
            if (timeLeft === 0) {
                setRaceStarted(true);
                setCountdown(null);
            }
        });

        socket.on("raceStarted", ({ raceText }) => {
            console.log("🔥 Race started! Text to type:", raceText);
            setRaceText(raceText);
            setTypedText("");
            setProgress(0);
            setWinner(null);
            setRaceCompleted(false);
            setPlayersProgress({});
        });

        socket.on("progressUpdate", (playerList) => {
            console.log("📈 Progress Update:", playerList);
            setPlayersProgress(playerList);
        });

        socket.on("raceFinished", ({ winner }) => {
            setWinner(winner);
            setRaceStarted(false);
            setRaceCompleted(true);
            console.log("🔥 Race finished! Winner:", winner);

            // Fetch latest leaderboard after race ends
            socket.emit("getLeaderboard");
        });

        socket.on("leaderboardUpdate", (leaderboardData) => {
            console.log("🏆 Updated Leaderboard:", leaderboardData);
            setLeaderboard(leaderboardData);
        });

        socket.on("newRaceReady", ({ raceText }) => {
            console.log("🔄 New race text received:", raceText);
            setRaceText(raceText);
            setTypedText("");
            setProgress(0);
            setWinner(null);
            setRaceStarted(false);
            setRaceCompleted(false);
        });

        return () => {
            socket.off("connect");
            socket.off("updatePlayers");
            socket.off("countdown");
            socket.off("raceStarted");
            socket.off("progressUpdate");
            socket.off("raceFinished");
            socket.off("leaderboardUpdate");
            socket.off("newRaceReady");
        };
    }, []);

    const joinGame = () => {
        if (playerName.trim() !== "") {
            socket.emit("joinGame", { name: playerName });
            setHasJoined(true);
        }
    };

    const startRace = () => {
        socket.emit("startRace");
    };

    const retryRace = () => {
        socket.emit("retryRace");
    };

    const handleTyping = (e) => {
        const input = e.target.value;
        setTypedText(input);

        if (raceStarted && !raceCompleted) {
            const totalChars = raceText.length;
            const typedChars = input.length;
            const newProgress = Math.min((typedChars / totalChars) * 100, 100);
            setProgress(newProgress);

            socket.emit("updateProgress", { progress: newProgress, typedText: input });

            // ✅ Ensure text is correctly typed before finishing
            if (input.trim() === raceText.trim()) {
                console.log(`🎉 ${playerName} has completed typing perfectly!`);
                setRaceCompleted(true); // Prevents multiple submissions
            }
        }
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Multiplayer Typing Race</h1>

            {!hasJoined ? (
                <div>
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                    />
                    <button onClick={joinGame}>Join Game</button>
                </div>
            ) : (
                <>
                    <h2>Connected Players: {players.length}</h2>

                    {countdown !== null && <h2>Race starts in: {countdown} seconds</h2>}

                    {!raceStarted && !winner && !countdown && players.length > 1 && (
                        <button onClick={startRace}>Start Race</button>
                    )}

                    {raceStarted && (
                        <>
                            <h3>Type the following text:</h3>
                            <p>{raceText}</p>
                            <textarea
                                value={typedText}
                                onChange={handleTyping}
                                disabled={winner !== null}
                            />
                            <h4>Your Progress: {Math.round(progress)}%</h4>
                        </>
                    )}

                    {winner && <h2 style={{ color: "green" }}>🏆 Winner: {winner} 🎉</h2>}

                    {raceCompleted && <button onClick={retryRace}>🔄 Retry Race</button>}

                    {/* 🔥 Live Player Progress */}
                    <h3>Real-Time Progress</h3>
                    {Object.keys(playersProgress).length > 0 ? (
                        <ul>
                            {Object.entries(playersProgress).map(([id, player]) => (
                                <li key={id}>
                                    {player.name}: {Math.round(player.progress)}%
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No progress yet...</p>
                    )}

                    {/* 🔥 Leaderboard Section */}
                    <h3>🏆 Leaderboard</h3>
                    {leaderboard.length > 0 ? (
                        <table border="1" style={{ margin: "auto" }}>
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((entry, index) => (
                                    <tr key={index}>
                                        <td>{entry.player_name}</td>
                                        <td>{entry.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No leaderboard data yet...</p>
                    )}
                </>
            )}
        </div>
    );
}

export default App;
