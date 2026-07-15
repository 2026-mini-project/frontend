import { animated, easings, useSpringValue } from '@react-spring/web';
import InOutAnimation from '../InOutAnimation';
import css from './styles.module.css';
import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type IconDefinition } from '@fortawesome/free-solid-svg-icons';

type Props = {
    "title": string,
    "icon": IconDefinition,
    "iconSpin"?: boolean,
    "description": string,
    "show": boolean,
    "buttons": DialogButton[],
    "onCancel": () => any
};

export type DialogButton = {
    "name": string,
    "onClick"?: () => any;
}

export default function Dialog(props: Props) {
    const { title, icon, iconSpin, description, show, buttons, onCancel } = props;

    const opacity = useSpringValue(0, {
        "config": {
            "duration": 480,
            "easing": easings.easeOutBack
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

    useEffect(() => {
        const cb = (ev: KeyboardEvent) => {
            const key = ev.key;
            if (key !== "Escape") return;

            onCancel();
        };
        document.addEventListener("keydown", cb);

        return () => document.removeEventListener("keydown", cb);
    })

    return <animated.div
        className={css.background}
        style={{ opacity, "pointerEvents": opacity.to(v => v === 0 ? "none" : "auto") }}
        onClick={({ target, currentTarget }) => {
            if (target !== currentTarget) return;

            onCancel();
        }}
    >
        <InOutAnimation className={css.form} animate={show}>
            <div className={css.linearV}>
                <FontAwesomeIcon icon={icon} className={css.icon} spin={iconSpin} />
                <span className={css.title}>{title}</span>
            </div>
            <span className={css.desc}>{description}</span>
            <div className={css.buttons}>
                {buttons.map(v => <button className={css.button} key={v.name} onClick={v.onClick}>
                    {v.name}
                </button>)}
            </div>
        </InOutAnimation>
    </animated.div>;
}