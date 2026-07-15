import { useEffect, useMemo, useRef, useState } from 'react';
import Transition from '../../../components/transition';
import css from './App.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBomb, faCheck, faClose, faDoorOpen, faLink, faPlay, faTrophy, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useParams, type NavigateFunction } from 'react-router-dom';
import REST from '../../../modules/rest';
import WebSocket from '../../../modules/WebSocket';
import { animated, easings, useSprings } from '@react-spring/web';
import Dialog, { type DialogButton } from '../../../components/Dialog';
import { decodeBoard } from '../../../modules/base85';
import { BOARD_SIZE, cellKey, getAdjacentMineCount, resolveBoard, resolveFlags, type BoardMove } from '../../../modules/minesweeper';

const getSessionId = (navigate: NavigateFunction) => {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
        navigate("/rooms");
        return "";
    }

    return sessionId;
};

//#region PlayersPage
type ScreenProps = {
    transition: (to: "players" | "game" | "show" | "hide", waitUntil?: () => Promise<any>) => any,
    socket: WebSocket,
    setDialogIcon: React.Dispatch<React.SetStateAction<IconDefinition>>,
    setDialogTitle: React.Dispatch<React.SetStateAction<string>>,
    setDialogDescription: React.Dispatch<React.SetStateAction<string>>,
    setDialogButtons: React.Dispatch<React.SetStateAction<DialogButton[]>>,
    setDialogClosable: React.Dispatch<React.SetStateAction<boolean>>,
    setDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
};

function PlayersPage({ transition, socket, players, setDialogIcon, setDialogTitle, setDialogButtons, setDialogDescription, setDialogClosable, setDialogOpen }: ScreenProps & { players: APIUser[] }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState<APIRoom>();
    const hasShown = useRef(false);

    const [ellipsePulses, ellipsePulseApi] = useSprings(3, () => ({
        "opacity": 0.5,
        "config": {
            "duration": 500,
            "easing": easings.easeInOutSine
        }
    }));

    const [readyStatus, setReadyStatus] = useState<Record<"me" | "rival", boolean>>({
        "me": false,
        "rival": false
    });

    useEffect(() => {
        let cancelled = false;

        const runPulse = async () => {
            while (!cancelled) {
                for (let activeIndex = 0; activeIndex < 3; activeIndex++) {
                    await Promise.all(ellipsePulseApi.start(index => ({
                        "opacity": index <= activeIndex ? 1 : 0.5,
                        "delay": 0,
                        "config": {
                            "duration": 500,
                            "easing": easings.easeInOutSine
                        }
                    })));

                    if (cancelled) return;
                    await new Promise(resolve => setTimeout(resolve, 100));
                    if (cancelled) return;
                }

                await Promise.all(ellipsePulseApi.start({
                    "opacity": 0.5,
                    "delay": 0,
                    "config": {
                        "duration": 500,
                        "easing": easings.easeInOutSine
                    }
                }));
            }
        };

        runPulse();

        return () => {
            cancelled = true;
            ellipsePulseApi.stop();
        };
    }, [ellipsePulseApi]);

    useEffect(() => {
        (async () => {
            const r = await REST<APIRoom>("/rooms/" + id);
            if (!r.success) {
                await new Promise<void>(resolve => {
                    setDialogIcon(faClose);
                    setDialogTitle("오류");
                    setDialogDescription(r.data.message);
                    setDialogButtons([{ "name": "확인", "onClick": () => { setDialogOpen(false); resolve(); } }]);
                    setDialogClosable(false);
                    setDialogOpen(true);
                });

                if (r.status === 404) {
                    await transition("hide");
                    window.location.replace("/rooms");
                    return;
                }

                window.history.back();
                return;
            }

            setRoom(r.data);
        })();
    }, []);

    useEffect(() => {
        const sessionId = getSessionId(navigate);

        const events = [
            socket.on("message", (data) => {
                const [op, payload] = data;
                if (op !== "ready" && op !== "cancelReady") return;

                let key = sessionId === payload.id ? "me" : "rival";

                setReadyStatus(v => ({
                    ...v,
                    [key]: op === "ready"
                }));
            })
        ];

        return () => events.forEach(e => e());
    }, []);

    useEffect(() => {
        if (!room || players.length <= 0 || hasShown.current) return;

        hasShown.current = true;
        transition("show");
    }, [players.length, room, transition]);

    if (!room || players.length <= 0) return null;
    const sessionId = localStorage.getItem("sessionId");
    const me = players.find(player => player.id === sessionId);
    const isRoomOwner = room.owner === me?.name;
    const canStartGame = isRoomOwner && readyStatus["me"] && readyStatus["rival"];

    return <>
        <div className={css.container}>
            <div className={css.header}>
                <div className={css.content}>
                    <div>
                        <span>방 이름:&nbsp;</span>
                        <b>{room?.name}</b>
                    </div>
                    <div>
                        <span style={{ "opacity": 0.75, "fontSize": 15 }}>{localStorage.getItem("name")}</span>
                    </div>
                </div>
                <button className={css.leaveRoom} onClick={async () => {
                    socket.disconnect();
                    await transition("hide");
                    navigate("/rooms", { "replace": true });
                }}>
                    <FontAwesomeIcon icon={faDoorOpen} />
                    <span>방 나가기</span>
                </button>
            </div>
            <div className={css.center}>
                <div className={css.players}>
                    <div className={css.playerContainer}>
                        <span>나</span>
                        <div className={css.player}>
                            <span className={css.name}>{players[0].name}</span>
                            {readyStatus["me"] ? <button className={css.cancelReady} onClick={() => socket.send(["cancelReady"])}>
                                <FontAwesomeIcon icon={faClose} />
                                <span>준비 취소</span>
                            </button> : <button className={css.ready} onClick={() => socket.send(["ready"])}>
                                <FontAwesomeIcon icon={faCheck} />
                                <span>준비</span>
                            </button>}
                        </div>
                    </div>
                    <div className={css.circles}>
                        <animated.div className={css.circle} style={ellipsePulses[0]} />
                        <animated.div className={css.circle} style={ellipsePulses[1]} />
                        <animated.div className={css.circle} style={ellipsePulses[2]} />
                    </div>
                    <div className={css.playerContainer}>
                        <span>상대</span>
                        <div className={css.player} style={{ "opacity": players[1]?.name ? 1 : 0.5, "pointerEvents": "none" }}>
                            <span className={css.name}>{players[1]?.name ?? "대기 중..."}</span>
                            {readyStatus["rival"] ? <button className={css.ready} style={{ "opacity": 0.5 }}>
                                <FontAwesomeIcon icon={faCheck} />
                                <span>준비됨</span>
                            </button> : <button className={css.ready} style={{ "opacity": 0.5 }}>
                                <FontAwesomeIcon icon={faClose} />
                                <span>준비 안됨</span>
                            </button>}
                        </div>
                    </div>
                </div>
                <div className={css.controls}>
                    <button
                        className={css.startGame}
                        onClick={() => canStartGame && socket.send(["startGame"])}
                        style={{
                            "pointerEvents": canStartGame ? "auto" : "none",
                            "opacity": canStartGame ? 1 : 0.5
                        }}
                    >
                        <FontAwesomeIcon icon={faPlay} />
                        <span>{isRoomOwner ? "게임 시작" : "방장 시작 대기"}</span>
                    </button>
                    <button
                        className={css.invite}
                        onClick={async () => {
                            await navigator.clipboard.writeText(`https://miniproj.pro203s.kr/rooms/${id}`);
                            setDialogIcon(faLink);
                            setDialogTitle("링크 복사");
                            setDialogDescription("링크가 복사됐어요.\n붙여넣기해서 초대해요.");
                            setDialogButtons([{ "name": "확인", "onClick": () => { setDialogOpen(false) } }]);
                            setDialogClosable(true);
                            setDialogOpen(true);
                        }}
                    >
                        <FontAwesomeIcon icon={faLink} />
                        <span>게임에 초대</span>
                    </button>
                </div>
            </div>
        </div>
    </>;
}
//#endregion

//#region GamePage
type GamePageProps = ScreenProps & {
    players: APIUser[];
    encodedBoard?: string;
    turnUserId?: string;
    boardClicks: BoardMove[];
    flagMoves: BoardMove[];
    winner?: APIUser;
    gameErrorVersion: number;
};

function GamePage({
    transition,
    socket,
    players,
    encodedBoard,
    turnUserId,
    boardClicks,
    flagMoves,
    winner,
    gameErrorVersion,
    setDialogIcon,
    setDialogTitle,
    setDialogButtons,
    setDialogDescription,
    setDialogClosable,
    setDialogOpen,
}: GamePageProps) {
    const { id } = useParams();
    const navigate = useNavigate();
    const sessionId = localStorage.getItem("sessionId") ?? "";
    const [room, setRoom] = useState<APIRoom>();
    const [localReveals, setLocalReveals] = useState<BoardMove[]>([]);
    const [pendingMove, setPendingMove] = useState<{
        type: "flag" | "mine";
        x: number;
        y: number;
    } | null>(null);
    const reportedOutcome = useRef<string | undefined>(undefined);
    const shownResult = useRef<string | undefined>(undefined);
    const shownBoardError = useRef(false);

    const decoded = useMemo(() => {
        if (!encodedBoard) return { board: null, error: null };

        try {
            return { board: decodeBoard(encodedBoard, BOARD_SIZE), error: null };
        } catch (error) {
            return {
                board: null,
                error: error instanceof Error ? error.message : "보드 데이터를 읽지 못했어요.",
            };
        }
    }, [encodedBoard]);

    const resolved = useMemo(
        () => decoded.board ? resolveBoard(decoded.board, [...localReveals, ...boardClicks]) : null,
        [boardClicks, decoded.board, localReveals],
    );
    const resolvedFlags = useMemo(
        () => decoded.board ? resolveFlags(decoded.board, flagMoves) : null,
        [decoded.board, flagMoves],
    );

    const rival = players.find(player => player.id !== sessionId);
    const mineCount = decoded.board?.reduce(
        (total, row) => total + row.filter(Boolean).length,
        0,
    ) ?? 0;
    const losingPlayerId = resolvedFlags?.wrongFlag?.by ?? resolved?.exploded?.by;
    const proposedWinnerId = losingPlayerId
        ? players.find(player => player.id !== losingPlayerId)?.id ?? null
        : resolvedFlags?.completingPlayerId ?? null;
    const isResolving = Boolean(proposedWinnerId && !winner);
    const isGameOver = Boolean(proposedWinnerId || winner);
    const isMyTurn = turnUserId === sessionId && !isGameOver;
    const currentPlayer = players.find(player => player.id === turnUserId);
    const myFlagCount = resolvedFlags
        ? Array.from(resolvedFlags.flaggedBy.values()).filter(playerId => playerId === sessionId).length
        : 0;
    const rivalFlagCount = resolvedFlags
        ? Array.from(resolvedFlags.flaggedBy.values()).filter(playerId => playerId === rival?.id).length
        : 0;

    useEffect(() => {
        (async () => {
            const response = await REST<APIRoom>("/rooms/" + id);
            if (response.success) {
                setRoom(response.data);
            }
        })();
    }, [id]);

    useEffect(() => {
        if (!decoded.error || shownBoardError.current) return;

        shownBoardError.current = true;
        setDialogIcon(faBomb);
        setDialogTitle("보드 오류");
        setDialogDescription(decoded.error);
        setDialogButtons([{
            "name": "방 나가기",
            "onClick": () => {
                setDialogOpen(false);
                socket.disconnect();
                navigate("/rooms", { "replace": true });
            }
        }]);
        setDialogClosable(false);
        setDialogOpen(true);
    }, [decoded.error, navigate, setDialogButtons, setDialogClosable, setDialogDescription, setDialogIcon, setDialogOpen, socket]);

    useEffect(() => {
        if (!pendingMove) return;

        const acceptedMoves = pendingMove.type === "flag" ? flagMoves : boardClicks;
        const moveWasAccepted = acceptedMoves.some(move => (
            move.x === pendingMove.x
            && move.y === pendingMove.y
            && move.by === sessionId
        ));

        if (moveWasAccepted || turnUserId !== sessionId) {
            setPendingMove(null);
        }
    }, [boardClicks, flagMoves, pendingMove, sessionId, turnUserId]);

    useEffect(() => {
        setPendingMove(null);
    }, [gameErrorVersion]);

    useEffect(() => {
        if (!proposedWinnerId || winner || proposedWinnerId !== sessionId) return;

        const outcomeKey = `${boardClicks.length}:${flagMoves.length}:${proposedWinnerId}`;
        if (reportedOutcome.current === outcomeKey) return;

        reportedOutcome.current = outcomeKey;
        socket.send(["gameClear"]).catch(() => {
            reportedOutcome.current = undefined;
        });
    }, [boardClicks.length, flagMoves.length, proposedWinnerId, sessionId, socket, winner]);

    useEffect(() => {
        if (!winner || shownResult.current === winner.id) return;

        shownResult.current = winner.id;
        const didWin = winner.id === sessionId;
        setDialogIcon(didWin ? faTrophy : faBomb);
        setDialogTitle(didWin ? "승리!" : "패배");
        setDialogDescription(didWin
            ? "상대를 꺾으시고 승리하셨어요!"
            : `${winner.name} 님이 이번 게임에서 승리했어요.`
        );
        setDialogButtons([{
            "name": "대기실로",
            "onClick": async () => {
                setDialogOpen(false);
                await transition("players");
            }
        }]);
        setDialogClosable(false);
        setDialogOpen(true);
    }, [sessionId, setDialogButtons, setDialogClosable, setDialogDescription, setDialogIcon, setDialogOpen, transition, winner]);

    const statusText = winner
        ? "게임 종료"
        : isResolving
            ? "결과 확인 중..."
            : !decoded.board || !turnUserId
                ? "게임 준비 중..."
                : isMyTurn
                    ? "내 차례"
                    : `${currentPlayer?.name ?? "상대"} 차례`;

    return <div className={css.container}>
        <div className={css.header}>
            <div className={css.content}>
                <div className={css.roomTitle}>
                    <span>방 이름:&nbsp;</span>
                    <span className={css.roomName}>{room?.name ?? "불러오는 중..."}</span>
                </div>
                <div>
                    <span style={{ "opacity": 0.75, "fontSize": 15 }}>{localStorage.getItem("name")}</span>
                </div>
            </div>
            <button className={css.leaveRoom} onClick={async () => {
                socket.disconnect();
                await transition("hide");
                navigate("/rooms", { "replace": true });
            }}>
                <span className={css.leaveRoomIcon}>🚪</span>
                <span>방 나가기</span>
            </button>
        </div>

        <div className={css.gameCenter}>
            <div className={css.gameStatus}>
                <div className={`${css.gamePlayer} ${isMyTurn ? css.activePlayer : ""}`}>
                    <span className={css.playerLabel}>나</span>
                    <span className={css.gamePlayerName}>{players.find(player => player.id === sessionId)?.name ?? "나"}</span>
                    <span>{myFlagCount}개 발견</span>
                </div>

                <div className={`${css.turnBadge} ${isMyTurn ? css.myTurn : ""}`}>
                    {statusText}
                </div>

                <div className={`${css.gamePlayer} ${turnUserId === rival?.id && !isGameOver ? css.activePlayer : ""}`}>
                    <span className={css.playerLabel}>상대</span>
                    <span className={css.gamePlayerName}>{rival?.name ?? "상대"}</span>
                    <span>{rivalFlagCount}개 발견</span>
                </div>
            </div>

            <div className={css.boardFrame}>
                <div className={css.boardMeta}>
                    <span>내가 연 안전 칸 <span className={css.boardMetaValue}>{resolved?.revealedSafeCount ?? 0}/{resolved?.safeCellCount ?? 0}</span></span>
                    <span>남은 지뢰 <span className={css.boardMetaValue}>{Math.max(0, mineCount - (resolvedFlags?.correctFlagCount ?? 0))}</span></span>
                </div>

                {decoded.board && resolved ? <div
                    className={css.board}
                    style={{ "--board-size": decoded.board.length } as React.CSSProperties}
                >
                    {decoded.board.map((row, y) => row.map((isMine, x) => {
                        const key = cellKey(x, y);
                        const revealedBy = resolved.revealedBy.get(key);
                        const isRevealed = Boolean(revealedBy);
                        const flaggedBy = resolvedFlags?.flaggedBy.get(key);
                        const isFlagged = Boolean(flaggedBy);
                        const isWrongFlag = resolvedFlags?.wrongFlag?.x === x && resolvedFlags.wrongFlag.y === y;
                        const isExploded = resolved.exploded?.x === x && resolved.exploded.y === y;
                        const showMine = isMine && !isFlagged && (isRevealed || Boolean(winner));
                        const adjacentMines = getAdjacentMineCount(decoded.board!, x, y);
                        const isPending = pendingMove?.x === x && pendingMove.y === y;
                        const classes = [
                            css.boardCell,
                            isRevealed ? css.revealedCell : "",
                            isExploded ? css.explodedCell : "",
                            isWrongFlag ? css.wrongFlagCell : "",
                            isPending ? css.pendingCell : "",
                            revealedBy === sessionId || flaggedBy === sessionId ? css.myCell : "",
                            (revealedBy && revealedBy !== sessionId) || (flaggedBy && flaggedBy !== sessionId) ? css.rivalCell : "",
                        ].filter(Boolean).join(" ");

                        return <button
                            type="button"
                            key={key}
                            className={classes}
                            disabled={isRevealed || isFlagged || Boolean(winner)}
                            onContextMenu={event => {
                                event.preventDefault();
                                if (!isMyTurn || isRevealed || isFlagged || isGameOver || pendingMove) return;

                                setPendingMove({ type: "flag", x, y });
                                socket.send(["flag", { x, y }]).catch(() => {
                                    setPendingMove(null);
                                });
                            }}
                            onClick={event => {
                                if (!isMyTurn || isGameOver || pendingMove || isFlagged || isRevealed) return;

                                if (event.shiftKey) {
                                    setPendingMove({ type: "flag", x, y });
                                    socket.send(["flag", { x, y }]).catch(() => {
                                        setPendingMove(null);
                                    });
                                    return;
                                }

                                if (isMine) {
                                    setPendingMove({ type: "mine", x, y });
                                    socket.send(["boardClick", { x, y }]).catch(() => {
                                        setPendingMove(null);
                                    });
                                    return;
                                }

                                setLocalReveals(current => current.some(move => move.x === x && move.y === y)
                                    ? current
                                    : [...current, { x, y, by: sessionId }]
                                );
                            }}
                        >
                            {showMine ? <span className={`${css.cellIcon} ${css.mineIcon}`} /> : null}
                            {isFlagged ? <span className={`${css.cellIcon} ${css.flagIcon}`} /> : null}
                            {!showMine && !isFlagged && isRevealed && adjacentMines > 0 ? <span
                                className={css.cellNumber}
                                data-number={adjacentMines}
                            >{adjacentMines}</span> : null}
                        </button>;
                    }))}
                </div> : <div className={css.boardLoading}>
                    <span className={css.boardLoadingIcon} />
                    <span>{decoded.error ? "보드를 불러오지 못했어요." : "보드를 만들고 있어요..."}</span>
                </div>}
            </div>

            <div className={css.gameHint}>
                내 차례에는 안전 칸을 계속 열 수 있어요. 우클릭으로 깃발을 확정하면 턴이 넘어가며, 잘못된 깃발은 즉시 패배해요.
            </div>
        </div>
    </div>;
}

//#endregion

export default function Page() {
    const { id } = useParams() as { id: string };
    const socket = useRef<WebSocket>(new WebSocket());
    const [transition, setTransition] = useState(true);
    const [screen, setScreen] = useState<"players" | "game">("players");
    const navigate = useNavigate();

    const interval = useRef<number>(-1);

    const [players, setPlayers] = useState<APIUser[]>([]);
    const [encodedBoard, setEncodedBoard] = useState<string>();
    const [turnUserId, setTurnUserId] = useState<string>();
    const [boardClicks, setBoardClicks] = useState<BoardMove[]>([]);
    const [flagMoves, setFlagMoves] = useState<BoardMove[]>([]);
    const [winner, setWinner] = useState<APIUser>();
    const [gameErrorVersion, setGameErrorVersion] = useState(0);

    const [dialogIcon, setDialogIcon] = useState(faClose);
    const [dialogTitle, setDialogTitle] = useState("");
    const [dialogDescription, setDialogDescription] = useState("");
    const [dialogButtons, setDialogButtons] = useState<DialogButton[]>([]);
    const [dialogClosable, setDialogClosable] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const dialogProps = {
        setDialogIcon,
        setDialogTitle,
        setDialogDescription,
        setDialogButtons,
        setDialogClosable,
        setDialogOpen
    };

    useEffect(() => {
        const events: Array<() => void> = [];

        (async () => {
            const sessionId = getSessionId(navigate);

            events.push(socket.current.on("error", async () => {
                await new Promise<void>(resolve => {
                    setDialogIcon(faClose);
                    setDialogTitle("오류");
                    setDialogDescription("서버와의 연결에 오류가 발생했어요.");
                    setDialogButtons([{ "name": "확인", "onClick": () => { setDialogOpen(false); resolve() } }]);
                    setDialogClosable(false);
                    setDialogOpen(true);
                });
                window.location.href = "/";
            }));
            events.push(socket.current.on("disconnect", async (ev) => {
                if (ev.code === 1000) return;
                await new Promise<void>(resolve => {
                    setDialogIcon(faClose);
                    setDialogTitle("오류");
                    setDialogDescription("서버와의 연결이 끊어졌습니다.");
                    setDialogButtons([{ "name": "확인", "onClick": () => { setDialogOpen(false); resolve() } }]);
                    setDialogClosable(false);
                    setDialogOpen(true);
                });
                setTransition(true);
                await new Promise(resolve => setTimeout(resolve, 480));
                window.location.replace("/rooms");
            }));
            events.push(socket.current.on("connected", async () => {
                await socket.current.send([
                    "identify",
                    {
                        sessionId
                    }
                ]);
            }));
            events.push(socket.current.on("message", async (data) => {
                const [op, payload] = data;

                if (op === "error") {
                    const isFatalError = payload.message.includes("인증")
                        || payload.message.includes("identify")
                        || payload.message.includes("방을 찾을 수 없습니다");

                    if (!isFatalError) {
                        setGameErrorVersion(version => version + 1);
                        setDialogIcon(faClose);
                        setDialogTitle("알림");
                        setDialogDescription(payload.message);
                        setDialogButtons([{
                            "name": "확인",
                            "onClick": () => setDialogOpen(false)
                        }]);
                        setDialogClosable(true);
                        setDialogOpen(true);
                        return;
                    }

                    await new Promise<void>(resolve => {
                        setDialogIcon(faClose);
                        setDialogTitle("오류");
                        setDialogDescription(payload.message);
                        setDialogButtons([{ "name": "확인", "onClick": () => {
                            setDialogOpen(false);
                            resolve();
                        } }]);
                        setDialogClosable(false);
                        setDialogOpen(true);
                    });
                    window.history.back();
                    return;
                }

                if (op === "welcome") {
                    interval.current = setInterval(async () => {
                        await socket.current.send(["ping"]);
                    }, payload.pingInterval);

                    socket.current.send([
                        "join",
                        {
                            "id": id
                        }
                    ]);
                    return;
                }

                if (op === "joined") {
                    setPlayers([...payload].sort((a, b) => (
                        Number(b.id === sessionId) - Number(a.id === sessionId)
                    )));
                    return;
                }

                if (op === "gameStarted") {
                    setEncodedBoard(undefined);
                    setTurnUserId(undefined);
                    setBoardClicks([]);
                    setFlagMoves([]);
                    setWinner(undefined);
                    setTransition(true);
                    await new Promise(resolve => setTimeout(resolve, 480));
                    setScreen("game");
                    setTransition(false);
                    return;
                }

                if (op === "gameBoard") {
                    setEncodedBoard(payload.data);
                    return;
                }

                if (op === "turn") {
                    setTurnUserId(payload.userId);
                    return;
                }

                if (op === "boardClick") {
                    setBoardClicks(current => {
                        if (current.some(move => move.x === payload.x && move.y === payload.y)) {
                            return current;
                        }

                        return [...current, payload];
                    });
                    return;
                }

                if (op === "flag") {
                    setFlagMoves(current => {
                        if (current.some(move => move.x === payload.x && move.y === payload.y)) {
                            return current;
                        }

                        return [...current, payload];
                    });
                    return;
                }

                if (op === "gameClear") {
                    setWinner(payload.winner);
                    return;
                }
            }));

            await socket.current.connect();
        })();

        return () => {
            clearInterval(interval.current);
            events.forEach(removeEvent => removeEvent());
            socket.current.disconnect();
        };
    }, []);

    const transitionFunc: ScreenProps["transition"] = async (to, waitUntil) => {
        if (to === "hide") {
            setTransition(true);
            return waitUntil ? waitUntil() : new Promise(r => setTimeout(r, 480));
        }

        if (to === "show") {
            setTransition(false);
            return new Promise(r => setTimeout(r, 480));
        }

        if (to === "players") {
            setTransition(true);
            await new Promise(r => setTimeout(r, 480));
            setScreen("players");
            await waitUntil?.();
            return;
        }

        if (to === "game") {
            setTransition(true);
            await new Promise(r => setTimeout(r, 480));
            setScreen("game");
            return new Promise<void>(async resolve => {
                await waitUntil?.();
                setTransition(false);
                await new Promise(r => setTimeout(r, 480));
                resolve();
            });
        }
    };

    return <>
        <Dialog
            icon={dialogIcon}
            title={dialogTitle}
            description={dialogDescription}
            buttons={dialogButtons}
            onCancel={() => dialogClosable && setDialogOpen(false)}
            show={dialogOpen}
        />
        <Transition hide={transition} />
        {screen === "players" ?
            <PlayersPage
                transition={transitionFunc}
                socket={socket.current}
                players={players}
                {...dialogProps}
            /> :
            <GamePage
                transition={transitionFunc}
                socket={socket.current}
                players={players}
                encodedBoard={encodedBoard}
                turnUserId={turnUserId}
                boardClicks={boardClicks}
                flagMoves={flagMoves}
                winner={winner}
                gameErrorVersion={gameErrorVersion}
                {...dialogProps}
            />
        }
    </>;
}
