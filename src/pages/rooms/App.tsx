import { useEffect, useState } from 'react';
import Transition from '../../components/transition';
import css from './App.module.css';
import REST from '../../modules/rest';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';

export default function Page() {
    const [loading, setLoading] = useState(true);
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
        <Transition hide={loading} />
        <div className={css.container}>
            <div className={css.header}>
                <div className={css.content}>
                    <span>당신의 닉네임: {localStorage.getItem("name")}</span>
                </div>
                <button className={css.createRoom}>
                    <FontAwesomeIcon icon={faPlay} />
                    <span>방 만들기</span>
                </button>
            </div>
        </div>
    </>;
}