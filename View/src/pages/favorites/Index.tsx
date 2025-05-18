import { useState, useRef, useMemo, useCallback } from 'react';
import { Typography, Button, Dropdown } from 'antd';
import { SortAscendingOutlined } from '@ant-design/icons';
import type { PictureResponse } from '../../api';
import ImageGrid from '../../components/image/ImageGrid';

const { Title } = Typography;

function Favorites() {
  const [images, setImages] = useState<PictureResponse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [sortBy, setSortBy] = useState<string>('uploadDate_desc');

  // 使用useRef记忆sortBy值，避免重复渲染
  const sortByRef = useRef(sortBy);

  // 优化handleSortChange，减少不必要的状态更新
  const handleSortChange = (newSortBy: string) => {
    if (sortBy !== newSortBy) {
      setSortBy(newSortBy);
      sortByRef.current = newSortBy;
    }
  };

  // 使用useMemo创建稳定的queryParams对象
  const queryParamsObject = useMemo(() => {
    return { 
      sortBy,
      onlyFavorites: true
    };
  }, [sortBy]);

  const handleToggleFavorite = (image: PictureResponse) => {
    // 处理收藏/取消收藏
    setImages(prevImages =>
      prevImages.map(img =>
        img.id === image.id ? {
          ...img,
          isFavorited: !img.isFavorited,
          favoriteCount: img.isFavorited
            ? Math.max(0, img.favoriteCount - 1)
            : img.favoriteCount + 1
        } : img
      )
    );
  };

  // 当分页变化时，保存当前浏览的页码
  const handlePageChange = (page: number, pageSize: number) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  const handleImagesLoaded = useCallback((loadedImages: PictureResponse[]) => {
    if (images.length === 0) {
      setImages(loadedImages);
    }
  }, [images.length]);

  const sortMenu = {
    items: [
      { key: 'takenAt_desc', label: '最新拍摄' },
      { key: 'takenAt_asc', label: '最早拍摄' },
      { key: 'uploadDate_desc', label: '最新收藏' },
      { key: 'uploadDate_asc', label: '最早收藏' },
      { key: 'name_asc', label: '名称 A-Z' },
      { key: 'name_desc', label: '名称 Z-A' },
    ],
    onClick: ({ key }: { key: string }) => handleSortChange(key),
  };

  return (
    <>
      <div style={{
        marginBottom: 50,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <div>
          <Title level={2} style={{ 
            margin: 0, 
            marginBottom: 10, 
            fontWeight: 600, 
            letterSpacing: '0.5px',
            fontSize: 32,
            background: 'linear-gradient(120deg, #000000, #444444)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>收藏</Title>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Dropdown menu={sortMenu} placement="bottomRight">
            <Button style={{
              borderRadius: 10,
              height: 46,
              border: '1px solid #f0f0f0',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 15,
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              background: '#ffffff'
            }}>
              <SortAscendingOutlined />
              排序方式
            </Button>
          </Dropdown>
        </div>
      </div>

      <ImageGrid
        queryParams={queryParamsObject}
        pageSize={pageSize}
        defaultPage={currentPage}
        onPageChange={handlePageChange}
        onToggleFavorite={handleToggleFavorite}
        showFavoriteCount={true}
        onImagesLoaded={handleImagesLoaded}
      />
    </>
  );
}

export default Favorites;
