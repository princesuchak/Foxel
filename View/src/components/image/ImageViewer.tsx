import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Space, Dropdown, message, Spin } from 'antd';
import {
  ZoomInOutlined, ZoomOutOutlined, ExpandOutlined, InfoCircleOutlined,
  CloseOutlined, LeftOutlined, RightOutlined, RotateLeftOutlined,
  RotateRightOutlined, HeartOutlined, HeartFilled, DownloadOutlined,
  ShareAltOutlined, FolderAddOutlined
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

// 添加图片缓存对象
interface ImageCache {
  [key: string]: {
    loaded: boolean;
    img: HTMLImageElement;
  }
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  onClose,
  images,
  initialIndex = 0,
  onFavorite,
  onNext,
  onPrevious,
  showFavoriteCount = false,
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
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // 修改：使用 useRef 存储图片缓存，避免重复加载
  const imageCache = useRef<ImageCache>({});
  
  // 替换原来的 cacheKey
  const sessionKey = useRef<string>(Date.now().toString());
  
  const currentImage = localImages[currentIndex];

  // 预加载图片的范围
  const preloadRange = 2; // 当前图片前后各预加载2张

  const resetViewerState = useCallback(() => {
    setRotation(0);
    setIsInfoDrawerOpen(false);
    setImageLoaded(false);
  }, []);

  // 优化图片加载函数
  const loadImage = useCallback((imageUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      // 检查是否已经缓存
      if (imageCache.current[imageUrl]?.loaded) {
        setImageLoaded(true);
        return resolve(imageCache.current[imageUrl].img);
      }

      const img = new Image();
      img.onload = () => {
        // 更新缓存
        imageCache.current[imageUrl] = {
          loaded: true,
          img
        };
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };
      
      // 使用相对持久的缓存键，而不是每次都更新
      img.src = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}_s=${sessionKey.current}`;
    });
  }, []);

  // 修改：当图片索引变化时只设置加载状态，不重置缓存键
  useEffect(() => {
    setImageLoaded(false);
  }, [currentIndex]);

  // 修改：查看器可见性改变时的处理逻辑
  useEffect(() => {
    if (visible && !wasVisible.current) {
      resetViewerState();
      
      // 生成会话唯一的缓存键，而不是每次都更新
      if (!sessionKey.current) {
        sessionKey.current = Date.now().toString();
      }
    }
    wasVisible.current = visible;
  }, [visible, resetViewerState]);
  
  useEffect(() => {
    if (visible && initialIndex >= 0 && initialIndex < images.length) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex, images.length]);

  // 修改：加载当前图片并预加载相邻图片
  useEffect(() => {
    if (!currentImage || !visible) return;

    // 加载当前图片
    const imagePath = currentImage.path;
    loadImage(imagePath)
      .then(() => setImageLoaded(true))
      .catch(error => {
        console.error('Failed to load image:', error);
        message.error('图片加载失败，请重试');
      });
    
    // 预加载相邻图片
    if (localImages.length > 1) {
      // 使用 setTimeout 延迟预加载，优先加载当前图片
      setTimeout(() => {
        for (let i = 1; i <= preloadRange; i++) {
          // 预加载后面的图片
          const nextIndex = currentIndex + i;
          if (nextIndex < localImages.length) {
            loadImage(localImages[nextIndex].path).catch(() => {});
          }
          
          // 预加载前面的图片
          const prevIndex = currentIndex - i;
          if (prevIndex >= 0) {
            loadImage(localImages[prevIndex].path).catch(() => {});
          }
        }
      }, 300);
    }
  }, [currentImage, visible, currentIndex, localImages, loadImage]);

  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;

      switch (e.key) {
        case 'ArrowLeft': handlePrevious(); break;
        case 'ArrowRight': handleNext(); break;
        case 'Escape': onClose(); break;
        case 'i': setIsInfoDrawerOpen(prev => !prev); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, currentIndex, images.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prevIndex => prevIndex - 1);
      onPrevious?.();
    }
  }, [currentIndex, onPrevious]);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prevIndex => prevIndex + 1);
      onNext?.();
    }
  }, [currentIndex, images.length, onNext]);

  const handleFavoriteClick = useCallback(async () => {
    if (!currentImage) return;

    try {
      if (onFavorite) {
        onFavorite(currentImage);
        return;
      }

      const isFavorited = currentImage.isFavorited;
      const result = isFavorited 
        ? await unfavoritePicture(currentImage.id)
        : await favoritePicture(currentImage.id);
      
      if (result.success) {
        message.success(isFavorited ? '已取消收藏' : '已添加到收藏');
        setLocalImages(prevImages =>
          prevImages.map(img =>
            img.id === currentImage.id ? {
              ...img,
              isFavorited: !isFavorited,
              favoriteCount: isFavorited
                ? Math.max(0, (img.favoriteCount || 0) - 1)
                : (img.favoriteCount || 0) + 1
            } : img
          )
        );
      } else {
        message.error(result.message || (isFavorited ? '取消收藏失败' : '收藏失败'));
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      message.error('操作失败，请重试');
    }
  }, [currentImage, onFavorite]);

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
      const result = await addPicturesToAlbum(albumId, [currentImage.id]);
      message.success(result.success ? '已添加到相册' : (result.message || '添加到相册失败'));
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

  const handleShareClick = useCallback(() => {
    if (!currentImage) return;
    onShare ? onShare(currentImage) : setShareDialogVisible(true);
  }, [currentImage, onShare]);

  if (images.length === 0 || !currentImage) {
    return null;
  }

  // 修改：更新图片URL，使用会话缓存键
  const getImageUrl = (path: string) => {
    return `${path}${path.includes('?') ? '&' : '?'}_s=${sessionKey.current}`;
  };

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
                  {currentImage && (
                    <img
                      src={getImageUrl(currentImage.path)}
                      alt={currentImage.name}
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        opacity: imageLoaded ? 1 : 0.3,
                        transition: 'opacity 0.3s ease'
                      }}
                      className="viewer-img"
                      loading="lazy"
                    />
                  )}
                </TransformComponent>

                {!imageLoaded && (
                  <div className="image-loading-spinner">
                    <Spin size="large" tip={<span className="loading-text">图片加载中...</span>} />
                  </div>
                )}

                <div className="zoom-controls">
                  <Space>
                    <Button icon={<ExpandOutlined />} onClick={(_e) => resetTransform()} />
                    <Button icon={<ZoomOutOutlined />} onClick={() => zoomOut(0.5)} />
                    <Button icon={<ZoomInOutlined />} onClick={() => zoomIn(0.5)} />
                    <Button icon={<RotateLeftOutlined />} onClick={() => setRotation(prev => prev - 90)} />
                    <Button icon={<RotateRightOutlined />} onClick={() => setRotation(prev => prev + 90)} />
                  </Space>
                </div>
              </>
            )}
          </TransformWrapper>

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

        <div className="viewer-footer">
          <div className="image-name">{currentImage.name}</div>

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

      {currentImage && (
        <ImageInfo
          image={currentImage}
          visible={isInfoDrawerOpen}
          onClose={() => setIsInfoDrawerOpen(false)}
        />
      )}

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
