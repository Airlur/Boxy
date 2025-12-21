import { useState, useEffect, useCallback } from 'react';

/**
 * WebDAV 同步与备份管理 Hook
 */
export function useWebDAV(showToast, saveData, setModals) {
  // --- 状态管理 ---
  const [wdConfig, setWdConfig] = useState(() => {
    const saved = localStorage.getItem('boxy_webdav_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { backupLimit: 10, ...parsed }; 
      } catch (e) {
        console.error('WebDAV 配置解析失败', e);
      }
    }
    return { 
      url: '', 
      user: '', 
      pass: '', 
      remember: false, 
      autoSync: false,
      backupLimit: 10,
      syncDelay: 2 // 默认延迟 2 秒
    };
  });
  
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'waiting' | 'syncing' | 'success' | 'error'
  const [backups, setBackups] = useState([]); 

  // --- 持久化 ---
  useEffect(() => {
    if (wdConfig.remember) {
      localStorage.setItem('boxy_webdav_config', JSON.stringify(wdConfig));
    } else {
      localStorage.removeItem('boxy_webdav_config');
    }
  }, [wdConfig]);

  // 通用请求代理函数
  const doRequest = useCallback(async (params) => {
    const { method, endpoint, bodyData, destination } = params;
    
    try {
      const res = await fetch('/api/webdav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint, 
          username: wdConfig.user, 
          password: wdConfig.pass, 
          method, 
          data: bodyData,
          destination
        })
      });
      
      const contentType = res.headers.get('content-type') || '';
      let result = {};
      
      if (contentType.includes('application/json')) {
        result.json = await res.json().catch(() => ({}));
      } else {
        result.text = await res.text();
      }

      return { ok: res.ok, status: res.status, ...result };
    } catch (e) {
      console.error('Fetch Error:', e);
      return { ok: false, status: 0, json: { error: e.message || 'Network Error' } };
    }
  }, [wdConfig.user, wdConfig.pass]);

  /**
   * 测试连通性
   */
  const handleTestConnection = async () => {
    if (!wdConfig.url || !wdConfig.user || !wdConfig.pass) {
      showToast('请完整填写服务器信息', 'error');
      return false;
    }
    
    // 前端 URL 校验
    try {
      new URL(wdConfig.url);
    } catch (e) {
      showToast('服务器地址格式错误 (例如: https://...)', 'error');
      return false;
    }
    
    setSyncStatus('syncing');
    try {
      let baseUrl = wdConfig.url.replace(/\/+$/, '');
      if (!baseUrl.endsWith('/Boxy')) baseUrl += '/Boxy';
      
      const res = await doRequest({ method: 'PROPFIND', endpoint: baseUrl });
      
      if (res.ok) {
        setSyncStatus('success');
        showToast('连接成功');
        setTimeout(() => setSyncStatus('idle'), 3000);
        return true;
      } else {
        let errorMsg = res.statusText;
        if (res.status === 404) errorMsg = '远程目录不存在 (404)';
        else if (res.status === 401) errorMsg = '用户名或密码错误 (401)';
        else if (res.json && (res.json.error || res.json.details)) errorMsg = res.json.error || res.json.details;
        
        throw new Error(errorMsg);
      }
    } catch (e) {
      setSyncStatus('error');
      // 确保错误信息不为空
      const msg = e.message === 'Failed to fetch' ? '网络请求失败 (可能是跨域或服务不可达)' : e.message;
      showToast(`连接失败: ${msg}`, 'error');
      return false;
    }
  };

  /**
   * 获取 WebDAV 目录 URL
   */
  const getDirUrl = useCallback(() => {
    if (!wdConfig.url) return '';
    let url = wdConfig.url.replace(/\/+$/, '');
    if (!url.endsWith('/Boxy')) url += '/Boxy';
    return url + '/'; 
  }, [wdConfig.url]);

  /**
   * 获取历史备份列表
   */
  const fetchBackups = useCallback(async (silent = true) => {
    const dirUrl = getDirUrl();
    if (!dirUrl) return;
    
    try {
      const res = await doRequest({ method: 'PROPFIND', endpoint: dirUrl });
      
      // 兼容 404
      if (res.status === 404) {
        setBackups([]);
        return;
      }
      
      if (!res.ok) {
        const errMsg = (res.json && res.json.error) || (res.json && res.json.details) || res.statusText;
        if (res.status === 403) {
            if (!silent) console.warn('WebDAV PROPFIND 403: 目录可能未创建或权限受限');
            return;
        }
        throw new Error(`目录获取失败 (${res.status}): ${errMsg}`);
      }

      if (!res.text) {
        setBackups([]);
        return;
      }

      const matches = res.text.matchAll(/boxy_data_\d{6}-\d{6}\.json/g);
      const fileNames = [...new Set([...matches].map(m => m[0]))];
      
      const sorted = fileNames.sort((a, b) => b.localeCompare(a));
      setBackups(sorted.map(name => ({
        name,
        time: name.match(/(\d{6}-\d{6})/)[0].replace(/(\d{2})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/, '20$1-$2-$3 $4:$5:$6')
      })));
    } catch (e) {
      if (!silent) showToast(`获取备份失败: ${e.message}`, 'error');
    }
  }, [getDirUrl, doRequest, showToast]);

  /**
   * 创建备份并清理旧版本
   * 改为使用 PUT 上传副本，避免 WebDAV COPY 命令的兼容性问题 (如 400/404)
   */
  const manageBackups = useCallback(async (dataToBackup) => {
    const dirUrl = getDirUrl();
    if (!dirUrl || !dataToBackup) return;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ts = `${pad(now.getFullYear()%100)}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    
    const backupUrl = dirUrl + `boxy_data_${ts}.json`;

    try {
      // 1. 上传备份 (Double Upload Strategy)
      const backupRes = await doRequest({ 
        method: 'PUT', 
        endpoint: backupUrl, 
        bodyData: dataToBackup 
      });
      
      if (!backupRes.ok) {
        console.warn('Backup Upload failed:', backupRes.status);
      } else {
        console.log(`[WebDAV] 备份成功: boxy_data_${ts}.json`);
      }
      
      // 2. 清理旧备份
      const res = await doRequest({ method: 'PROPFIND', endpoint: dirUrl });
      
      let text = res.text || '';
      if (!text && res.json) {
         text = JSON.stringify(res.json);
      }

      if (!text) return;

      const matches = text.matchAll(/boxy_data_\d{6}-\d{6}\.json/g);
      const allBackups = [...new Set([...matches].map(m => m[0]))].sort();

      const limit = Math.max(1, Math.min(50, wdConfig.backupLimit || 10));

      if (allBackups.length > limit) {
        const toDelete = allBackups.slice(0, allBackups.length - limit);
        for (const fileName of toDelete) {
          await doRequest({ method: 'DELETE', endpoint: dirUrl + fileName });
        }
        console.log(`[WebDAV] 已自动清理 ${toDelete.length} 个旧备份`);
      }
      fetchBackups(true);
    } catch (e) {
      console.warn('自动备份管理异常', e);
    }
  }, [getDirUrl, doRequest, fetchBackups, wdConfig.backupLimit]);

  const handleWebDav = async (type, currentData, silent = false, overrideConfig = wdConfig) => {
    const config = overrideConfig;
    if (!config.url || !config.user || !config.pass) { 
      if (!silent) showToast('请完整填写服务器配置', 'error'); 
      return; 
    }

    // 校验 URL 格式
    try {
      new URL(config.url);
    } catch (e) {
      if (!silent) showToast('服务器地址格式错误', 'error');
      return;
    }

    let baseUrl = config.url.replace(/\/+$/, '');
    if (!baseUrl.endsWith('/Boxy')) baseUrl += '/Boxy';
    const folderEndpoint = baseUrl; 
    const targetEndpoint = baseUrl + '/boxy_data.json';

    if (!silent) showToast(type === 'push' ? '正在上传...' : '正在下载...', 'info');
    setSyncStatus('syncing');

    try {
      let res = await doRequest({ 
        method: type === 'push' ? 'PUT' : 'GET', 
        endpoint: targetEndpoint, 
        bodyData: type === 'push' ? currentData : undefined 
      });

      if (type === 'push' && (res.status === 403 || res.status === 404 || res.status === 409)) {
        const mkcolRes = await doRequest({ method: 'MKCOL', endpoint: folderEndpoint });
        if (mkcolRes.ok || mkcolRes.status === 405) {
          res = await doRequest({ method: 'PUT', endpoint: targetEndpoint, bodyData: currentData });
        }
      }

      if (type === 'pull' && res.status === 404) {
        if (!silent) showToast('云端暂无数据，请先推送', 'info');
        setSyncStatus('idle'); return;
      }

      if (!res.ok) {
        // 增强错误信息提取
        let errMsg = res.statusText;
        if (res.json) {
            errMsg = res.json.error || res.json.details || res.json.message || errMsg;
        }
        // 针对常见状态码提供友好提示
        if (res.status === 401) errMsg = '认证失败，请检查密码';
        if (res.status === 404) errMsg = '远程文件/目录不存在';
        
        throw new Error(errMsg);
      }

      if (type === 'pull') {
        const cloudData = res.json;
        const localTs = currentData?.updatedAt || 0;
        if ((cloudData.updatedAt || 0) > localTs) {
          saveData(cloudData, true);
          if (!silent) showToast('已同步云端最新数据');
        } else if (!silent) {
          showToast('本地数据已是最新');
        }
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        if (!silent) showToast('推送成功');
        manageBackups(currentData);
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
      if (!silent) setModals(prev => ({ ...prev, settings: false }));
    } catch (e) {
      setSyncStatus('error');
      if (!silent || e.message !== 'Failed to fetch') showToast(`同步失败: ${e.message}`, 'error');
    }
  };

  const handleRestore = async (fileName) => {
    if (!confirm(`确定要将数据恢复到版本 ${fileName} 吗？\n当前本地数据将被覆盖。`)) return; 
    
    const dirUrl = getDirUrl();
    if (!dirUrl) return;
    const fileUrl = dirUrl + fileName;

    showToast('正在恢复备份...', 'info');
    setSyncStatus('syncing');
    try {
      const res = await doRequest({ method: 'GET', endpoint: fileUrl });
      if (!res.ok) throw new Error('下载备份文件失败');
      
      const backupData = res.json;
      saveData(backupData, false); 
      showToast('数据恢复成功');
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
      setModals(prev => ({ ...prev, settings: false }));
    } catch (e) {
      setSyncStatus('error');
      showToast(`恢复失败: ${e.message}`, 'error');
    }
  };

  const handleDeleteBackup = async (fileName) => {
    if (!confirm('确认删除此备份？')) return;
    const dirUrl = getDirUrl();
    if (!dirUrl) return;

    try {
      await doRequest({ method: 'DELETE', endpoint: dirUrl + fileName });
      showToast('已删除');
      fetchBackups(false); 
    } catch (e) { showToast('删除失败', 'error'); }
  };
  
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
          body: JSON.stringify({ content: JSON.stringify(currentData, null, 2), message: msg, password: pwd })
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast('仓库更新成功！部署即将触发');
      } catch (e) { showToast(`更新失败: ${e.message}`, 'error'); }
  };

  return {
    wdConfig, setWdConfig, syncStatus, setSyncStatus, handleWebDav, handleUpdateRepo, handleTestConnection,
    backups, fetchBackups, handleRestore, handleDeleteBackup
  };
}
