import { useState, useEffect } from 'react';
import initialData from '../data/initialData';

/**
 * 数据管理 Hook
 * 负责数据的状态管理、本地持久化及 CRUD 操作
 * 
 * @param {Function} showToast - 全局提示函数
 * @param {boolean} isPreviewMode - 是否处于预览模式
 * @param {Function} onAutoSync - 自动同步回调函数 (newData) => void
 */
export function useData(showToast, isPreviewMode, onAutoSync) {
  const [data, setData] = useState(initialData);

  // 初始化加载本地数据
  useEffect(() => {
    // 如果是预览模式，由 usePreviewMode 处理加载，这里跳过
    const params = new URLSearchParams(window.location.search);
    if (params.get('share')) return;

    const local = localStorage.getItem('boxy_data');
    if (local) {
      try {
        const currentLocalData = JSON.parse(local);
        setData(currentLocalData);
      } catch (e) {
        showToast('本地数据损坏', 'error');
      }
    }
  }, [showToast]);

  /**
   * 核心保存函数
   * @param {Object} newData - 新的数据对象
   * @param {boolean} skipAutoSync - 是否跳过自动同步触发
   */
  const saveData = (newData, skipAutoSync = false) => {
    if (isPreviewMode) {
      showToast('预览模式无法保存修改', 'error');
      return;
    }

    const dataWithTs = { ...newData, updatedAt: Date.now() };
    setData(dataWithTs);
    localStorage.setItem('boxy_data', JSON.stringify(dataWithTs));

    if (!skipAutoSync && onAutoSync) {
      onAutoSync(dataWithTs);
    }
  };

  // --- CRUD 操作 ---

  const handleSaveSoftware = (e, modals, setModals) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newSoft = {
      id: fd.get('id') || 's_' + Date.now(),
      name: fd.get('name'),
      website: fd.get('website'),
      iconUrl: fd.get('iconUrl'),
      description: fd.get('description'),
      downloadUrls: fd.getAll('dl-inputs[]').map(v => v.trim()).filter(Boolean),
      blogUrls: fd.getAll('blog-inputs[]').map(v => v.trim()).filter(Boolean),
      sort: 999
    };

    if (!newSoft.name) {
      showToast('请输入名称', 'error');
      return;
    }

    let newCats = [...data.categories];
    // 如果是编辑模式，先移除旧的
    if (fd.get('id')) {
      newCats.forEach(c => {
        const idx = c.software.findIndex(s => s.id === newSoft.id);
        if (idx > -1) {
          newSoft.sort = c.software[idx].sort;
          c.software.splice(idx, 1);
        }
      });
    }

    const targetCat = newCats.find(c => c.id === fd.get('categoryId'));
    if (targetCat) {
      targetCat.software.push(newSoft);
    } else {
      showToast('分类无效', 'error');
      return;
    }

    saveData({ ...data, categories: newCats });
    setModals({ ...modals, software: false });
    showToast('保存成功');
  };

  const handleDeleteSoftware = (editingSoft, modals, setModals) => {
    if (!editingSoft) return;
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('确认删除？')) return;

    let newCats = [...data.categories];
    newCats.forEach(c => {
      c.software = c.software.filter(s => s.id !== editingSoft.id);
    });

    saveData({ ...data, categories: newCats });
    setModals({ ...modals, software: false });
    showToast('已删除');
  };

  const handleSaveCategory = (name, editingCat, modals, setModals) => {
    if (editingCat) {
      saveData({
        ...data,
        categories: data.categories.map(c => c.id === editingCat.id ? { ...c, name } : c)
      });
    } else {
      saveData({
        ...data,
        categories: [...data.categories, { id: 'c_' + Date.now(), name, sort: 99, software: [] }]
      });
    }
    setModals({ ...modals, category: false });
  };

  // --- 导入功能 ---

  const handleImportMerge = () => {
    const localData = JSON.parse(localStorage.getItem('boxy_data') || JSON.stringify(initialData));
    const merged = { ...localData, updatedAt: Date.now() };

    data.categories.forEach(shareCat => {
      const localCat = merged.categories.find(c => c.id === shareCat.id) || merged.categories.find(c => c.name === shareCat.name);
      if (localCat) {
        shareCat.software.forEach(s => {
          if (!localCat.software.some(ls => ls.id === s.id)) localCat.software.push(s);
        });
      } else {
        merged.categories.push(shareCat);
      }
    });

    localStorage.setItem('boxy_data', JSON.stringify(merged));
    // 刷新页面以加载新数据
    window.location.href = window.location.pathname;
  };

  const handleImportSingle = (soft) => {
    const localData = JSON.parse(localStorage.getItem('boxy_data') || JSON.stringify(initialData));
    const merged = { ...localData, updatedAt: Date.now() };
    const targetCat = merged.categories.find(c => c.id === soft._catId) || merged.categories.find(c => c.name === soft._catName);

    if (targetCat) {
      if (!targetCat.software.some(s => s.id === soft.id)) targetCat.software.push(soft);
    } else {
      merged.categories.push({ id: soft._catId || 'c_' + Date.now(), name: soft._catName || '导入', sort: 99, software: [soft] });
    }
    localStorage.setItem('boxy_data', JSON.stringify(merged));
    showToast('已保存到本地');
  };

  return {
    data,
    setData,
    saveData,
    handleSaveSoftware,
    handleDeleteSoftware,
    handleSaveCategory,
    handleImportMerge,
    handleImportSingle
  };
}
