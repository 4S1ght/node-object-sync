
export function createLazyTimer(time: number, callback: Function) {
    let timeout: number
    return () => {
        clearTimeout(timeout)
        timeout = setTimeout(callback, time);
    }
}