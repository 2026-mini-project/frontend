import { animated, easings, useSpringValue } from '@react-spring/web';
import InOutAnimation from '../InOutAnimation';
import css from './styles.module.css';
import { useEffect } from 'react';

type Props<T extends string[]> = {
    "title": string,
    "description": string,
    "inputs": T,
    "onCancel": () => any,
    "onSubmit": (data: Record<T[number], string>) => any,
    "show": boolean
};

export default function Form<T extends string[]>(props: Props<T>) {
    const { title, description, inputs, onCancel, onSubmit, show } = props;

    const opacity = useSpringValue(0, {
        "config": {
            "duration": 480,
            "easing": easings.easeInOutCubic
        }
    });

    useEffect(() => {
        (async () => {
            if (show) {
                await opacity.start(1);
            } else {
                await opacity.start(0);
            }
        })();
    }, [show]);

    return <animated.div
        className={css.background}
        style={{ opacity }}
        onClick={({ target, currentTarget }) => {
            if (target !== currentTarget) return;

            onCancel?.();
        }}
    >
        <InOutAnimation className={css.form} animate={show}>

        </InOutAnimation>
    </animated.div>;
}