import css from './App.module.css';
import { useEffect, useState } from 'react';
import Transition from '../components/transition';
import { animated, easings, useSpringValue } from '@react-spring/web';

export default function Page() {
    const [isLoading, setIsLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState<string>();

    const opacity = useSpringValue(1, {
        "config": {
            "easing": easings.easeInOutCubic,
            "duration": 480
        }
    });

    useEffect(() => {
        (async () => {
            // 여기에 GET /
            await new Promise(r => setTimeout(r, 1000));
            setIsLoading(false);
        })();
    }, []);

    useEffect(() => {
        (async () => {
            if (isFetching) {
                await opacity.start(0.5);
            } else {
                await opacity.start(1);
            }
        })();
    }, [isFetching]);

    return <>
        <Transition hide={isLoading} />
        <animated.div className={css.form} style={{
            opacity,
            "pointerEvents": isFetching ? "none" : "auto"
        }}>
            <div className={css.linearV}>
                <img src="/mine.png" className={css.icon} draggable={false} />
                <span className={css.title}>환영합니다!</span>
            </div>
            <span className={css.desc}>사용할 닉네임을 입력해주세요.</span>
            <input className={css.input} type="text" placeholder="닉네임 입력" />
            {error && <span className={css.desc} style={{ "color": "#d00" }}>{error}</span>}
            <button className={css.button} onClick={async () => {
                try {
                    setIsFetching(true);
                    // 서버에 세션 ID 요청

                    location.href = "/rooms";
                } catch (err) {
                    setError((err as Error).message);
                    setIsFetching(false);
                }
            }}>이 닉네임 사용</button>
        </animated.div>
    </>;
}