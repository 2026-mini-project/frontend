import { animated, easings, useSpringValue } from '@react-spring/web';
import InOutAnimation from '../InOutAnimation';
import css from './styles.module.css';
import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type IconDefinition } from '@fortawesome/free-solid-svg-icons';

type Props = {
    "title": string,
    "icon": IconDefinition,
    "description": string,
    "placeholder": string,
    "onCancel": () => any,
    "onSubmit": (data: string) => any,
    "submitText": string,
    "show": boolean
};

export default function Form(props: Props) {
    const { title, icon, description, placeholder, onCancel, onSubmit, submitText, show } = props;
    const inputRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

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
                <FontAwesomeIcon icon={icon} className={css.icon} />
                <span className={css.title}>{title}</span>
            </div>
            <span className={css.desc}>{description}</span>
            <input
                className={css.input}
                type="text"
                placeholder={placeholder}
                ref={inputRef}
                onKeyDown={(ev) => ev.key === "Enter" && buttonRef.current && buttonRef.current.click()}
            />
            <button className={css.button} ref={buttonRef} onClick={() => {
                if (!inputRef.current) return window.location.reload();

                onSubmit(inputRef.current.value ?? "");
            }}>{submitText}</button>
        </InOutAnimation>
    </animated.div>;
}