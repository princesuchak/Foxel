import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Typography, Empty, message, Pagination, Modal } from 'antd';
import {
  HeartOutlined, HeartFilled, LockOutlined, GlobalOutlined, TeamOutlined,
  DeleteOutlined, EditOutlined, DownloadOutlined, ShareAltOutlined
} from '@ant-design/icons';
import type { PictureResponse } from '../../api';
import { favoritePicture, unfavoritePicture, getPictures, deleteMultiplePictures } from '../../api';
import ImageViewer from './ImageViewer';
import ShareImageDialog from './ShareImageDialog';
import './ImageGrid.css';
import { useAuth } from '../../api/AuthContext';

const { Text } = Typography;

const permissionTypeMap: Record<number, { label: string; icon: React.ReactNode; color: string }> = {
  0: { label: '公开', icon: <GlobalOutlined />, color: '#52c41a' },
  1: { label: '好友可见', icon: <TeamOutlined />, color: '#1890ff' },
  2: { label: '私人', icon: <LockOutlined />, color: '#ff4d4f' }
};

const formatDate = (dateString: string) => {
  try {
    if (!dateString) return '-';
    const date = new Date(dateString);

    if (isNaN(date.getTime())) return '-';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('日期格式化错误:', error);
    return '-';
  }
};

// 简化API参数接口
interface PaginationParams {
  page: number;
  pageSize: number;
  albumId?: number;
  excludeAlbumId?: number;
  onlyFavorites?: boolean;
  tags?: string;
  searchQuery?: string;
  sortBy?: string;
  includeAllPublic?: boolean;
  useVectorSearch?: boolean;
  similarityThreshold?: number;
}

// 右键菜单类型接口
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  imageId?: number;
  image?: PictureResponse;
}

// 简化Props接口，使用默认值
interface ImageGridProps {
  // 核心功能属性
  onToggleFavorite?: (image: PictureResponse) => void;
  showFavoriteCount?: boolean;
  emptyText?: string;
  showPagination?: boolean;

  // 数据源属性集合
  dataSource?: PictureResponse[];
  totalImages?: number;
  loading?: boolean;

  // 合并查询相关参数
  queryParams?: {
    albumId?: number;
    excludeAlbumId?: number;
    onlyFavorites?: boolean;
    tags?: string[];
    searchQuery?: string; 
    sortBy?: string;
    includeAllPublic?: boolean;
    useVectorSearch?: boolean;
    similarityThreshold?: number;
    _searchId?: number; // 添加搜索ID属性
  };

  // 分页相关属性
  pageSize?: number;
  defaultPage?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  onImagesLoaded?: (images: PictureResponse[], totalCount: number) => void;

  // 选择模式相关属性
  selectedIds?: number[];
  selectable?: boolean;
  onSelectionChange?: (selectedIds: number[]) => void;

  // 新增操作回调
  onDelete?: (image: PictureResponse) => void;
  onEdit?: (image: PictureResponse) => void;
  onDownload?: (image: PictureResponse) => void;
  onShare?: (image: PictureResponse) => void;
}


const ImageGrid: React.FC<ImageGridProps> = ({
  // 使用解构赋值时直接设置默认值
  onToggleFavorite,
  showFavoriteCount = false,
  emptyText = "暂无图片",
  showPagination = true,

  dataSource,
  totalImages: externalTotalImages,
  loading: externalLoading,

  queryParams = {},

  pageSize: externalPageSize = 20,
  defaultPage = 1,
  onPageChange,
  onImagesLoaded,

  selectedIds = [],
  selectable = false,
  onSelectionChange,

  onDelete,
  onEdit,
  onDownload,
  onShare,
}) => {
  // 获取当前登录用户信息
  const { user, hasRole } = useAuth();
  
  // 使用更紧凑的状态定义
  const [images, setImages] = useState<PictureResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(defaultPage);
  const [pageSize, setPageSize] = useState(externalPageSize);
  const [totalImages, setTotalImages] = useState(0);
  const [viewerState, setViewerState] = useState({ visible: false, index: 0 });
  const [shareDialogState, setShareDialogState] = useState<{
    visible: boolean;
    image: PictureResponse | null;
  }>({
    visible: false,
    image: null
  });

  // 添加右键菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });


  // 简化标志变量
  const isUsingExternalData = !!dataSource;
  const isLoading = isUsingExternalData ? externalLoading : loading;

  // 请求状态追踪
  const requestState = useRef({ 
    inProgress: false, 
    lastParams: '',
    noResultsFor: '' // 新增：记录哪些查询参数没有返回结果
  });

  // 优化构建查询参数函数
  const buildQueryParams = useCallback((): PaginationParams => {
    const params: PaginationParams = {
      page: currentPage,
      pageSize,
      ...queryParams,
      searchQuery: queryParams.searchQuery,
      tags: Array.isArray(queryParams.tags) ? queryParams.tags.join(',') : undefined,
      useVectorSearch: queryParams.useVectorSearch,
      similarityThreshold: queryParams.similarityThreshold
    };
    return params;
  }, [currentPage, pageSize, queryParams]);

  // 优化加载数据函数，减少依赖项
  const loadImages = useCallback(async () => {
    if (isUsingExternalData || requestState.current.inProgress) return;

    const params = buildQueryParams();
    const paramsString = JSON.stringify(params);

    // 检查是否是已知没有结果的查询
    if (requestState.current.noResultsFor === paramsString) {
      // 如果这个查询之前没有结果，且当前还是空结果状态，不再重复请求
      if (images.length === 0) {
        return;
      }
      // 如果之前没结果但现在有图片显示，重置noResultsFor让新查询可以执行
      requestState.current.noResultsFor = '';
    }

    if (requestState.current.lastParams === paramsString) {
      // 如果参数没变且已有数据或无数据状态已确认，跳过请求
      return;
    }

    requestState.current = { 
      inProgress: true, 
      lastParams: paramsString, 
      noResultsFor: requestState.current.noResultsFor 
    };
    
    setLoading(true);

    try {
      const result = await getPictures(params);

      // 无论成功与否，都更新lastParams以避免相同参数的重复请求
      requestState.current.lastParams = paramsString;
      
      if (result.success) {
        // 更新图片数据
        setImages(result.data || []);
        setTotalImages(result.totalCount || 0);
        onImagesLoaded?.(result.data || [], result.totalCount || 0);
        
        // 如果结果为空，记录到noResultsFor
        if (!result.data || result.data.length === 0) {
          requestState.current.noResultsFor = paramsString;
        }
      } else {
        message.error(result.message || '获取图片失败');
        requestState.current.noResultsFor = paramsString;
      }
    } catch (error) {
      message.error('加载图片列表出错');
      requestState.current.noResultsFor = paramsString;
    } finally {
      setLoading(false);
      requestState.current.inProgress = false;
    }
  }, [buildQueryParams, isUsingExternalData, onImagesLoaded]);

  // 简化useEffect
  useEffect(() => {
    if (!isUsingExternalData) loadImages();
  }, [loadImages, isUsingExternalData]);

  // 同步外部数据
  useEffect(() => {
    if (isUsingExternalData && dataSource) setImages(dataSource);
  }, [dataSource, isUsingExternalData]);

  // 优化收藏/取消收藏逻辑
  const handleToggleFavorite = async (image: PictureResponse) => {
    try {
      const { id, isFavorited } = image;
      const api = isFavorited ? unfavoritePicture : favoritePicture;
      const result = await api(id);

      if (result.success) {
        message.success(isFavorited ? '已取消收藏' : '已添加到收藏');

        // 更新本地状态
        setImages(prevImages =>
          prevImages.map(img =>
            img.id === id ? {
              ...img,
              isFavorited: !isFavorited,
              favoriteCount: isFavorited
                ? Math.max(0, (img.favoriteCount || 0) - 1)
                : (img.favoriteCount || 0) + 1
            } : img
          )
        );

        onToggleFavorite?.(image);
      } else {
        message.error(result.message || (isFavorited ? '取消收藏失败' : '收藏失败'));
      }
    } catch (error) {
      message.error('操作失败，请重试');
    }
  };

  // 处理分页变化
  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    if (size !== pageSize) setPageSize(size);
    onPageChange?.(page, size);
  };

  // 优化图片点击处理逻辑
  const handleImageClick = (image: PictureResponse, index: number) => {
    if (selectable && onSelectionChange) {
      const isSelected = selectedIds.includes(image.id);
      const newSelectedIds = isSelected
        ? selectedIds.filter(id => id !== image.id)
        : [...selectedIds, image.id];
      onSelectionChange(newSelectedIds);
    } else {
      setViewerState({ visible: true, index });
    }
  };

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, image: PictureResponse) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      imageId: image.id,
      image
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({
      ...prev,
      visible: false
    }));
  };

  useEffect(() => {
    const handleDocumentClick = () => {
      if (contextMenu.visible) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [contextMenu.visible]);

  // 处理图片分享
  const handleShareImage = (image: PictureResponse) => {
    setShareDialogState({
      visible: true,
      image
    });
  };

  // 关闭分享对话框
  const handleCloseShareDialog = () => {
    setShareDialogState({
      ...shareDialogState,
      visible: false
    });
  };

  // 修改handleMenuAction中的分享处理
  const handleMenuAction = (action: string) => {
    if (!contextMenu.image) return;

    switch (action) {
      case 'favorite':
        handleToggleFavorite(contextMenu.image);
        break;
      case 'delete':
        handleDeleteImage(contextMenu.image);
        break;
      case 'edit':
        onEdit?.(contextMenu.image);
        break;
      case 'download':
        onDownload?.(contextMenu.image);
        break;
      case 'share':
        handleShareImage(contextMenu.image);
        break;
      default:
        break;
    }

    closeContextMenu();
  };

  // 判断用户是否有权限编辑或删除图片
  const canEditImage = (image: PictureResponse): boolean => {
    if (user && hasRole('Administrator')) {
      return true;
    }
    return !!user && !!image.userId && user.id === image.userId;
  };
  
  // 优化渲染内容函数
  const renderContent = () => {
    // 渲染加载状态
    if (isLoading) {
      return (
        <div className="image-grid">
          {Array.from({ length: pageSize }).map((_, index) => (
            <div key={`loading-${index}`} className="custom-card image-loading-effect">
              <div className="custom-card-cover" style={{ background: '#f5f5f5' }}>
                {/* 简单的加载状态 */}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // 渲染空状态
    if (images.length === 0) {
      return (
        <Empty
          description={emptyText}
          style={{ margin: '80px 0' }}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    // 渲染图片网格
    return (
      <div className="image-grid">
        {images.map((image, index) => {
          const isOwner = canEditImage(image);

          return (
            <div
              key={image.id}
              className={`custom-card ${selectedIds.includes(image.id) ? 'custom-card-selected' : ''} ${selectable ? 'custom-card-selectable-mode' : ''}`}
              onClick={() => handleImageClick(image, index)}
              onContextMenu={(e) => handleContextMenu(e, image)}
            >
              <div className="custom-card-cover">
                <img
                  alt={image.name}
                  src={image.thumbnailPath || image.path}
                  className="custom-card-thumbnail"
                />

                {!selectable && (
                  <>
                    {/* 顶部指示器 - 悬停时显示 */}
                    <div className="custom-card-indicators">
                      <div className="custom-card-permission" style={{
                        backgroundColor: permissionTypeMap[image.permission]?.color || 'rgba(0, 0, 0, 0.6)'
                      }}>
                        {permissionTypeMap[image.permission]?.icon} {permissionTypeMap[image.permission]?.label || '公开'}
                      </div>

                      <div className="custom-card-metadata">
                        {image.exifInfo && image.exifInfo.width && image.exifInfo.height
                          ? `${Math.round(image.exifInfo.width * image.exifInfo.height / 1000000)}MP`
                          : 'N/A'}
                        {' | '}
                        {formatDate(
                          typeof image.takenAt === 'string'
                            ? image.takenAt
                            : image.takenAt
                              ? image.takenAt.toISOString()
                              : typeof image.createdAt === 'string'
                                ? image.createdAt
                                : image.createdAt.toISOString()
                        )}
                      </div>
                    </div>

                    {/* 悬停时显示的信息覆盖层 */}
                    <div className="custom-card-overlay">
                      <div className="custom-card-info">
                        <div className="custom-card-title">{image.name}</div>

                        {image.tags && (
                          <div className="custom-card-tags-container">
                            {image.tags.map(tag => (
                              <Text key={tag} className="image-tag">#{tag}</Text>
                            ))}
                          </div>
                        )}

                        <div className="custom-card-actions">
                          <div
                            className="custom-card-action-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(image);
                            }}
                          >
                            {image.isFavorited ? (
                              <HeartFilled style={{ fontSize: 16, color: '#ff4d4f' }} />
                            ) : (
                              <HeartOutlined style={{ fontSize: 16, color: '#ffffff' }} />
                            )}
                          </div>

                          {isOwner && (
                            <div
                              className="custom-card-action-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit && onEdit(image);
                              }}
                            >
                              <EditOutlined style={{ fontSize: 16, color: '#ffffff' }} />
                            </div>
                          )}

                          <div
                            className="custom-card-action-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              onShare?.(image);
                            }}
                          >
                            <ShareAltOutlined style={{ fontSize: 16, color: '#ffffff' }} />
                          </div>

                          <div
                            className="custom-card-action-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownload?.(image);
                            }}
                          >
                            <DownloadOutlined style={{ fontSize: 16, color: '#ffffff' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染右键菜单
  const renderContextMenu = () => {
    if (!contextMenu.visible) return null;

    const menuStyle = {
      position: 'fixed' as const,
      top: contextMenu.y,
      left: contextMenu.x,
    };

    const currentImage = contextMenu.image;
    if (!currentImage) return null;
    
    const isFavorited = currentImage.isFavorited;
    const isOwner = canEditImage(currentImage);

    return (
      <div className="context-menu" style={menuStyle}>
        <div
          className="context-menu-item"
          onClick={() => handleMenuAction('favorite')}
        >
          {isFavorited ? (
            <><HeartFilled style={{ color: '#ff4d4f' }} /> 取消收藏</>
          ) : (
            <><HeartOutlined /> 收藏</>
          )}
        </div>

        <div
          className="context-menu-item"
          onClick={() => handleMenuAction('download')}
        >
          <DownloadOutlined /> 下载
        </div>

        {isOwner && (
          <div
            className="context-menu-item"
            onClick={() => handleMenuAction('edit')}
          >
            <EditOutlined /> 编辑
          </div>
        )}

        <div
          className="context-menu-item"
          onClick={() => handleMenuAction('share')}
        >
          <ShareAltOutlined /> 分享
        </div>

        {isOwner && (
          <div
            className="context-menu-item"
            style={{ color: '#ff4d4f' }}
            onClick={() => handleMenuAction('delete')}
          >
            <DeleteOutlined /> 删除
          </div>
        )}
      </div>
    );
  };

  // 处理删除图片
  const handleDeleteImage = async (image: PictureResponse) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除图片 "${image.name}" 吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await deleteMultiplePictures( [image.id] );
          
          if (result.success) {
            message.success('图片已成功删除');
            
            // 更新本地图片列表，移除被删除的图片
            setImages(prevImages => 
              prevImages.filter(img => img.id !== image.id)
            );
            
            onDelete?.(image);
            
            if (images.length === 1 && currentPage > 1) {
              setCurrentPage(currentPage - 1);
            }
          } else {
            message.error(result.message || '删除图片失败');
          }
        } catch (error) {
          message.error('删除图片失败，请重试');
        }
      },
    });
  };
  
  // 简化组件返回结构
  return (
    <>
      {renderContent()}
      {renderContextMenu()}

      {showPagination && images.length > 0 && (
        <div className="image-grid-pagination">
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={isUsingExternalData ? (externalTotalImages || 0) : totalImages}
            onChange={handlePageChange}
            showSizeChanger
            showQuickJumper
            locale={{
              // 添加完整的中文本地化配置
              items_per_page: '条/页',
              jump_to: '跳至',
              jump_to_confirm: '确定',
              page: '页',
              prev_page: '上一页',
              next_page: '下一页',
              prev_5: '向前 5 页',
              next_5: '向后 5 页',
              prev_3: '向前 3 页',
              next_3: '向后 3 页'
            }}
            pageSizeOptions={['8', '16', '32', '64']}
            showTotal={(total) => `共 ${total} 张图片`}
            size="default"
          />
        </div>
      )}

      <ImageViewer
        visible={viewerState.visible}
        onClose={() => setViewerState({ ...viewerState, visible: false })}
        images={images}
        initialIndex={viewerState.index}
        onFavorite={onToggleFavorite || handleToggleFavorite}
        showFavoriteCount={showFavoriteCount}
        onShare={handleShareImage}
      />

      <ShareImageDialog
        visible={shareDialogState.visible}
        onClose={handleCloseShareDialog}
        image={shareDialogState.image}
      />
    </>
  );
};

export default ImageGrid;
