import { useEffect, useRef, useState } from "react";
import z from "zod";

const ZodAPIUser = z.object({
    "id": z.string(),
    "name": z.string()
})

const sendScheme = z.union([
    z.tuple([
        z.literal("ping")
    ]),
    z.tuple([
        z.literal("identify"),
        z.object({ "sessionId": z.string() })
    ]),
    z.tuple([
        z.literal("join"),
        z.object({ "id": z.string() })
    ]),
    z.tuple([
        z.literal("ready")
    ]),
    z.tuple([
        z.literal("cancelReady")
    ]),
    z.tuple([
        z.literal("startGame")
    ]),
    z.tuple([
        z.literal("error"),
        z.object({ "message": z.string() })
    ]),
    z.tuple([
        z.literal("boardClick"),
        z.object({ "x": z.number(), "y": z.number() })
    ]),
    z.tuple([
        z.literal("gameClear"),
        z.object({ "winner": ZodAPIUser })
    ])
]);

const receiveScheme = z.union([
    z.tuple([
        z.literal("pong")
    ]),
    z.tuple([
        z.literal("identify")
    ]),
    z.tuple([
        z.literal("welcome"),
        z.object({ "pingInterval": z.number() })
    ]),
    z.tuple([
        z.literal("joined"),
        z.array(ZodAPIUser)
    ]),
    z.tuple([
        z.literal("ready"),
        ZodAPIUser
    ]),
    z.tuple([
        z.literal("cancelReady"),
        ZodAPIUser
    ]),
    z.tuple([
        z.literal("turn")
    ]),
    z.tuple([
        z.literal("boardClick"),
        z.object({ "x": z.number(), "y": z.number() })
    ])
]);

export default function useSocket(id: string) {
    const ws = useRef<WebSocket>(null);
    const [connected, setConnected] = useState(false);
    const [message, setMessage] = useState<z.infer<typeof receiveScheme>>();
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
            console.log(ev);
        })
    }, [id]);

    return {
        connected,
        "socket": ws.current,
        message,
        error
    };
}