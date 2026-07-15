export const BOARD_SIZE = 8;

export type BoardMove = {
    x: number;
    y: number;
    by: string;
};

export type ResolvedBoard = {
    revealedBy: Map<string, string>;
    exploded: BoardMove | null;
    safeCellCount: number;
    revealedSafeCount: number;
    clearingPlayerId: string | null;
};

export type ResolvedFlags = {
    flaggedBy: Map<string, string>;
    wrongFlag: BoardMove | null;
    correctFlagCount: number;
    completingPlayerId: string | null;
};

export const cellKey = (x: number, y: number) => `${x}:${y}`;

export function isBoardCoordinate(board: readonly (readonly boolean[])[], x: number, y: number) {
    return Number.isInteger(x)
        && Number.isInteger(y)
        && y >= 0
        && y < board.length
        && x >= 0
        && x < (board[y]?.length ?? 0);
}

export function getAdjacentMineCount(board: readonly (readonly boolean[])[], x: number, y: number) {
    let count = 0;

    for (let offsetY = -1; offsetY <= 1; offsetY++) {
        for (let offsetX = -1; offsetX <= 1; offsetX++) {
            if (offsetX === 0 && offsetY === 0) continue;

            const nextX = x + offsetX;
            const nextY = y + offsetY;
            if (isBoardCoordinate(board, nextX, nextY) && board[nextY][nextX]) {
                count++;
            }
        }
    }

    return count;
}

function revealSafeArea(
    board: readonly (readonly boolean[])[],
    startX: number,
    startY: number,
    playerId: string,
    revealedBy: Map<string, string>,
) {
    const queue: Array<[number, number]> = [[startX, startY]];

    while (queue.length > 0) {
        const [x, y] = queue.pop()!;
        const key = cellKey(x, y);

        if (revealedBy.has(key) || board[y][x]) continue;
        revealedBy.set(key, playerId);

        if (getAdjacentMineCount(board, x, y) !== 0) continue;

        for (let offsetY = -1; offsetY <= 1; offsetY++) {
            for (let offsetX = -1; offsetX <= 1; offsetX++) {
                if (offsetX === 0 && offsetY === 0) continue;

                const nextX = x + offsetX;
                const nextY = y + offsetY;
                if (
                    isBoardCoordinate(board, nextX, nextY)
                    && !board[nextY][nextX]
                    && !revealedBy.has(cellKey(nextX, nextY))
                ) {
                    queue.push([nextX, nextY]);
                }
            }
        }
    }
}

export function resolveBoard(
    board: readonly (readonly boolean[])[],
    moves: readonly BoardMove[],
): ResolvedBoard {
    const revealedBy = new Map<string, string>();
    let exploded: BoardMove | null = null;
    let clearingPlayerId: string | null = null;
    const mineCount = board.reduce(
        (total, row) => total + row.filter(Boolean).length,
        0,
    );
    const safeCellCount = board.reduce((total, row) => total + row.length, 0) - mineCount;

    for (const move of moves) {
        if (!isBoardCoordinate(board, move.x, move.y) || revealedBy.has(cellKey(move.x, move.y))) {
            continue;
        }

        if (board[move.y][move.x]) {
            revealedBy.set(cellKey(move.x, move.y), move.by);
            exploded = move;
            break;
        }

        revealSafeArea(board, move.x, move.y, move.by, revealedBy);

        if (revealedBy.size === safeCellCount) {
            clearingPlayerId = move.by;
            break;
        }
    }

    const revealedSafeCount = Array.from(revealedBy.keys()).reduce((count, key) => {
        const [x, y] = key.split(":").map(Number);
        return count + (board[y][x] ? 0 : 1);
    }, 0);

    return {
        revealedBy,
        exploded,
        safeCellCount,
        revealedSafeCount,
        clearingPlayerId,
    };
}

export function resolveFlags(
    board: readonly (readonly boolean[])[],
    moves: readonly BoardMove[],
): ResolvedFlags {
    const flaggedBy = new Map<string, string>();
    let wrongFlag: BoardMove | null = null;
    let lastCorrectFlag: BoardMove | null = null;
    const mineCount = board.reduce(
        (total, row) => total + row.filter(Boolean).length,
        0,
    );

    for (const move of moves) {
        const key = cellKey(move.x, move.y);
        if (!isBoardCoordinate(board, move.x, move.y) || flaggedBy.has(key)) continue;

        flaggedBy.set(key, move.by);
        if (!board[move.y][move.x]) {
            wrongFlag = move;
            break;
        }

        lastCorrectFlag = move;
    }

    const correctFlagCount = wrongFlag ? flaggedBy.size - 1 : flaggedBy.size;

    return {
        flaggedBy,
        wrongFlag,
        correctFlagCount,
        completingPlayerId: !wrongFlag && correctFlagCount === mineCount
            ? lastCorrectFlag?.by ?? null
            : null,
    };
}
