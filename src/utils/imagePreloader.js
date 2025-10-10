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

  function loadOne(index) {
    if (index < 0 || index >= urls.length) return Promise.resolve();
    if (status[index] === 'loaded' || status[index] === 'loading') return Promise.resolve();

    status[index] = 'loading';
    safeOnProgress(index, status[index], name);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        status[index] = 'loaded';
        safeOnProgress(index, status[index], name);
        console.log('loaded:',index)
        // 释放引用
        img.onload = null;
        img.onerror = null;
        resolve({ index, status: 'loaded' });
      };
      img.onerror = () => {
        status[index] = 'error';
        safeOnProgress(index, status[index], name);
        img.onload = null;
        img.onerror = null;
        resolve({ index, status: 'error' });
      };
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

  return {
    urls,
    status,
    get initialLoaded() { return initialLoaded; },
    loadInitial,
    loadAll,
  };
}
