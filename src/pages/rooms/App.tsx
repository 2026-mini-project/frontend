import { useEffect, useState } from 'react';
import Transition from '../../components/transition';
import css from './App.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClose, faDoorOpen, faPlay } from '@fortawesome/free-solid-svg-icons';
import Form from '../../components/form';
import REST from '../../modules/rest';
import { useNavigate } from 'react-router-dom';
import Dialog, { type DialogButton } from '../../components/Dialog';

export default function Page() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [needToRedirect, setNeedToRedirect] = useState(false);
    const [rooms, setRooms] = useState<APIRoom[]>([]);
    const [showForm, setShowForm] = useState(false);

    const [dialogIcon, setDialogIcon] = useState(faClose);
    const [dialogTitle, setDialogTitle] = useState("");
    const [dialogDescription, setDialogDescription] = useState("");
    const [dialogButtons, setDialogButtons] = useState<DialogButton[]>([]);
    const [dialogClosable, setDialogClosable] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadRooms = async () => {
            const r = await REST<APIRoom[]>("/rooms");
            if (cancelled) return;

            if (!r.success) {
                if (r.status === 401) {
                    setNeedToRedirect(true);
                    return;
                }

                if (r.status !== 404) {
                    setDialogIcon(faClose);
                    setDialogTitle("오류");
                    setDialogDescription(r.data.message);
                    setDialogButtons([{ "name": "확인", "onClick": () => { navigate("/") } }]);
                    setDialogClosable(false);
                    setDialogOpen(true);
                    return;
                }

                setRooms([]);
                return;
            }

            setRooms(r.data);

        };

        void loadRooms().finally(() => {
            if (!cancelled) {
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return <>
        <Dialog
            icon={dialogIcon}
            title={dialogTitle}
            description={dialogDescription}
            buttons={dialogButtons}
            onCancel={() => dialogClosable && setDialogOpen(false)}
            show={dialogOpen}
        />
        <Form
            show={showForm}
            icon={faPlay}
            title="방 만들기"
            description='방 이름을 입력해 새롭게 방을 만들어요.'
            placeholder='방 이름'
            checkboxLabel='비밀방으로 만들기'
            onSubmit={async (data, checked) => {
                setShowForm(false);
                try {
                    if (!data) {
                        setShowForm(false);
                        setDialogIcon(faClose);
                        setDialogTitle("방 만들기");
                        setDialogDescription("방 이름을 입력해주세요!");
                        setDialogButtons([{ "name": "확인", "onClick": () => { setDialogOpen(false) } }]);
                        setDialogClosable(true);
                        setDialogOpen(true);
                        return;
                    }

                    const r = await REST<APIRoom>("/rooms", {
                        "method": "POST",
                        "data": {
                            "name": data,
                            "private": checked
                        },
                        "headers": {
                            "Content-Type": "application/json"
                        }
                    });
                    if (!r.success) throw new Error(`방 만들기에 실패했습니다. (${r.status})`);

                    setLoading(true);
                    await new Promise(r => setTimeout(r, 480));
                    navigate(`/rooms/${r.data.id}`);
                } catch (err) {
                    setDialogIcon(faClose);
                    setDialogTitle("오류");
                    setDialogDescription(err instanceof Error ? err.message : String(err ?? "Unknown Error"));
                    setDialogButtons([{ "name": "확인", "onClick": () => { navigate("/") } }]);
                    setDialogClosable(false);
                    setDialogOpen(true);
                    return;
                }
            }}
            onCancel={() => setShowForm(false)}
            submitText="방 만들기"
        />
        <Transition hide={loading} onAnimationEnd={() => {
            if (!needToRedirect) return;

            navigate("/", { "replace": true });
        }} />
        <div className={css.container}>
            <div className={css.header}>
                <div className={css.content}>
                    <span>당신의 닉네임:&nbsp;</span>
                    <b>{localStorage.getItem("name")}</b>
                    <button className={css.logout} onClick={async () => {
                        try {
                            await REST("/session", {
                                "method": "DELETE"
                            });

                            localStorage.removeItem("sessionId");
                            localStorage.removeItem("name");
                            localStorage.removeItem("loginTime");

                            setLoading(true);
                            setNeedToRedirect(true);
                        } catch (err) {
                            setDialogIcon(faClose);
                            setDialogTitle("오류");
                            setDialogDescription(err instanceof Error ? err.message : String(err ?? "Unknown Error"));
                            setDialogButtons([{ "name": "확인", "onClick": () => { navigate("/") } }]);
                            setDialogClosable(false);
                            setDialogOpen(true);
                            return;
                        }
                    }}>
                        <FontAwesomeIcon icon={faDoorOpen} />
                    </button>
                </div>
                <button className={css.createRoom} onClick={() => setShowForm(true)}>
                    <FontAwesomeIcon icon={faPlay} />
                    <span>방 만들기</span>
                </button>
            </div>
            <div className={css.roomList}>
                {rooms.map(v => <button
                    key={v.id}
                    className={css.room}
                    style={v.full ? { "pointerEvents": "none", "opacity": 0.5 } : {}}
                    onClick={async () => {
                        setLoading(true);
                        await new Promise(r => setTimeout(r, 480));
                        navigate(`/rooms/${v.id}`);
                    }}
                >
                    <span className={css.name}>{v.name}</span>
                    <span className={css.owner}>소유자: {v.owner}</span>
                </button>)}
            </div>
        </div>
    </>;
}
