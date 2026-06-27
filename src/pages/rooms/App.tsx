import { useEffect, useState } from 'react';
import Transition from '../../components/transition';
import css from './App.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDoorOpen, faPlay } from '@fortawesome/free-solid-svg-icons';
import Form from '../../components/form';
import { Link } from 'react-router-dom';

export default function Page() {
    const [loading, setLoading] = useState(true);
    const [needToRedirect, setNeedToRedirect] = useState(false);
    const [rooms, setRooms] = useState<APIRoom[]>([]);
    const [showForm, setShowForm] = useState(false);

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
        <Form
            show={showForm}
            icon={faPlay}
            title="방 만들기"
            description='방 이름을 입력해 새롭게 방을 만들어요.'
            placeholder='방 이름'
            checkboxLabel='비밀방으로 만들기'
            onSubmit={async (data, checked) => {
                setShowForm(false);
                try {
                    const r = await REST<APIRoom>("/rooms", {
                        "method": "POST",
                        "data": {
                            "name": data,
                            "private": checked
                        },
                        "headers": {
                            "Content-Type": "application/json"
                        }
                    });
                    if (!r.success) throw new Error(`방 만들기에 실패했습니다. (${r.status})`);

                    window.location.href = `/rooms/${r.data.id}`;
                } catch (err) {
                    alert((err as Error).message);
                    return window.location.reload();
                }
            }}
            onCancel={() => setShowForm(false)}
            submitText="방 만들기"
        />
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
                <button className={css.createRoom} onClick={() => setShowForm(true)}>
                    <FontAwesomeIcon icon={faPlay} />
                    <span>방 만들기</span>
                </button>
            </div>
            <div className={css.roomList}>
                {rooms.map(v => <Link
                    key={v.id}
                    className={css.room}
                    to={`/rooms/${v.id}`}
                    style={v.full ? { "pointerEvents": "none", "opacity": 0.5 } : {}}
                >
                    <span className={css.name}>{v.name}</span>
                    <span className={css.owner}>소유자: {v.owner}</span>
                </Link>)}
            </div>
        </div>
    </>;
}
