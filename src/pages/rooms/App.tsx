import { useEffect, useState } from 'react';
import Transition from '../../components/transition';
import css from './App.module.css';
import REST from '../../modules/rest';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDoorOpen, faPlay } from '@fortawesome/free-solid-svg-icons';

export default function Page() {
    const [loading, setLoading] = useState(true);
    const [needToRedirect, setNeedToRedirect] = useState(false);
    const [rooms, setRooms] = useState<APIRoom[]>([]);

    useEffect(() => {
        (async () => {
            const r = await REST<APIRoom[]>("/rooms");
            if (!r.success) {
                if (r.status === 404) {
                    setLoading(false);
                    return;
                }

                alert(r.data.message);
                return window.history.back();
            }

            setRooms(r.data);

            setLoading(false);
        })();
    }, []);

    return <>
        <Transition hide={loading} onAnimationEnd={() => {
            if (!needToRedirect) return;

            window.location.href = "/";
        }} />
        <div className={css.container}>
            <div className={css.header}>
                <div className={css.content}>
                    <span>당신의 닉네임:&nbsp;</span>
                    <b>{localStorage.getItem("name")}</b>
                    <button className={css.logout} onClick={async () => {
                        try {
                            const r = await REST("/session", {
                                "method": "DELETE"
                            });
                            if (!r.success) {
                                alert(r.data.message);
                                return;
                            }

                            localStorage.removeItem("sessionId");
                            localStorage.removeItem("name");
                            localStorage.removeItem("loginTime");

                            setLoading(true);
                            setNeedToRedirect(true);
                        } catch (err) {
                            alert((err as Error).message);
                        }
                    }}>
                        <FontAwesomeIcon icon={faDoorOpen} />
                    </button>
                </div>
                <button className={css.createRoom}>
                    <FontAwesomeIcon icon={faPlay} />
                    <span>방 만들기</span>
                </button>
            </div>
            <div className={css.roomList}>
                {rooms.map(v => <a
                    key={v.id}
                    className={css.room}
                    href={`/rooms/${v.id}`}
                    style={v.full ? { "pointerEvents": "none", "opacity": 0.5 } : {}}
                >
                    <span className={css.name}>{v.name}</span>
                    <span className={css.owner}>소유자: {v.owner}</span>
                </a>)}
            </div>
        </div>
    </>;
}