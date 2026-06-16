import type { AxiosRequestConfig } from "axios";
import axios from "axios";

type RespTrue<T> = {
    "success": true,
    "data": T
};

type RespFalse = {
    "success": false,
    "data": APIError,
    "status": number
};

type Resp<T> = RespTrue<T> | RespFalse;

const API_BASE = "https://miniproj.pro203s.kr"

export default async function REST<T = any, D = any>(route: string, config?: Omit<AxiosRequestConfig<D>, "validateStatus" | "url">): Promise<Resp<T>> {
    try {
        const sessionId = localStorage.getItem("sessionId");
        const r = await axios({
            "url": `${API_BASE}${route}`,
            ...config,
            "headers": {
                ...config?.headers,
                "Authorization": sessionId,
                "Content-Type": "application/json"
            },
            "validateStatus": () => true
        });

        if (Math.floor(r.status / 100) !== 2) {
            return {
                "success": false,
                "data": r.data,
                "status": r.status
            };
        }

        return {
            "success": true,
            "data": r.data
        };
    } catch (err) {
        const e = err as Error;
        return {
            "success": false,
            "data": {
                "message": e.message
            },
            "status": 0
        };
    }
}
