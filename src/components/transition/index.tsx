import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import css from './styles.module.css';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { useEffect } from 'react';
import { animated, easings, useSpringValue } from '@react-spring/web';

type Props = {
    "hide": boolean,
    "loading"?: boolean,
    "onAnimationEnd"?: () => any
}

const AnimatedFA = animated(FontAwesomeIcon);

export default function Transition(props: Props) {
    const { hide, loading, onAnimationEnd } = props;

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
        if (hide) {
            containerOpacity.start(1).then(onAnimationEnd);
        } else {
            containerOpacity.start(0).then(onAnimationEnd);
        }
    }, [hide]);

    useEffect(() => {
        if (loading) {
            loadingOpacity.start(1).then(onAnimationEnd);
        } else {
            loadingOpacity.start(0).then(onAnimationEnd);
        }
    }, [loading]);

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