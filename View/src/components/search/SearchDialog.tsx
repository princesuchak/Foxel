import React, { useState, useEffect } from 'react';
import { Modal, Input, Tabs, Switch, Select, Slider, Space, Button, Typography, Tooltip, message, Divider } from 'antd';
import { SearchOutlined, FileImageOutlined, ClearOutlined } from '@ant-design/icons';
import ImageGrid from '../image/ImageGrid';
import type { PictureResponse } from '../../api';
import './SearchDialog.css';

const { Text, Title } = Typography;

interface SearchDialogProps {
  visible: boolean;
  onClose: () => void;
  initialSearchText?: string;
}

const SearchDialog: React.FC<SearchDialogProps> = ({ 
  visible, 
  onClose,
  initialSearchText = '' 
}) => {
  // 搜索参数状态
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [useVectorSearch, setUseVectorSearch] = useState(true);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.35);
  const [activeTabKey, setActiveTabKey] = useState('vector');
  
  // 搜索结果状态
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [, setSearchResults] = useState<PictureResponse[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  // 添加搜索标识符，用于强制触发新搜索
  const [searchId, setSearchId] = useState(1);
  
  // 使用activeSearchParams存储当前搜索参数
  const [activeSearchParams, setActiveSearchParams] = useState({
    searchQuery: '',
    tags: [] as string[],
    useVectorSearch: true,
    similarityThreshold: 0.35,
    _searchId: 1, // 添加搜索ID用于区分不同搜索请求
  });

  // 示例标签选项，实际应用中可能需要从API获取
  const tagOptions = [
    { value: 'nature', label: '自然' },
    { value: 'city', label: '城市' },
    { value: 'people', label: '人物' },
    { value: 'animals', label: '动物' },
    { value: 'food', label: '美食' },
    { value: 'travel', label: '旅行' },
    { value: 'architecture', label: '建筑' },
  ];

  // 当对话框打开或初始搜索文本变更时，更新搜索框中的文本，但不自动搜索
  useEffect(() => {
    if (visible && initialSearchText) {
      setSearchText(initialSearchText);
    }
  }, [visible, initialSearchText]);

  // 重置搜索表单但保持向量搜索默认设置
  const resetSearch = () => {
    setSearchText('');
    setSelectedTags([]);
    setUseVectorSearch(true); // 保持默认使用向量搜索
    setSimilarityThreshold(0.35); // 保持默认阈值
    setSearchPerformed(false);
    setSearchResults([]);
    setTotalResults(0);
    setCurrentPage(1);
    setActiveTabKey('vector'); // 保持默认选择向量搜索标签
    setActiveSearchParams({
      searchQuery: '',
      tags: [],
      useVectorSearch: true,
      similarityThreshold: 0.35,
      _searchId: searchId, // 保持当前searchId或重置为1
    });
  };

  // 当对话框关闭时重置搜索表单
  useEffect(() => {
    if (!visible) {
      resetSearch();
    }
  }, [visible]);

  // 执行搜索 - 修改为仅在点击搜索按钮时调用
  const handleSearch = () => {
    // 搜索前先检查是否有搜索条件，避免空搜索
    if (!searchText.trim() && selectedTags.length === 0 && !useVectorSearch) {
      message.info('请输入搜索关键词或选择搜索条件');
      return;
    }
    
    // 增加搜索ID，确保每次搜索都是唯一的
    const newSearchId = searchId + 1;
    setSearchId(newSearchId);
    
    setLoading(true);
    setSearchPerformed(true);
    
    // 更新活动搜索参数，这将触发ImageGrid组件进行搜索
    setActiveSearchParams({
      searchQuery: searchText,
      tags: selectedTags,
      useVectorSearch,
      similarityThreshold: useVectorSearch ? similarityThreshold : 0.35,
      _searchId: newSearchId, // 添加唯一标识符以强制触发新搜索
    });
  };

  // 处理图片加载完成事件
  const handleImagesLoaded = (images: PictureResponse[], totalCount: number) => {
    setSearchResults(images);
    setTotalResults(totalCount);
    setLoading(false); // 图片加载完成后关闭加载状态
    
    // 如果搜索结果为空且已执行搜索，显示友好提示
    if (images.length === 0 && searchPerformed) {
      message.info('没有找到匹配的图片');
    }
  };

  return (
    <Modal
      title={
        <div className="search-dialog-title">
          <SearchOutlined style={{ marginRight: 10 }} />
          高级图片搜索
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={null}
      className="search-dialog"
      destroyOnHidden
    >
      <Tabs
        activeKey={activeTabKey}
        onChange={setActiveTabKey}
        className="search-tabs"
        items={[
          {
            key: "text",
            label: <span><SearchOutlined /> 文本搜索</span>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div className="search-input-container">
                  <Input.Search
                    placeholder="输入关键词搜索图片..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onSearch={handleSearch}
                    enterButton
                    allowClear
                    size="large"
                    autoFocus={activeTabKey === 'text'}
                  />
                </div>
                
                <Divider orientation="left" plain>筛选选项</Divider>
                
                <div className="search-option-group">
                  <Text strong className="option-label">标签筛选:</Text>
                  <Select
                    mode="multiple"
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="选择标签进行筛选"
                    value={selectedTags}
                    onChange={setSelectedTags}
                    options={tagOptions}
                    maxTagCount={5}
                  />
                </div>
                
                <div className="search-button-container">
                  <Button 
                    type="primary" 
                    icon={<SearchOutlined />} 
                    onClick={handleSearch}
                    size="large"
                    block
                    disabled={loading}
                    loading={loading}
                  >
                    {loading ? '搜索中...' : '开始搜索'}
                  </Button>
                </div>
              </Space>
            )
          },
          {
            key: "vector",
            label: <span><FileImageOutlined /> 向量搜索</span>,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div className="search-input-container">
                  <Input.Search
                    placeholder="输入关键词辅助搜索..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    onSearch={handleSearch}
                    enterButton
                    allowClear
                    size="large"
                    autoFocus={activeTabKey === 'vector'}
                  />
                </div>
                
                <Divider orientation="left" plain>高级选项</Divider>
                
                <div className="search-option-group vector-options">
                  <div className="vector-switch-container">
                    <Switch 
                      checked={useVectorSearch} 
                      onChange={setUseVectorSearch}
                    />
                    <Text strong style={{ marginLeft: 8 }}>启用向量相似度搜索</Text>
                    <Tooltip title="向量搜索可以查找视觉上相似的图片，而不仅仅是匹配标签或文本">
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        (基于图像内容的相似度搜索)
                      </Text>
                    </Tooltip>
                  </div>
                  
                  {useVectorSearch && (
                    <div className="threshold-slider-container">
                      <Text>相似度阈值：{similarityThreshold.toFixed(2)}</Text>
                      <Slider 
                        min={0.1} 
                        max={1.0} 
                        step={0.05}
                        value={similarityThreshold}
                        onChange={setSimilarityThreshold}
                        marks={{
                          0.1: '低',
                          0.5: '中',
                          0.9: '高'
                        }}
                        className="threshold-slider"
                      />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        较高的阈值会返回更相似的结果，但可能减少结果数量
                      </Text>
                    </div>
                  )}
                </div>
                
                <div className="search-button-container">
                  <Button 
                    type="primary" 
                    icon={<SearchOutlined />} 
                    onClick={handleSearch}
                    size="large"
                    block
                    disabled={loading}
                    loading={loading}
                  >
                    {loading ? '搜索中...' : '开始搜索'}
                  </Button>
                </div>
              </Space>
            )
          }
        ]}
      />

      {searchPerformed && (
        <div className="search-results">
          <div className="search-results-header">
            <Title level={4}>
              搜索结果 <span className="result-count">({totalResults})</span>
            </Title>
            <Button 
              onClick={resetSearch}
              disabled={loading}
              icon={<ClearOutlined />}
            >
              清除搜索
            </Button>
          </div>
          
          <ImageGrid
            queryParams={activeSearchParams}
            loading={loading}
            onImagesLoaded={handleImagesLoaded}
            defaultPage={currentPage}
            onPageChange={(page) => setCurrentPage(page)}
            emptyText="没有找到匹配的图片"
            showPagination={totalResults > 0}
          />
        </div>
      )}
    </Modal>
  );
};

export default SearchDialog;
