import { useState, useEffect } from 'react';

/**
 * 预览模式 Hook
 * 处理 URL 中的 share 参数，加载 Gist 分享数据
 * 
 * @param {Function} setData - 更新数据的函数
 * @param {Function} showToast - 显示提示的函数
 * @returns {Object} 包含 isPreviewMode 状态
 */
export function usePreviewMode(setData, showToast) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    
    if (shareId) {
      setIsPreviewMode(true);
      
      // 模拟数据测试
      if (shareId === 'mock-gist-id-12345') {
        showToast('加载测试预览数据...');
        setTimeout(() => {
          setData({
            categories: [{
              id: 'mock_cat', name: '测试分类', sort: 1,
              software: [{
                id: 'mock_soft', name: '测试软件', website: 'https://example.com', 
                description: '这是一个测试预览数据', downloadUrls: [], blogUrls: [], sort: 1
              }]
            }],
            updatedAt: Date.now()
          });
          showToast('已加载测试数据');
        }, 500);
        return;
      }

      // 真实 Gist 加载
      showToast('正在加载分享内容...', 'info');
      fetch(`https://api.github.com/gists/${shareId}`)
        .then(r => { 
          if (!r.ok) throw new Error('Gist not found'); 
          return r.json(); 
        })
        .then(d => {
          try {
            const content = JSON.parse(d.files['boxy_data.json'].content);
            setData(content);
            showToast('已加载分享预览');
          } catch (e) { 
            throw new Error('Invalid data format'); 
          }
        })
        .catch(e => showToast(`加载失败: ${e.message}`, 'error'));
    }
  }, [setData, showToast]);

  return { isPreviewMode };
}
