import z from "zod";

const SOCKET_URL = "wss://miniproj.pro203s.kr/socket";

const ZodAPIUser = z.object({
    "id": z.string(),
    "name": z.string()
});

const sendSchema = z.union([
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

const receiveSchema = z.union([
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

type SendPayload = z.infer<typeof sendSchema>;
type ReceivePayload = z.infer<typeof receiveSchema>;

type SocketEventMap = {
    "message": ReceivePayload,
    "error": Event,
    "disconnect": CloseEvent,
    "connected": Event
};

type ListenerSet<K extends keyof SocketEventMap> = Set<(payload: SocketEventMap[K]) => void>;

export default class WebSocket {
    #socket: globalThis.WebSocket | null = null;
    #connected = false;
    #listeners: { [K in keyof SocketEventMap]: ListenerSet<K> } = {
        "message": new Set(),
        "error": new Set(),
        "disconnect": new Set(),
        "connected": new Set()
    };
    #connectPromise: Promise<void> | null = null;

    connect(): Promise<void> {
        if (this.#connected) {
            return Promise.resolve();
        }

        if (this.#connectPromise) {
            return this.#connectPromise;
        }

        if (this.#socket && this.#socket.readyState !== globalThis.WebSocket.CLOSED) {
            return this.#waitForConnected();
        }

        this.#socket = new globalThis.WebSocket(SOCKET_URL);
        this.#attachSocketEvents(this.#socket);
        this.#connectPromise = this.#waitForConnected();

        return this.#connectPromise;
    }

    disconnect(): void {
        if (!this.#socket) {
            return;
        }

        this.#socket.close(1000);
    }

    on<K extends keyof SocketEventMap>(event: K, handler: (payload: SocketEventMap[K]) => void): () => void {
        this.#listeners[event].add(handler);

        return () => {
            this.#listeners[event].delete(handler);
        };
    }

    async send(data: SendPayload): Promise<void> {
        await this.connect();

        const payload = sendSchema.parse(data);

        this.#socket?.send(JSON.stringify(payload));
    }

    #attachSocketEvents(socket: globalThis.WebSocket): void {
        socket.addEventListener("open", (event) => {
            this.#connected = true;
            this.#connectPromise = null;
            this.#emit("connected", event);
        });

        socket.addEventListener("close", (event) => {
            this.#connected = false;
            this.#connectPromise = null;

            if (this.#socket === socket) {
                this.#socket = null;
            }

            this.#emit("disconnect", event);
        });

        socket.addEventListener("error", (event) => {
            this.#emit("error", event);
        });

        socket.addEventListener("message", (event) => {
            if (typeof event.data !== "string") {
                return;
            }

            let message: unknown;
            try {
                message = JSON.parse(event.data);
            } catch {
                return;
            }

            const parsed = receiveSchema.safeParse(message);
            if (!parsed.success) {
                return;
            }

            this.#emit("message", parsed.data);
        });
    }

    #waitForConnected(): Promise<void> {
        if (this.#socket?.readyState === globalThis.WebSocket.OPEN) {
            this.#connected = true;
            this.#connectPromise = null;
            return Promise.resolve();
        }

        return new Promise<void>((resolve, reject) => {
            const socket = this.#socket;

            if (!socket) {
                reject(new Error("WebSocket is not initialized."));
                return;
            }

            const onOpen = () => {
                cleanup();
                resolve();
            };
            const onClose = () => {
                cleanup();
                this.#connectPromise = null;
                reject(new Error("Failed to connect websocket."));
            };
            const onError = () => {
                cleanup();
                this.#connectPromise = null;
                reject(new Error("Failed to connect websocket."));
            };
            const cleanup = () => {
                socket.removeEventListener("open", onOpen);
                socket.removeEventListener("close", onClose);
                socket.removeEventListener("error", onError);
            };

            socket.addEventListener("open", onOpen);
            socket.addEventListener("close", onClose);
            socket.addEventListener("error", onError);
        });
    }

    #emit<K extends keyof SocketEventMap>(event: K, payload: SocketEventMap[K]): void {
        for (const listener of this.#listeners[event]) {
            listener(payload);
        }
    }
}
