/**
 * 通用图片预加载器
 * - 支持初始批次（优先显示）和并发后台加载
 * - 提供进度回调，返回状态数组与加载控制方法
 */
export function createImagePreloader(urls = [], options = {}) {
  const {
    concurrency = 2,
    initialBatch = 3,
    onProgress = null,
    name = ''
  } = options;

  const status = new Array(urls.length).fill('pending'); // 'pending' | 'loading' | 'loaded' | 'error'

  let initialLoaded = false;

  const safeOnProgress = (...args) => {
    if (typeof onProgress === 'function') {
      try { onProgress(...args); } catch (e) { console.error('onProgress callback error', e); }
    }
  };

  const activeImgs = new Set(); // 存放当前正在加载的 Image 实例

  function loadOne(index, { timeoutMs = 15000 } = {}) {
    if (index < 0 || index >= urls.length) return Promise.resolve();
    if (status[index] === 'loaded' || status[index] === 'loading') return Promise.resolve();

    status[index] = 'loading';
    safeOnProgress(index, status[index], name);

    return new Promise((resolve) => {
      const img = new Image();
      activeImgs.add(img);

      let timeoutId = null;
      const cleanup = (result) => {
        // 清理引用和定时器
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        img.onload = null;
        img.onerror = null;
        activeImgs.delete(img);
        resolve(result);
      };

      img.onload = () => {
        console.log("loaded", index)
        status[index] = 'loaded';
        safeOnProgress(index, status[index], name);
        cleanup({ index, status: 'loaded' });
      };
      img.onerror = () => {
        status[index] = 'error';
        safeOnProgress(index, status[index], name);
        cleanup({ index, status: 'error' });
      };

      // 超时保护：超过 timeoutMs 视为失败并取消绑定
      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          // 标记 error（或 'timeout'），并尽可能中断请求
          status[index] = 'error';
          safeOnProgress(index, status[index], name);
          // 尝试中止下载：清空 src 并移除回调
          img.onload = null;
          img.onerror = null;
          try { img.src = ''; } catch (e) {}
          activeImgs.delete(img);
          resolve({ index, status: 'error', reason: 'timeout' });
        }, timeoutMs);
      }

      // kick off
      img.src = urls[index];
    });
  }

  async function loadInitial() {
    if (initialLoaded) return;
    const end = Math.min(initialBatch, urls.length);
    const promises = [];
    for (let i = 0; i < end; i++) {
      promises.push(loadOne(i));
    }
    await Promise.all(promises);
    initialLoaded = true;
  }

  async function loadAll() {
    // 并发 worker 池
    let next = 0;
    const workers = new Array(Math.max(1, concurrency)).fill(0).map(async () => {
      while (true) {
        const i = next++;
        if (i >= urls.length) return;
        // 已加载则跳过
        if (status[i] === 'loaded' || status[i] === 'error') continue;
        await loadOne(i);
      }
    });
    await Promise.all(workers);
  }


  function cancelAll() {
    for (const img of activeImgs) {
      try {
        img.onload = null;
        img.onerror = null;
        img.src = ''; // 尝试中止
      } catch (e) { /* ignore */ }
    }
    activeImgs.clear();
    // 可选：把未完成的 status 标记为 'error' 或 'cancelled'
    for (let i = 0; i < status.length; i++) {
      if (status[i] === 'loading' || status[i] === 'pending') {
        status[i] = 'error';
        safeOnProgress(i, status[i], name);
      }
    }
  }

  function dispose() {
    cancelAll();
    // 断开对 urls 与 status 的引用，方便外部释放 preloader 对象
    // 注意：dispose 后若外部仍持有返回对象，某些属性已清理
    // urls = []; // 若 urls 是 const，在实现中可选择清空或 leave
    // status.length = 0;
  }

  return {
    urls,
    status,
    get initialLoaded() { return initialLoaded; },
    loadInitial,
    loadAll,
    cancelAll,
    dispose,
  };
}
