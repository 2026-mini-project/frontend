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

const API_BASE = "https://miniproj.pro203s.kr";
const EXPIRES_IN = 3600;

export default async function REST<T = any, D = any>(route: string, config?: Omit<AxiosRequestConfig<D>, "validateStatus" | "url"> & { "doNotRefresh"?: boolean }): Promise<Resp<T>> {
    try {
        const sessionId = localStorage.getItem("sessionId");

        if (sessionId) {
            const loginTime = Number(localStorage.getItem("loginTime"));
            const now = Date.now();
            const expiresAt = loginTime + (EXPIRES_IN * 1000);

            if (!isNaN(loginTime) && now >= expiresAt && !config?.doNotRefresh) {
                const r = await axios.post<APIUser | APIError>(`${API_BASE}/session/refresh`, {}, {
                    "headers": {
                        "Authorization": sessionId
                    },
                    "validateStatus": () => true
                });
                if (r.status !== 200) {
                    const data = r.data as APIError;

                    return {
                        "success": false,
                        data,
                        "status": r.status
                    };
                }
                const data = r.data as APIUser;

                localStorage.setItem("sessionId", data.id);
                localStorage.setItem("name", data.name);
                localStorage.setItem("loginTime", String(Date.now()));

                return await REST<T, D>(route, config);
            }
        }

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
            if (r.status === 401) {
                localStorage.removeItem("sessionId");
                localStorage.removeItem("name");
                localStorage.removeItem("loginTime");
            }

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
