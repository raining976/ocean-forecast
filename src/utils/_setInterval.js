// /Users/raining/projects/OceanForecast/src/utils/_setInterval.js
/**
 * 使用 setTimeout 封装一个 setInterval 的替代实现。
 *
 * 返回一个 handle 对象，调用 handle.clear() 可以停止循环。
 *
 * @param {Function} fn 要执行的回调
 * @param {number} interval 间隔毫秒
 * @param {object} [options]
 *   - immediate {boolean} 是否立即执行一次（默认 false）
 *   - waitForCallback {boolean} 是否等待回调（如果返回 Promise）完成后再计时（默认 false）
 * @returns {{ clear: () => void }}
 */
export default function setIntervalByTimeout(fn, interval, options = {}) {
    const { immediate = false, waitForCallback = false } = options;
    let timerId = null;
    let cleared = false;

    const scheduleNext = () => {
        if (cleared) return;
        timerId = setTimeout(tick, interval);
    };

    const tick = () => {
        if (cleared) return;
        try {
            const result = fn();
            if (waitForCallback && result && typeof result.then === 'function') {
                // 等待 promise 完成再开始下一次计时
                result
                    .catch(() => {}) // 不让未捕获异常中断循环
                    .then(() => {
                        scheduleNext();
                    });
                return;
            }
        } catch (e) {
            // 捕获同步异常，防止循环中断
            // 将异常异步抛出以便上层可见（可选）
            setTimeout(() => { throw e; });
        }
        // 默认行为：直接开始下一次计时（不等待异步回调）
        scheduleNext();
    };

    if (immediate) tick();
    else scheduleNext();

    return {
        clear() {
            cleared = true;
            if (timerId !== null) {
                clearTimeout(timerId);
                timerId = null;
            }
        }
    };
}

/**
 * 便捷清理函数
 * @param {{ clear: () => void }|null|undefined} handle
 */
export function clearIntervalByTimeout(handle) {
    if (handle && typeof handle.clear === 'function') handle.clear();
}