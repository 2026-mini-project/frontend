import { useEffect, useState } from 'react';
import Transition from '../../components/transition';
import css from './App.module.css';

export default function Page() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            await new Promise(r => setTimeout(r, 1000));
            setLoading(false);
        })();
    }, []);

    return <>
        <Transition hide={loading} />
        <div className={css.container}>

        </div>
    </>;
}