import { useEffect, useRef, useState } from 'react';
import Transition from '../../../components/transition';
import css from './App.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faClose, faDoorOpen, faLink, faPlay, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useParams, type NavigateFunction } from 'react-router-dom';
import REST from '../../../modules/rest';
import WebSocket from '../../../modules/WebSocket';
import { animated, easings, useSprings } from '@react-spring/web';
import Dialog, { type DialogButton } from '../../../components/Dialog';

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

const getSessionId = (navigate: NavigateFunction) => {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
        navigate("/rooms");
        return "";
    }

    return sessionId;
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
                    setDialogButtons([{ "name": "확인", "onClick": () => { resolve() } }]);
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
                        onClick={() => {

                        }}
                        style={{
                            "pointerEvents": readyStatus["me"] && readyStatus["rival"] ? "auto" : "none",
                            "opacity": readyStatus["me"] && readyStatus["rival"] ? 1 : 0.5
                        }}
                    >
                        <FontAwesomeIcon icon={faPlay} />
                        <span>게임 시작</span>
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

export default function Page() {
    const { id } = useParams() as { id: string };
    const socket = useRef<WebSocket>(new WebSocket());
    const [transition, setTransition] = useState(true);
    const [screen, setScreen] = useState<"players" | "game">("players");
    const navigate = useNavigate();

    const interval = useRef<number>(-1);

    const [players, setPlayers] = useState<APIUser[]>([]);

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
        (async () => {
            const sessionId = getSessionId(navigate);

            socket.current.on("error", async () => {
                await new Promise<void>(resolve => {
                    setDialogIcon(faClose);
                    setDialogTitle("오류");
                    setDialogDescription("서버와의 연결에 오류가 발생했어요.");
                    setDialogButtons([{ "name": "확인", "onClick": () => { resolve() } }]);
                    setDialogClosable(false);
                    setDialogOpen(true);
                });
                window.location.href = "/";
            });
            socket.current.on("disconnect", async (ev) => {
                if (ev.code === 1000) return;
                await new Promise<void>(resolve => {
                    setDialogIcon(faClose);
                    setDialogTitle("오류");
                    setDialogDescription("서버와의 연결이 끊어졌습니다.");
                    setDialogButtons([{ "name": "확인", "onClick": () => { resolve() } }]);
                    setDialogClosable(false);
                    setDialogOpen(true);
                });
                setTransition(true);
                await new Promise(resolve => setTimeout(resolve, 480));
                window.location.replace("/rooms");
            });
            socket.current.on("connected", async () => {
                await socket.current.send([
                    "identify",
                    {
                        sessionId
                    }
                ]);
            });
            socket.current.on("message", async (data) => {
                const [op, payload] = data;

                if (op === "error") {
                    await new Promise<void>(resolve => {
                        setDialogIcon(faClose);
                        setDialogTitle("오류");
                        setDialogDescription(payload.message);
                        setDialogButtons([{ "name": "확인", "onClick": () => { resolve() } }]);
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
                    setPlayers(payload.sort(a => a.id === sessionId ? -1 : 0));
                    return;
                }


            });

            await socket.current.connect();
        })();

        return () => clearInterval(interval.current);
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
            return new Promise<void>(async resolve => {
                await waitUntil?.();
                setTransition(false);
                await new Promise(r => setTimeout(r, 480));
                resolve();
            });
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
            <></>
        }
    </>;
}
