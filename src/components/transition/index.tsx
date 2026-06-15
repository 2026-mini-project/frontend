import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import css from './styles.module.css';
import { useEffect, useState } from 'react';
import { animated, easings, useSpringValue } from '@react-spring/web';

type Props = {
    "hide": boolean,
    "onAnimationEnd"?: () => any
}

export default function Transition(props: Props) {
    const { hide, onAnimationEnd } = props;
    const [doNotRender, setDoNotRender] = useState(false);

    const containerOpacity = useSpringValue(hide ? 1 : 0, {
        "config": {
            "duration": 480,
            "easing": easings.easeInOutCubic
        }
    });

    useEffect(() => {
        (async () => {
            if (hide) {
                setDoNotRender(false);
                await containerOpacity.start(1);
            } else {
                await containerOpacity.start(0);
                setDoNotRender(true);
            }

            onAnimationEnd?.();
        })();
    }, [hide]);

    if (doNotRender) return null;

    return <animated.div
        className={css.container}
        style={{ "opacity": containerOpacity }}
    />;
}