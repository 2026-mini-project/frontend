import { useEffect, useRef, useState } from "react";
import z from "zod";

const sendScheme = z.union([
    z.tuple([
        z.literal("identify"),
        z.object({ "sessionId": z.string() })
    ]),
    z.tuple()
]);

export default function useSocket(id: string) {
    const ws = useRef<WebSocket>(null);
    const [connected, setConnected] = useState(false);
    const [message, setMessage] = useState<SocketData>();
    const [error, setError] = useState<unknown>();

    useEffect(() => {
        if (ws.current) {
            ws.current.close(1000);
            ws.current = null;
        }

        ws.current = new WebSocket(`wss://miniproj.pro203s.kr/socket/websocket`);
        ws.current.addEventListener("open", () => setConnected(true));
        ws.current.addEventListener("close", () => setConnected(false));

        ws.current.addEventListener("message", (ev) => {

        })
    }, [id]);

    return {
        connected,
        "socket": ws.current,
        message,
        error
    };
}