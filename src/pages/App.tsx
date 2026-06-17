import css from './App.module.css';
import { useEffect, useRef, useState } from 'react';
import Transition from '../components/transition';
import { animated, easings, useSpringValue } from '@react-spring/web';
import REST from '../modules/rest';

export default function Page() {
    const [isLoading, setIsLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [needRedirect, setNeedRedirect] = useState(false);
    const [error, setError] = useState<string>();
    const inputRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const opacity = useSpringValue(1, {
        "config": {
            "easing": easings.easeInOutCubic,
            "duration": 480
        }
    });

    useEffect(() => {
        (async () => {
            const r = await REST("/");
            if (!r.success) {
                alert("현재 서버를 사용할 수 없습니다.\n나중에 다시 시도 해주세요.");
                return;
            }
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
        <Transition hide={isLoading} onAnimationEnd={() => {
            if (!needRedirect) return;

            location.href = "/rooms";
        }} />
        <animated.div className={css.form} style={{
            opacity,
            "pointerEvents": isFetching ? "none" : "auto"
        }}>
            <div className={css.linearV}>
                <img src="/mine.png" className={css.icon} draggable={false} />
                <span className={css.title}>환영합니다!</span>
            </div>
            <span className={css.desc}>사용할 닉네임을 입력해주세요.</span>
            <input
                className={css.input}
                type="text"
                placeholder="닉네임 입력"
                ref={inputRef}
                onKeyDown={(ev) => (ev.key === "Enter" && buttonRef.current) && buttonRef.current.click()}
                defaultValue={localStorage.getItem("name") ?? undefined}
            />
            {error && <span className={css.desc} style={{ "color": "#d00" }}>{error}</span>}
            <button className={css.button} ref={buttonRef} onClick={async () => {
                try {
                    if (!inputRef.current) {
                        return window.location.reload();
                    }
                    const { value } = inputRef.current;
                    if (!value) throw new Error("닉네임을 입력해주세요.");
                    if (value.length < 4) throw new Error("닉네임은 4글자 이상 입력해주세요.");

                    setIsFetching(true);

                    const r = await REST<APIUser>("/session", {
                        "method": "POST",
                        "data": {
                            "name": value
                        }
                    });
                    if (!r.success) throw new Error(r.data.message);

                    localStorage.setItem("sessionId", r.data.id);
                    localStorage.setItem("name", r.data.name);

                    setNeedRedirect(true);
                    setIsLoading(true);
                } catch (err) {
                    setError((err as Error).message);
                    setIsFetching(false);
                }
            }}>이 닉네임 사용</button>
        </animated.div>
    </>;
}