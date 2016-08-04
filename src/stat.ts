module tsumego.stat {
    export const logv: (() => string)[] = [];
    export const summarizxe = () => logv.map(f => f());
}
