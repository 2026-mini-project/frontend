import { useEffect, useState } from 'react';
import Transition from '../../components/transition';
import css from './App.module.css';
import REST from '../../modules/rest';

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
            
        </div>
    </>;
}