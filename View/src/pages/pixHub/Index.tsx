import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Input,
  Select,
  Button,
  Divider,
  Typography,
  Space,
} from 'antd';
import {
  FireOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';

import ImageGrid from '../../components/image/ImageGrid';
import type { PictureResponse } from '../../api/types';
import { getFilteredTags } from '../../api/tagApi';
import useIsMobile from '../../hooks/useIsMobile';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

const PixHub: React.FC = () => {
  const isMobile = useIsMobile();
  const [activeCategory, setActiveCategory] = useState('全部');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<string[]>(['全部']);
  const [loading, setLoading] = useState(true);

  // 获取热门标签
  useEffect(() => {
    const fetchTopTags = async () => {
      try {
        setLoading(true);
        const response = await getFilteredTags({
          page: 1,
          pageSize: 8, // 只获取8个最热门的标签
          sortBy: 'pictureCount',
          sortDirection: 'desc'
        });

        if (response.success && response.data.length > 0) {
          // 始终保持"全部"作为第一个选项，然后添加从API获取的标签
          const tagNames = response.data.map(tag => tag.name);
          setCategories(['全部', ...tagNames]);
        }
      } catch (error) {
        console.error('获取热门标签失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopTags();
  }, []);

  // 处理分页变化
  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  // 处理图片加载完成回调
  const handleImagesLoaded = (_: PictureResponse[], total: number) => {
    setTotalCount(total);
  };

  // 构建查询参数
  const queryParams = {
    search: searchQuery || undefined,
    tags: activeCategory !== '全部' ? [activeCategory] : undefined,
    sortBy: sortBy === 'popular' ? 'favoriteCount_desc' :
      sortBy === 'newest' ? 'newest' :
        'oldest',
    includeAllPublic: true,
  };

  return (
    <div className="image-square">
      <div className="page-header" style={{ marginBottom: isMobile ? 20 : 32 }}>
        <Row gutter={[24, isMobile ? 12 : 24]} align="middle">
          <Col lg={10} md={12} sm={24} xs={24}>
            <Title level={2} style={{ 
              marginBottom: 8, 
              fontWeight: 600,
              fontSize: isMobile ? 24 : 30,
              textAlign: isMobile ? 'center' : 'left' 
            }}>
              图片广场
              {!isMobile && (
                <Text style={{ fontSize: 16, fontWeight: 400, marginLeft: 12, color: '#8c8c8c' }}>
                  探索世界各地的精彩瞬间
                </Text>
              )}
            </Title>
            {isMobile && (
              <Text style={{ 
                fontSize: 14, 
                fontWeight: 400, 
                color: '#8c8c8c',
                display: 'block',
                textAlign: 'center'
              }}>
                探索世界各地的精彩瞬间
              </Text>
            )}
            <Paragraph style={{ 
              color: '#666666',
              textAlign: isMobile ? 'center' : 'left',
              marginBottom: isMobile ? 5 : 'inherit' 
            }}>
              发现创作者分享的高质量摄影作品，获取灵感，找到你喜爱的风格
            </Paragraph>
          </Col>

          <Col lg={14} md={12} sm={24} xs={24}>
            <Row gutter={[16, 16]} justify={isMobile ? "center" : "end"}>
              <Col lg={16} md={16} sm={16} xs={24}>
                <Search
                  placeholder="搜索图片、标签或创作者"
                  allowClear
                  enterButton={<SearchOutlined />}
                  size={isMobile ? "middle" : "large"}
                  onSearch={(value) => setSearchQuery(value)}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col lg={8} md={8} sm={8} xs={24}>
                <Select
                  style={{ width: '100%' }}
                  size={isMobile ? "middle" : "large"}
                  value={sortBy}
                  onChange={(value) => setSortBy(value)}
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="popular">热门优先</Option>
                  <Option value="newest">最新发布</Option>
                  <Option value="oldest">最早发布</Option>
                </Select>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>

      <div className="category-nav" style={{ 
        marginBottom: isMobile ? 20 : 28, 
        overflowX: 'auto',
        paddingBottom: 8
      }}>
        <Space size={[isMobile ? 8 : 12, isMobile ? 10 : 20]} wrap style={{ justifyContent: 'center' }}>
          {categories.map(category => (
            <Button
              key={category}
              type={activeCategory === category ? "primary" : "default"}
              shape="round"
              size={isMobile ? "middle" : "large"}
              onClick={() => setActiveCategory(category)}
              style={{
                fontWeight: 500,
                minWidth: isMobile ? 70 : 80,
                boxShadow: activeCategory === category ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
              }}
              icon={category === '全部' ? <ThunderboltOutlined /> : null}
              loading={category === '全部' ? loading : false}
            >
              {category}
            </Button>
          ))}
        </Space>
      </div>

      <Divider style={{ margin: isMobile ? '16px 0' : '24px 0' }} />

      <div className="results-info" style={{ marginBottom: isMobile ? 16 : 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Text style={{ fontSize: isMobile ? 14 : 15 }}>
              找到 <strong>{totalCount}</strong> 张图片
              {activeCategory !== '全部' && <span> · {activeCategory}分类</span>}
              {searchQuery && <span> · 搜索"{searchQuery}"</span>}
            </Text>
          </Col>
          <Col>
            <Space>
              <FireOutlined style={{ color: '#ff4d4f' }} />
              <Text type="secondary">热门推荐</Text>
            </Space>
          </Col>
        </Row>
      </div>

      <ImageGrid
        queryParams={queryParams}
        pageSize={pageSize}
        defaultPage={currentPage}
        onPageChange={handlePageChange}
        showFavoriteCount={true}
        onImagesLoaded={handleImagesLoaded}
        emptyText="未找到匹配的图片，请尝试更改搜索条件或选择其他分类"
      />
    </div>
  );
};

export default PixHub;
