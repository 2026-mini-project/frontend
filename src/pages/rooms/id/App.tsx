import { useEffect, useState } from 'react';
import Transition from '../../../components/transition';
import css from './App.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDoorOpen } from '@fortawesome/free-solid-svg-icons';
import { useParams } from 'react-router-dom';
import REST from '../../../modules/rest';

export default function Page() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<APIRoom>();

    useEffect(() => {
        (async () => {
            const r = await REST<APIRoom>("/rooms/" + id);
            if (!r.success) {
                if (r.status === 404) {
                    setLoading(false);
                    return;
                }

                alert(r.data.message);
                return window.history.back();
            }

            setRoom(r.data);
            setLoading(false);
        })();
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
