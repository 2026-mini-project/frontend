import { useEffect, useRef, useState } from 'react';
import Transition from '../../../components/transition';
import css from './App.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDoorOpen } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom';
import REST from '../../../modules/rest';
import WebSocket from '../../../modules/WebSocket';

type ScreenProps = {
    transition: (to: "players" | "game" | "show" | "hide", waitUntil?: () => Promise<any>) => any,
    socket: WebSocket
};

function PlayersPage({ transition, socket }: ScreenProps & { players: APIUser[] }) {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<APIRoom>();

    const [players, setPlayers] = useState<APIUser[]>([]);

    useEffect(() => {
        (async () => {
            const r = await REST<APIRoom>("/rooms/" + id);
            if (!r.success) {
                alert(r.data.message);
                return window.history.back();
            }

            setRoom(r.data);

            await transition("show");
        })();
    }, []);

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
                <button className={css.createRoom} onClick={async () => {
                    socket.disconnect();
                    await transition("hide");
                    window.location.href = "/rooms";
                }}>
                    <FontAwesomeIcon icon={faDoorOpen} />
                    <span>방 나가기</span>
                </button>
            </div>
            <div className={css.roomList}>

            </div>
        </div>
    </>;
}

export default function Page() {
    const { id } = useParams() as { id: string };
    const socket = useRef<WebSocket>(new WebSocket());
    const [transition, setTransition] = useState(true);
    const [screen, setScreen] = useState<"players" | "game">("players");

    const interval = useRef<number>(-1);

    const [players, setPlayers] = useState<APIUser[]>([]);

    useEffect(() => {
        (async () => {
            const sessionId = localStorage.getItem("sessionId");
            if (!sessionId) {
                alert("세션 데이터를 찾을 수 없습니다.");
                window.location.href = "/";
                return;
            }

            socket.current = new WebSocket();

            socket.current.on("error", () => {
                alert("서버와의 연결에 오류가 발생했습니다.");
                window.location.href = "/";
            });
            socket.current.on("disconnect", (ev) => {
                if (ev.code === 1000) return;
                alert(`서버와의 연결이 끊어졌습니다. (${ev.code} ${ev.reason})`);
                window.location.href = "/";
            });
            socket.current.on("connected", async () => {
                await socket.current.send([
                    "identify",
                    {
                        sessionId
                    }
                ]);
            });
            socket.current.on("message", (data) => {
                const [op, payload] = data;

                if (op === "error") {
                    alert(payload.message);
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
                    setPlayers(payload);
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
        <Transition hide={transition} />
        {screen === "players" ?
            <PlayersPage
                transition={transitionFunc}
                socket={socket.current}
                players={players}
            /> :
            <></>
        }
    </>;
}