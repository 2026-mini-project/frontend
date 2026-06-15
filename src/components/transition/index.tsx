import css from './styles.module.css';
import { useEffect, useRef, useState } from 'react';
import { animated, easings, useSpringValue } from '@react-spring/web';

type Props = {
    "hide": boolean,
    "onAnimationEnd"?: () => any
}

export default function Transition(props: Props) {
    const { hide, onAnimationEnd } = props;
    const [doNotRender, setDoNotRender] = useState(!hide);
    const isFirstRender = useRef(true);

    const panelX = useSpringValue(hide ? '-18vw' : '115vw', {
        "config": {
            "duration": 480,
            "easing": easings.easeInOutCubic
        }
    });

    useEffect(() => {
        (async () => {
            if (hide) {
                setDoNotRender(false);
                if (isFirstRender.current) {
                    panelX.set('-18vw');
                } else {
                    panelX.set('115vw');
                    await panelX.start('-18vw');
                }
            } else {
                await panelX.start('115vw');
                setDoNotRender(true);
            }

            isFirstRender.current = false;
            onAnimationEnd?.();
        })();
    }, [hide]);

    if (doNotRender) return null;

    return <animated.div
        className={css.container}
        style={{ "transform": panelX.to(x => `translateX(${x})`) }}
    />;
}
