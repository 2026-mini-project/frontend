const BASE85_OFFSET = 33;
const BOARD_SIZE = 8;

function decodeBase85(encoded: string): Uint8Array {
    if (encoded.length % 5 !== 0) {
        throw new Error(`잘못된 Base85 길이: ${encoded.length}`);
    }

    const decoded = new Uint8Array((encoded.length / 5) * 4);
    let outputIndex = 0;

    for (let i = 0; i < encoded.length; i += 5) {
        let value = 0;

        for (let j = 0; j < 5; j++) {
            const digit = encoded.charCodeAt(i + j) - BASE85_OFFSET;

            if (digit < 0 || digit > 84) {
                throw new Error(`잘못된 Base85 문자: ${encoded[i + j]}`);
            }

            value = value * 85 + digit;
        }

        if (value > 0xffffffff) {
            throw new Error("Base85 값이 32비트 범위를 벗어났습니다.");
        }

        decoded[outputIndex++] = Math.floor(value / 2 ** 24) % 256;
        decoded[outputIndex++] = Math.floor(value / 2 ** 16) % 256;
        decoded[outputIndex++] = Math.floor(value / 2 ** 8) % 256;
        decoded[outputIndex++] = value % 256;
    }

    return decoded;
}

export function decodeBoard(encoded: string, size = BOARD_SIZE): boolean[][] {
    const bytes = decodeBase85(encoded);
    const cellCount = size * size;

    if (bytes.length < cellCount) {
        throw new Error(
            `보드 데이터가 부족합니다: ${bytes.length}/${cellCount}`,
        );
    }

    return Array.from({ length: size }, (_, y) =>
        Array.from({ length: size }, (_, x) => {
            const index = y * size + x;
            return bytes[index] === 1;
        }),
    );
}
