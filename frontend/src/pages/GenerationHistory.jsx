/**
 * Generation History Page
 * Display and manage generation history with full API integration
 */

import React, { useState, useEffect } from 'react';
import {
  Clock, Trash2, Download, RefreshCw, Search, Filter,
  ChevronLeft, ChevronRight, Eye, AlertCircle, CheckCircle,
  XCircle, Loader2, Calendar, Image as ImageIcon, X,
  MoreVertical, ExternalLink, Copy, Info
} from 'lucide-react';

// Import services
import {
  getHistory,
  deleteHistory,
  deleteHistoryBatch,
  regenerateFromHistory,
  searchHistory,
  getHistoryByDateRange,
  exportHistory,
} from '../services/historyService';

import { downloadFile } from '../services/axios';

// ============================================
// MAIN COMPONENT
// ============================================

export default function GenerationHistory() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  // History data
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    provider: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Selection
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // UI state
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Messages
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // ============================================
  // LOAD HISTORY
  // ============================================
  
  useEffect(() => {
    loadHistory();
  }, [pagination.offset, filters]);
  
  async function loadHistory() {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getHistory({
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset,
      });
      
      setHistory(result.data);
      setPagination(result.pagination);
    } catch (error) {
      console.error('[Load History Error]', error);
      setError(error.message || 'Không thể tải lịch sử');
    } finally {
      setLoading(false);
    }
  }
  
  // ============================================
  // FILTER HANDLERS
  // ============================================
  
  function handleFilterChange(key, value) {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
  }
  
  function handleSearch(searchTerm) {
    handleFilterChange('search', searchTerm);
  }
  
  function clearFilters() {
    setFilters({
      status: '',
      provider: '',
      startDate: '',
      endDate: '',
      search: '',
    });
  }
  
  // ============================================
  // PAGINATION HANDLERS
  // ============================================
  
  function goToNextPage() {
    if (pagination.hasMore) {
      setPagination(prev => ({
        ...prev,
        offset: prev.offset + prev.limit,
      }));
    }
  }
  
  function goToPrevPage() {
    if (pagination.offset > 0) {
      setPagination(prev => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit),
      }));
    }
  }
  
  // ============================================
  // SELECTION HANDLERS
  // ============================================
  
  function toggleSelectAll() {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(history.map(item => item._id));
    }
    setSelectAll(!selectAll);
  }
  
  function toggleSelectItem(id) {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  }
  
  // ============================================
  // ACTION HANDLERS
  // ============================================
  
  async function handleDelete(id) {
    if (!confirm('Bạn có chắc muốn xóa mục này?')) return;
    
    setActionLoading(id);
    
    try {
      await deleteHistory(id);
      setSuccessMessage('Đã xóa thành công!');
      loadHistory();
    } catch (error) {
      console.error('[Delete Error]', error);
      setErrorMessage(error.message || 'Không thể xóa');
    } finally {
      setActionLoading(null);
    }
  }
  
  async function handleDeleteSelected() {
    if (selectedItems.length === 0) return;
    
    if (!confirm(`Bạn có chắc muốn xóa ${selectedItems.length} mục?`)) return;
    
    setActionLoading('batch');
    
    try {
      const result = await deleteHistoryBatch(selectedItems);
      setSuccessMessage(result.message);
      setSelectedItems([]);
      setSelectAll(false);
      loadHistory();
    } catch (error) {
      console.error('[Batch Delete Error]', error);
      setErrorMessage(error.message || 'Không thể xóa nhiều mục');
    } finally {
      setActionLoading(null);
    }
  }
  
  async function handleRegenerate(id) {
    setActionLoading(id);
    
    try {
      const result = await regenerateFromHistory(id);
      setSuccessMessage('Đã tạo lại ảnh thành công!');
      
      // Open result in new tab or show modal
      if (result.data?.imageUrl) {
        window.open(result.data.imageUrl, '_blank');
      }
      
      loadHistory();
    } catch (error) {
      console.error('[Regenerate Error]', error);
      setErrorMessage(error.message || 'Không thể tạo lại ảnh');
    } finally {
      setActionLoading(null);
    }
  }
  
  async function handleDownload(item) {
    if (item.resultImage?.url) {
      const filename = `product-photo-${item._id}.jpg`;
      downloadFile(item.resultImage.url, filename);
      setSuccessMessage('Đã tải xuống ảnh!');
    }
  }
  
  async function handleExport() {
    setActionLoading('export');
    
    try {
      const result = await exportHistory(selectedItems);
      
      // Download as JSON
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `history-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccessMessage('Đã export lịch sử!');
    } catch (error) {
      console.error('[Export Error]', error);
      setErrorMessage(error.message || 'Không thể export');
    } finally {
      setActionLoading(null);
    }
  }
  
  function handleViewDetail(item) {
    setSelectedItem(item);
    setShowDetailModal(true);
  }
  
  // ============================================
  // RENDER HELPERS
  // ============================================
  
  function getStatusBadge(status) {
    const statusConfig = {
      completed: {
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle,
        label: 'Hoàn thành',
      },
      failed: {
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: XCircle,
        label: 'Thất bại',
      },
      processing: {
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: Loader2,
        label: 'Đang xử lý',
      },
      pending: {
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: Clock,
        label: 'Chờ xử lý',
      },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {config.label}
      </span>
    );
  }
  
  function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
  
  function formatDuration(ms) {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
  
  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Clock className="w-8 h-8 text-purple-500" />
                Lịch Sử Tạo Ảnh
              </h1>
              <p className="text-gray-600 mt-2">
                Quản lý và xem lại các ảnh đã tạo
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex bg-white rounded-lg shadow-sm border border-gray-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-l-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-r-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  List
                </button>
              </div>
              
              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={actionLoading === 'export'}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:bg-gray-400"
              >
                {actionLoading === 'export' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export
              </button>
            </div>
          </div>
          
          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Bộ Lọc
              </button>
              
              {/* Clear Filters */}
              {(filters.status || filters.provider || filters.startDate || filters.endDate) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Xóa Bộ Lọc
                </button>
              )}
            </div>
            
            {/* Filter Options */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng Thái
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Tất cả</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="failed">Thất bại</option>
                    <option value="processing">Đang xử lý</option>
                    <option value="pending">Chờ xử lý</option>
                  </select>
                </div>
                
                {/* Provider Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider
                  </label>
                  <select
                    value={filters.provider}
                    onChange={(e) => handleFilterChange('provider', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Tất cả</option>
                    <option value="replicate">Replicate</option>
                    <option value="stability">Stability AI</option>
                    <option value="openai">OpenAI</option>
                    <option value="midjourney">Midjourney</option>
                  </select>
                </div>
                
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Từ Ngày
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Đến Ngày
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Alert Messages */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Lỗi</p>
              <p className="text-red-600 text-sm">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-800 font-medium">Thành công</p>
              <p className="text-green-600 text-sm">{successMessage}</p>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-purple-700 font-medium">
                Đã chọn {selectedItems.length} mục
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteSelected}
                disabled={actionLoading === 'batch'}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 disabled:bg-gray-400"
              >
                {actionLoading === 'batch' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Xóa
              </button>
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          </div>
        )}
        
        {/* Error State */}
        {error && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Không thể tải lịch sử
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadHistory}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Thử Lại
            </button>
          </div>
        )}
        
        {/* Empty State */}
        {!loading && !error && history.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Chưa có lịch sử
            </h3>
            <p className="text-gray-600 mb-4">
              Bạn chưa tạo ảnh nào. Hãy bắt đầu tạo ảnh đầu tiên!
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Tạo Ảnh Ngay
            </a>
          </div>
        )}
        
        {/* History Grid */}
        {!loading && !error && history.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {history.map((item) => (
                  <HistoryCard
                    key={item._id}
                    item={item}
                    isSelected={selectedItems.includes(item._id)}
                    onSelect={() => toggleSelectItem(item._id)}
                    onView={() => handleViewDetail(item)}
                    onDownload={() => handleDownload(item)}
                    onRegenerate={() => handleRegenerate(item._id)}
                    onDelete={() => handleDelete(item._id)}
                    isLoading={actionLoading === item._id}
                    getStatusBadge={getStatusBadge}
                    formatDate={formatDate}
                    formatDuration={formatDuration}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Ảnh
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Preset
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Provider
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Trạng Thái
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Thời Gian
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Ngày Tạo
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        Hành Động
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {history.map((item) => (
                      <HistoryRow
                        key={item._id}
                        item={item}
                        isSelected={selectedItems.includes(item._id)}
                        onSelect={() => toggleSelectItem(item._id)}
                        onView={() => handleViewDetail(item)}
                        onDownload={() => handleDownload(item)}
                        onRegenerate={() => handleRegenerate(item._id)}
                        onDelete={() => handleDelete(item._id)}
                        isLoading={actionLoading === item._id}
                        getStatusBadge={getStatusBadge}
                        formatDate={formatDate}
                        formatDuration={formatDuration}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination */}
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Hiển thị {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} trong tổng số {pagination.total} mục
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevPage}
                  disabled={pagination.offset === 0}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Trước
                </button>
                
                <button
                  onClick={goToNextPage}
                  disabled={!pagination.hasMore}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Sau
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
        
        {/* Detail Modal */}
        {showDetailModal && selectedItem && (
          <DetailModal
            item={selectedItem}
            onClose={() => setShowDetailModal(false)}
            onDownload={() => handleDownload(selectedItem)}
            onRegenerate={() => handleRegenerate(selectedItem._id)}
            onDelete={() => {
              handleDelete(selectedItem._id);
              setShowDetailModal(false);
            }}
            getStatusBadge={getStatusBadge}
            formatDate={formatDate}
            formatDuration={formatDuration}
          />
        )}
        
      </div>
    </div>
  );
}

// ============================================
// HISTORY CARD COMPONENT (Grid View)
// ============================================

function HistoryCard({
  item,
  isSelected,
  onSelect,
  onView,
  onDownload,
  onRegenerate,
  onDelete,
  isLoading,
  getStatusBadge,
  formatDate,
  formatDuration,
}) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 transition-all hover:shadow-lg ${
      isSelected ? 'border-purple-500' : 'border-gray-200'
    }`}>
      {/* Image */}
      <div className="relative aspect-square">
        {item.resultImage?.url ? (
          <img
            src={item.resultImage.url}
            alt="Generated"
            className="w-full h-full object-cover rounded-t-xl"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 rounded-t-xl flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Selection Checkbox */}
        <div className="absolute top-3 left-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="w-5 h-5 text-purple-600 border-2 border-white rounded focus:ring-purple-500 shadow-lg"
          />
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          {getStatusBadge(item.status)}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-800">
            {item.options?.preset || 'Custom'}
          </span>
          <span className="text-xs text-gray-500">
            {item.provider}
          </span>
        </div>
        
        <div className="text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3 h-3" />
            {formatDate(item.createdAt)}
          </div>
          {item.generationTime && (
            <div className="flex items-center gap-2">
              <Info className="w-3 h-3" />
              {formatDuration(item.generationTime)}
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="flex-1 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Xem
          </button>
          
          <button
            onClick={onDownload}
            disabled={!item.resultImage?.url}
            className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
          
          <button
            onClick={onDelete}
            disabled={isLoading}
            className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-300"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HISTORY ROW COMPONENT (List View)
// ============================================

function HistoryRow({
  item,
  isSelected,
  onSelect,
  onView,
  onDownload,
  onRegenerate,
  onDelete,
  isLoading,
  getStatusBadge,
  formatDate,
  formatDuration,
}) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
        />
      </td>
      
      <td className="px-4 py-3">
        {item.resultImage?.url ? (
          <img
            src={item.resultImage.url}
            alt="Generated"
            className="w-12 h-12 object-cover rounded"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </td>
      
      <td className="px-4 py-3 text-sm text-gray-800">
        {item.options?.preset || 'Custom'}
      </td>
      
      <td className="px-4 py-3 text-sm text-gray-600">
        {item.provider}
      </td>
      
      <td className="px-4 py-3">
        {getStatusBadge(item.status)}
      </td>
      
      <td className="px-4 py-3 text-sm text-gray-600">
        {formatDuration(item.generationTime)}
      </td>
      
      <td className="px-4 py-3 text-sm text-gray-600">
        {formatDate(item.createdAt)}
      </td>
      
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onView}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <button
            onClick={onDownload}
            disabled={!item.resultImage?.url}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:text-gray-300"
            title="Tải xuống"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:text-gray-300"
            title="Tạo lại"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
          
          <button
            onClick={onDelete}
            disabled={isLoading}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:text-gray-300"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ============================================
// DETAIL MODAL COMPONENT
// ============================================

function DetailModal({
  item,
  onClose,
  onDownload,
  onRegenerate,
  onDelete,
  getStatusBadge,
  formatDate,
  formatDuration,
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Chi Tiết</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Images */}
            <div className="space-y-4">
              {/* Result Image */}
              {item.resultImage?.url && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Kết Quả</h3>
                  <img
                    src={item.resultImage.url}
                    alt="Result"
                    className="w-full rounded-lg shadow-lg"
                  />
                </div>
              )}
              
              {/* Product Image */}
              {item.productImage?.url && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Ảnh Sản Phẩm</h3>
                  <img
                    src={item.productImage.url}
                    alt="Product"
                    className="w-full rounded-lg shadow-lg"
                  />
                </div>
              )}
              
              {/* Model Image */}
              {item.modelImage?.url && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Ảnh Người Mẫu</h3>
                  <img
                    src={item.modelImage.url}
                    alt="Model"
                    className="w-full rounded-lg shadow-lg"
                  />
                </div>
              )}
            </div>
            
            {/* Metadata */}
            <div className="space-y-4">
              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Trạng Thái</h3>
                {getStatusBadge(item.status)}
              </div>
              
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Preset:</span>
                  <span className="text-sm font-medium text-gray-800">
                    {item.options?.preset || 'Custom'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Provider:</span>
                  <span className="text-sm font-medium text-gray-800">{item.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Thời gian tạo:</span>
                  <span className="text-sm font-medium text-gray-800">
                    {formatDuration(item.generationTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Ngày tạo:</span>
                  <span className="text-sm font-medium text-gray-800">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              </div>
              
              {/* Options */}
              {item.options && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Tùy Chọn</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(item.options).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm text-gray-600">{key}:</span>
                        <span className="text-sm font-medium text-gray-800">
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Error */}
              {item.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-red-700 mb-2">Lỗi</h3>
                  <p className="text-sm text-red-600">{item.error}</p>
                </div>
              )}
              
              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={onDownload}
                  disabled={!item.resultImage?.url}
                  className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300"
                >
                  <Download className="w-5 h-5" />
                  Tải Xuống
                </button>
                
                <button
                  onClick={onRegenerate}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Tạo Lại
                </button>
                
                <button
                  onClick={onDelete}
                  className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
