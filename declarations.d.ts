declare global {
    type APIError = {
        "message": string
    };

    type APIStatus = {
        "running": boolean
    };

    type APIUser = {
        "id": string, // SessionId임
        "name": string,
    };

    type APIRoom = {
        "id": string,
        "name": string,
        "owner": string, // 방장 닉네임
        "full": boolean // 방이 꽉 찼는지 여부
    };
}

export { };
