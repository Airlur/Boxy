import { useState, useEffect } from 'react';

/**
 * WebDAV 同步与仓库更新 Hook
 * 管理 WebDAV 配置、同步状态以及与后端 API 的交互逻辑
 *
 * @param {Function} showToast - 全局提示函数
 * @param {Function} saveData - 数据保存函数 (用于 Pull 时更新本地数据)
 * @param {Function} setModals - 弹窗状态设置函数 (用于同步成功后关闭设置弹窗)
 */
export function useWebDAV(showToast, saveData, setModals) {
  // --- 状态管理 ---
  const [wdConfig, setWdConfig] = useState({ 
    url: '', 
    user: '', 
    pass: '', 
    remember: false, 
    autoSync: false 
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // --- 初始化与持久化 ---
  
  // 初始化加载配置
  useEffect(() => {
    const savedWd = localStorage.getItem('boxy_webdav_config');
    if (savedWd) {
      try {
        setWdConfig(JSON.parse(savedWd));
      } catch (e) {
        console.error('WebDAV 配置解析失败', e);
      }
    }
  }, []);

  // 监听配置变化并持久化
  useEffect(() => {
    if (wdConfig.remember) {
      localStorage.setItem('boxy_webdav_config', JSON.stringify(wdConfig));
    } else {
      localStorage.removeItem('boxy_webdav_config');
    }
  }, [wdConfig]);

  // --- 核心同步逻辑 ---

  /**
   * 执行 WebDAV 同步 (Push/Pull)
   * @param {string} type - 'push' | 'pull'
   * @param {Object} currentData - 当前数据对象
   * @param {boolean} silent - 是否静默执行 (不显示非错误 Toast)
   * @param {Object} overrideConfig - 可选的临时配置 (用于测试连接)
   */
  const handleWebDav = async (type, currentData, silent = false, overrideConfig = wdConfig) => {
    const config = overrideConfig;
    if (!config.url) { 
      if (!silent) showToast('请输入服务器地址', 'error'); 
      return; 
    }

    // URL 规范化处理
    let url = config.url.replace(/\/+$/, '');
    if (!url.endsWith('/Boxy')) url += '/Boxy';
    const targetEndpoint = url + '/boxy_data.json';
    const folderEndpoint = url;

    if (!silent) showToast(type === 'push' ? '正在上传...' : '正在下载...', 'info');
    setIsSyncing(true);

    // 内部通用请求函数
    const doRequest = async (method, endpoint, bodyData) => {
      const res = await fetch('/api/webdav', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          endpoint, 
          username: config.user, 
          password: config.pass, 
          method, 
          data: bodyData 
        })
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, statusText: res.statusText, json };
    };

    try {
      // 执行主请求
      let res = await doRequest(
        type === 'push' ? 'PUT' : 'GET', 
        targetEndpoint, 
        type === 'push' ? currentData : undefined
      );

      // 自动创建目录处理 (MKCOL)
      if (type === 'push' && (res.status === 403 || res.status === 404 || res.status === 409)) {
        if (!silent) console.log(`上传失败 (${res.status})，尝试创建 Boxy 目录...`);
        const mkcolRes = await doRequest('MKCOL', folderEndpoint);
        if (mkcolRes.ok || mkcolRes.status === 405) {
          // 目录创建成功或已存在，重试上传
          res = await doRequest('PUT', targetEndpoint, currentData);
        }
      }

      // 处理 Pull 时的 404
      if (type === 'pull' && res.status === 404) {
        if (!silent) showToast('云端暂无数据，请先推送', 'info');
        setIsSyncing(false); 
        return;
      }

      // 错误抛出
      if (!res.ok) throw new Error(res.json?.error || res.statusText);

      // 成功后的数据处理
      if (type === 'pull') {
        const cloudData = res.json;
        const localTs = currentData?.updatedAt || 0;
        const cloudTs = cloudData.updatedAt || 0;
        
        // 简单的时间戳冲突解决策略
        if (cloudTs > localTs) {
          saveData(cloudData, true); // true = skipAutoSync，防止 Pull 下来又触发 Push
          if (!silent) showToast('已同步云端最新数据');
        } else {
          if (!silent) showToast('本地数据已是最新');
        }
      } else {
        if (!silent) showToast('推送成功');
      }

      // 如果不是静默模式（通常是手动点击触发），则关闭设置弹窗
      if (!silent) setModals(prev => ({ ...prev, settings: false }));

    } catch (e) {
      console.error(e);
      // 忽略网络中断导致的 Failed to fetch 错误提示 (用户体验优化)
      if (!silent || e.message !== 'Failed to fetch') {
        showToast(`同步失败: ${e.message}`, 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // --- 仓库更新逻辑 (Admin) ---

  const handleUpdateRepo = async (currentData) => {
    const pwd = prompt('请输入管理员密码 (ADMIN_PASSWORD):');
    if (pwd === null) return;
    const msg = prompt('请输入 Commit 信息:', 'chore: update initial data via admin panel');
    if (msg === null) return;

    showToast('正在更新仓库...', 'info');
    try {
      const res = await fetch('/api/update-repo', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: JSON.stringify(currentData, null, 2), 
          message: msg, 
          password: pwd 
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      showToast('仓库更新成功！部署即将触发');
    } catch (e) { 
      console.error(e); 
      showToast(`更新失败: ${e.message}`, 'error'); 
    }
  };

  return {
    wdConfig,
    setWdConfig,
    isSyncing,
    handleWebDav,
    handleUpdateRepo
  };
}
