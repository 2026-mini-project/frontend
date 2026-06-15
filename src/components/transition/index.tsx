import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import css from './styles.module.css';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import { animated, easings, useSpringValue } from '@react-spring/web';

type Props = {
    "hide": boolean,
    "loading"?: boolean,
    "onAnimationEnd"?: () => any
}

const AnimatedFA = animated(FontAwesomeIcon);

export default function Transition(props: Props) {
    const { hide, loading, onAnimationEnd } = props;
    const [doNotRender, setDoNotRender] = useState(false);

    const containerOpacity = useSpringValue(hide ? 1 : 0, {
        "config": {
            "duration": 480,
            "easing": easings.easeInOutCubic
        }
    });
    const loadingOpacity = useSpringValue(loading ? 1 : 0, {
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

    useEffect(() => {
        (async () => {
            if (loading) {
                await loadingOpacity.start(1);
            } else {
                await loadingOpacity.start(0);
            }

            onAnimationEnd?.();
        })();
    }, [loading]);

    if (doNotRender) return null;

    return <animated.div
        className={css.container}
        style={{ "opacity": containerOpacity }}
    >
        <AnimatedFA
            icon={faCircleNotch}
            spin
            style={{ "opacity": loadingOpacity }}
        />
    </animated.div>
}