import { useEffect, useRef, useState } from 'react';
import Transition from '../../../components/transition';
import css from './App.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDoorOpen } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom';
import REST from '../../../modules/rest';
import WebSocket from '../../../modules/WebSocket';

export default function Page() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<APIRoom>();
    const socket = useRef<WebSocket>(new WebSocket());
    const interval = useRef<number>(-1);

    useEffect(() => {
        (async () => {
            const r = await REST<APIRoom>("/rooms/" + id);
            if (!r.success) {
                alert(r.data.message);
                return window.history.back();
            }

            setRoom(r.data);

            socket.current = new WebSocket();

            socket.current.on("error", () => {
                alert("서버와의 연결에 오류가 발생했습니다.");
                window.location.href = "/";
            });
            socket.current.on("disconnect", (ev) => {
                alert(`서버와의 연결이 끊어졌습니다. (${ev.code} ${ev.reason})`);
                window.location.href = "/";
            });
            socket.current.on("connected", async () => {
                const sessionId = localStorage.getItem("sessionId");
                if (!sessionId) {
                    alert("세션 데이터를 찾을 수 없습니다.");
                    window.location.href = "/";
                    return;
                }

                await socket.current.send([
                    "identify",
                    {
                        sessionId
                    }
                ]);
            });
            socket.current.on("message", (data) => {
                const [op, payload] = data;

                if (op === "welcome") {
                    interval.current = setInterval(async () => {
                        await socket.current.send(["ping"]);
                    }, payload.pingInterval);
                }
            });

            await socket.current.connect();
        })();

        return () => clearInterval(interval.current);
    }, []);

    return <>
        <Transition hide={loading} />
        <div className={css.container}>
            <div className={css.header}>
                <div className={css.content}>
                    <span>당신의 닉네임:&nbsp;</span>
                    <b>{localStorage.getItem("name")}</b>
                </div>
                <button className={css.createRoom} onClick={async () => {
                    setLoading(true);
                    await new Promise(r => setTimeout(r, 480));

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
