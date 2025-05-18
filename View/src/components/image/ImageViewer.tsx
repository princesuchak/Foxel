import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Space, Dropdown, message } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  HeartOutlined,
  HeartFilled,
  DownloadOutlined,
  ShareAltOutlined,
  FolderAddOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { PictureResponse, AlbumResponse } from '../../api/types';
import { getAlbums, addPicturesToAlbum, favoritePicture, unfavoritePicture } from '../../api';
import ImageInfo from './ImageInfo';
import ShareImageDialog from './ShareImageDialog';
import './ImageViewer.css';


interface ImageViewerProps {
  visible: boolean;
  onClose: () => void;
  images: PictureResponse[];
  initialIndex?: number;
  onFavorite?: (image: PictureResponse) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  showFavoriteCount?: boolean;
  onShare?: (image: PictureResponse) => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  onClose,
  images,
  initialIndex = 0,
  onFavorite,
  onNext,
  onPrevious,
  showFavoriteCount = false, // 默认不显示收藏数量
  onShare,
}) => {
  const wasVisible = useRef(visible);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [albums, setAlbums] = useState<AlbumResponse[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [localImages, setLocalImages] = useState<PictureResponse[]>(images);
  const [shareDialogVisible, setShareDialogVisible] = useState(false);

  // 保留加载状态跟踪，但不再用于显示缩略图
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false); // 新增：控制是否显示原图

  // 保留防缓存机制
  const [cacheKey, setCacheKey] = useState<number>(Date.now());

  // 当前显示的图片
  const currentImage = localImages[currentIndex];

  // 重置查看器状态，包含图片加载状态
  const resetViewerState = useCallback(() => {
    setRotation(0);
    setIsInfoDrawerOpen(false);
    setImageLoaded(false); // 重置图片加载状态
    setShowOriginal(false); // 重置为显示缩略图
    setCacheKey(Date.now()); // 每次重置时更新缓存键
  }, []);

  useEffect(() => {
    setImageLoaded(false);
    setShowOriginal(false); // 切换图片时重置为缩略图模式
  }, [currentIndex]);

  // 监听visible变化的处理
  useEffect(() => {
    // 当查看器从不可见变为可见时
    if (visible && !wasVisible.current) {
      if (initialIndex >= 0 && initialIndex < images.length) {
        setCurrentIndex(initialIndex);
      }
      resetViewerState();
    }
    // 当查看器从可见变为不可见时
    else if (!visible && wasVisible.current) {
      // 关闭后等待一小段时间再更新缓存键，确保下次打开时强制刷新图片
      setTimeout(() => setCacheKey(Date.now()), 300);
    }

    // 更新ref以跟踪visible的变化
    wasVisible.current = visible;
  }, [visible, initialIndex, images.length, resetViewerState]);

  // 当currentIndex变化时，重置图片加载状态并更新缓存键
  useEffect(() => {
    setImageLoaded(false);
    setShowOriginal(false); // 重置为缩略图模式
    setCacheKey(Date.now());
  }, [currentIndex]);

  // 当外部传入的images发生变化时，更新本地缓存
  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;

      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Escape':
          onClose();
          break;
        case 'i':
          setIsInfoDrawerOpen(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, currentIndex, images.length]);

  // 处理上一张图片
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prevIndex => prevIndex - 1);
      if (onPrevious) onPrevious();
    }
  }, [currentIndex, onPrevious]);

  // 处理下一张图片
  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prevIndex => prevIndex + 1);
      if (onNext) onNext();
    }
  }, [currentIndex, images.length, onNext]);

  // 处理收藏按钮点击
  const handleFavoriteClick = useCallback(async () => {
    if (!currentImage) return;

    try {
      // 如果提供了onFavorite回调，直接使用它，不再重复发送请求
      if (onFavorite) {
        onFavorite(currentImage);
        return;
      }

      // 只有在没有提供onFavorite回调时才直接发送网络请求
      let result;
      if (currentImage.isFavorited) {
        result = await unfavoritePicture(currentImage.id);
        if (result.success) {
          message.success('已取消收藏');
        } else {
          message.error(result.message || '取消收藏失败');
          return; // 如果请求失败，不更新UI状态
        }
      } else {
        result = await favoritePicture(currentImage.id);
        if (result.success) {
          message.success('已添加到收藏');
        } else {
          message.error(result.message || '收藏失败');
          return; // 如果请求失败，不更新UI状态
        }
      }

      // 请求成功后，更新本地状态
      setLocalImages(prevImages =>
        prevImages.map(img =>
          img.id === currentImage.id ? {
            ...img,
            isFavorited: !img.isFavorited,
            favoriteCount: img.isFavorited
              ? Math.max(0, (img.favoriteCount || 0) - 1)
              : (img.favoriteCount || 0) + 1
          } : img
        )
      );
    } catch (error) {
      console.error('收藏操作失败:', error);
      message.error('操作失败，请重试');
    }
  }, [currentImage, onFavorite]);

  // 处理旋转
  const handleRotateLeft = () => {
    setRotation(prev => prev - 90);
  };

  const handleRotateRight = () => {
    setRotation(prev => prev + 90);
  };

  // 加载相册
  useEffect(() => {
    if (visible) {
      loadAlbums();
    }
  }, [visible]);

  const loadAlbums = async () => {
    setLoadingAlbums(true);
    try {
      const result = await getAlbums(1, 100);
      if (result.success && result.data) {
        setAlbums(result.data);
      }
    } catch (error) {
      console.error('加载相册失败:', error);
    } finally {
      setLoadingAlbums(false);
    }
  };

  const handleAddToAlbum = async (albumId: number) => {
    if (!currentImage) return;

    try {
      // 使用新的批量添加方法，参数为数组
      const result = await addPicturesToAlbum(albumId, [currentImage.id]);
      if (result.success) {
        message.success('已添加到相册');
      } else {
        message.error(result.message || '添加到相册失败');
      }
    } catch (error) {
      console.error('添加到相册失败:', error);
      message.error('添加到相册失败，请重试');
    }
  };

  const albumItems = albums.map(album => ({
    key: album.id,
    label: album.name,
    onClick: () => handleAddToAlbum(album.id)
  }));

  // 处理切换到原图
  const handleToggleOriginal = () => {
    setShowOriginal(prev => !prev);
  };

  // 处理图片加载完成事件
  const handleImageLoaded = () => {
    setImageLoaded(true);
  };

  // 新增：检测图片是否已经加载
  useEffect(() => {
    // 如果当前图片已加载到缓存中
    if (currentImage && !imageLoaded) {
      const img = new Image();
      img.onload = () => {
        // 图片已在缓存中，立即设置为已加载
        setImageLoaded(true);
      };

      // 添加缓存键参数强制刷新
      const cacheBuster = `${currentImage.path}${currentImage.path.includes('?') ? '&' : '?'}_cb=${cacheKey}`;
      img.src = cacheBuster;
    }
  }, [currentImage, imageLoaded, cacheKey]);

  // 处理分享按钮点击
  const handleShareClick = useCallback(() => {
    if (!currentImage) return;

    if (onShare) {
      onShare(currentImage);
    } else {
      setShareDialogVisible(true);
    }
  }, [currentImage, onShare]);

  // 当没有图片或当前图片不存在时，不渲染任何内容
  if (images.length === 0 || !currentImage) {
    return null;
  }

  return (
    <div
      className={`image-viewer-container ${visible ? 'visible' : ''}`}
      style={{ display: visible ? 'block' : 'none' }}
    >
      <div className="viewer-overlay" onClick={onClose}></div>

      <div className="viewer-content">
        <div className="image-container">
          <TransformWrapper
            initialScale={1}
            initialPositionX={0}
            initialPositionY={0}
            centerOnInit={true}
            minScale={0.1}
            maxScale={8}
            wheel={{ step: 0.2 }}
            doubleClick={{ mode: 'reset' }}
            panning={{ disabled: false }}
            alignmentAnimation={{ disabled: true }}
            velocityAnimation={{ disabled: false }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent
                  wrapperClass="transform-wrapper"
                  contentClass="transform-content"
                >
                  <img
                    src={showOriginal
                      ? `${currentImage.path}${currentImage.path.includes('?') ? '&' : '?'}_cb=${cacheKey}`
                      : `${currentImage.thumbnailPath || currentImage.path}${(currentImage.thumbnailPath || currentImage.path).includes('?') ? '&' : '?'}_cb=${cacheKey}`
                    }
                    alt={currentImage.name}
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      opacity: imageLoaded ? 1 : 0.3,
                      transition: 'opacity 0.3s ease'
                    }}
                    className={`viewer-img ${showOriginal ? '' : 'thumbnail'}`}
                    loading="lazy"
                    onLoad={handleImageLoaded}
                  />
                </TransformComponent>

                <div className="zoom-controls">
                  <Space>
                    <Button icon={<ExpandOutlined />} onClick={() => resetTransform()} />
                    <Button icon={<ZoomOutOutlined />} onClick={() => zoomOut(0.5)} />
                    <Button icon={<ZoomInOutlined />} onClick={() => zoomIn(0.5)} />
                    <Button icon={<RotateLeftOutlined />} onClick={handleRotateLeft} />
                    <Button icon={<RotateRightOutlined />} onClick={handleRotateRight} />
                    <Button
                      icon={<EyeOutlined />}
                      onClick={handleToggleOriginal}
                      type={showOriginal ? "primary" : "default"}
                      title={showOriginal ? "正在查看原图" : "查看原图"}
                    />
                  </Space>
                </div>
              </>
            )}
          </TransformWrapper>

          {/* 图片导航按钮 */}
          {currentIndex > 0 && (
            <Button
              className="nav-button prev-button"
              icon={<LeftOutlined />}
              onClick={handlePrevious}
              shape="circle"
              size="large"
            />
          )}

          {currentIndex < images.length - 1 && (
            <Button
              className="nav-button next-button"
              icon={<RightOutlined />}
              onClick={handleNext}
              shape="circle"
              size="large"
            />
          )}
        </div>

        {/* 顶部操作栏 */}
        <div className="viewer-header">
          <div className="image-counter">
            {currentIndex + 1} / {images.length}
          </div>
          <div className="header-actions">
            <Button
              type="text"
              icon={isInfoDrawerOpen ? <InfoCircleOutlined style={{ color: '#1890ff' }} /> : <InfoCircleOutlined />}
              onClick={() => setIsInfoDrawerOpen(prev => !prev)}
              className="header-btn"
            />
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
              className="header-btn"
            />
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="viewer-footer">
          <div className="image-name">
            {currentImage.name}
          </div>

          <div className="footer-actions">
            {onFavorite && (
              <Button
                type="text"
                icon={currentImage.isFavorited ?
                  <HeartFilled style={{ color: '#ff4d4f' }} /> :
                  <HeartOutlined style={{ color: '#fff' }} />
                }
                onClick={handleFavoriteClick}
                className="footer-btn"
              >
                {showFavoriteCount && typeof currentImage.favoriteCount === 'number' && (
                  <span>{currentImage.favoriteCount}</span>
                )}
              </Button>
            )}
            <Dropdown menu={{ items: albumItems }} disabled={loadingAlbums || albums.length === 0}>
              <Button
                type="text"
                icon={<FolderAddOutlined style={{ color: '#fff' }} />}
                className="footer-btn"
              />
            </Dropdown>
            <Button
              type="text"
              icon={<DownloadOutlined style={{ color: '#fff' }} />}
              onClick={() => window.open(currentImage.path, '_blank')}
              className="footer-btn"
            />
            <Button
              type="text"
              icon={<ShareAltOutlined style={{ color: '#fff' }} />}
              onClick={handleShareClick}
              className="footer-btn"
            />
          </div>
        </div>
      </div>

      {/* 图片信息 */}
      {currentImage && (
        <ImageInfo
          image={currentImage}
          visible={isInfoDrawerOpen}
          onClose={() => setIsInfoDrawerOpen(false)}
        />
      )}

      {/* 添加分享对话框 */}
      {!onShare && currentImage && (
        <ShareImageDialog
          visible={shareDialogVisible}
          onClose={() => setShareDialogVisible(false)}
          image={currentImage}
        />
      )}
    </div>
  );
};

export default ImageViewer;
