import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Space, Dropdown, message, Spin } from 'antd';
import {
  ZoomInOutlined, ZoomOutOutlined, ExpandOutlined, InfoCircleOutlined,
  CloseOutlined, LeftOutlined, RightOutlined, RotateLeftOutlined,
  RotateRightOutlined, HeartOutlined, HeartFilled, DownloadOutlined,
  ShareAltOutlined, FolderAddOutlined
} from '@ant-design/icons';
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

interface ImageCache {
  [key: string]: {
    loaded: boolean;
    img: HTMLImageElement;
  }
}

interface ZoomPanState {
  scale: number;
  positionX: number;
  positionY: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  lastPositionX: number;
  lastPositionY: number;
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
  const [currentLoading, setCurrentLoading] = useState(false);
  
  const [zoomPanState, setZoomPanState] = useState<ZoomPanState>({
    scale: 1,
    positionX: 0,
    positionY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastPositionX: 0,
    lastPositionY: 0,
  });
  
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageCache = useRef<ImageCache>({});
  const sessionKey = useRef<string>(Date.now().toString());
  
  const currentImage = localImages[currentIndex];
  const preloadRange = 2;
  
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 8;
  const ZOOM_FACTOR = 0.2;

  const resetViewerState = useCallback(() => {
    setRotation(0);
    setIsInfoDrawerOpen(false);
    setImageLoaded(false);
    setZoomPanState({
      scale: 1,
      positionX: 0,
      positionY: 0,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      lastPositionX: 0,
      lastPositionY: 0,
    });
  }, []);

  // 当前加载中的图片URL追踪
  const currentLoadingUrl = useRef<string | null>(null);
  
  // 预渲染图片容器
  const preloadedImagesRef = useRef<{[key: string]: HTMLImageElement}>({});
  
  // 图片过渡状态
  const [fadeTransition, setFadeTransition] = useState(false);
  const [, setActiveImage] = useState<string | null>(null);

  const loadImage = useCallback((imageUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      // 检查缓存
      if (imageCache.current[imageUrl]?.loaded) {
        if (currentImage && imageUrl === currentImage.path) {
          setImageLoaded(true);
          setActiveImage(imageUrl);
        }
        return resolve(imageCache.current[imageUrl].img);
      }

      const img = new Image();
      img.onload = () => {
        imageCache.current[imageUrl] = {
          loaded: true,
          img
        };
        
        preloadedImagesRef.current[imageUrl] = img;
        
        if (imageUrl === currentLoadingUrl.current) {
          setImageLoaded(true);
          setCurrentLoading(false);
          setActiveImage(imageUrl);
        }
        
        resolve(img);
      };
      img.onerror = () => {
        if (imageUrl === currentLoadingUrl.current) {
          setCurrentLoading(false);
        }
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };
      
      img.src = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}_s=${sessionKey.current}`;
    });
  }, [currentImage]);

  // 图片切换逻辑优化
  useEffect(() => {
    setImageLoaded(false);
    setCurrentLoading(true);
    setFadeTransition(true);
    
    // 利用缓存快速显示
    if (currentImage && imageCache.current[currentImage.path]?.loaded) {
      setActiveImage(currentImage.path);
      setImageLoaded(true);
      setCurrentLoading(false);
      
      setTimeout(() => setFadeTransition(false), 100);
    }
    
    // 重置缩放状态
    setZoomPanState(prev => ({
      ...prev,
      scale: 1,
      positionX: 0,
      positionY: 0,
      isDragging: false
    }));
  }, [currentIndex]);

  // 可见性变化处理
  useEffect(() => {
    if (visible && !wasVisible.current) {
      resetViewerState();
      if (!sessionKey.current) {
        sessionKey.current = Date.now().toString();
      }
    }
    wasVisible.current = visible;
  }, [visible, resetViewerState]);
  
  // 初始索引处理
  useEffect(() => {
    if (visible && initialIndex >= 0 && initialIndex < images.length) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex, images.length]);

  // 图片加载逻辑
  useEffect(() => {
    if (!currentImage || !visible) return;

    currentLoadingUrl.current = currentImage.path;
    setCurrentLoading(true);
    
    loadImage(currentImage.path)
      .then(() => {
        if (currentLoadingUrl.current === currentImage.path) {
          setImageLoaded(true);
          setCurrentLoading(false);
          setActiveImage(currentImage.path);
          
          setTimeout(() => setFadeTransition(false), 100);
        }
      })
      .catch(error => {
        console.error('Failed to load image:', error);
        message.error('图片加载失败，请重试');
        setCurrentLoading(false);
      });
    
    // 预加载相邻图片
    if (localImages.length > 1) {
      setTimeout(() => {
        for (let i = 1; i <= preloadRange; i++) {
          const nextIndex = currentIndex + i;
          if (nextIndex < localImages.length) {
            loadImage(localImages[nextIndex].path).catch(() => {});
          }
          
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

  const zoomIn = useCallback((factor = ZOOM_FACTOR) => {
    setZoomPanState(prev => ({
      ...prev,
      scale: Math.min(MAX_SCALE, prev.scale * (1 + factor))
    }));
  }, []);

  const zoomOut = useCallback((factor = ZOOM_FACTOR) => {
    setZoomPanState(prev => ({
      ...prev,
      scale: Math.max(MIN_SCALE, prev.scale / (1 + factor))
    }));
  }, []);

  const resetTransform = useCallback(() => {
    setZoomPanState({
      scale: 1,
      positionX: 0,
      positionY: 0,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      lastPositionX: 0,
      lastPositionY: 0,
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY || e.deltaX;
    const scaleFactor = delta > 0 ? 0.9 : 1.1;

    setZoomPanState(prev => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * scaleFactor));
      
      const rect = imageContainerRef.current?.getBoundingClientRect();
      if (!rect) return { ...prev, scale: newScale };
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const containerCenterX = rect.width / 2;
      const containerCenterY = rect.height / 2;
      const dx = (mouseX - containerCenterX - prev.positionX) * (scaleFactor - 1);
      const dy = (mouseY - containerCenterY - prev.positionY) * (scaleFactor - 1);
      
      return {
        ...prev,
        scale: newScale,
        positionX: prev.positionX - dx,
        positionY: prev.positionY - dy,
      };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setZoomPanState(prev => ({
      ...prev,
      isDragging: true,
      dragStartX: e.clientX,
      dragStartY: e.clientY,
      lastPositionX: prev.positionX,
      lastPositionY: prev.positionY
    }));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setZoomPanState(prev => ({
        ...prev,
        isDragging: true,
        dragStartX: touch.clientX,
        dragStartY: touch.clientY,
        lastPositionX: prev.positionX,
        lastPositionY: prev.positionY
      }));
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomPanState.isDragging) {
      const dx = e.clientX - zoomPanState.dragStartX;
      const dy = e.clientY - zoomPanState.dragStartY;
      
      setZoomPanState(prev => ({
        ...prev,
        positionX: prev.lastPositionX + dx,
        positionY: prev.lastPositionY + dy
      }));
    }
  }, [zoomPanState.isDragging, zoomPanState.dragStartX, zoomPanState.dragStartY, zoomPanState.lastPositionX, zoomPanState.lastPositionY]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (zoomPanState.isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - zoomPanState.dragStartX;
      const dy = touch.clientY - zoomPanState.dragStartY;
      
      setZoomPanState(prev => ({
        ...prev,
        positionX: prev.lastPositionX + dx,
        positionY: prev.lastPositionY + dy
      }));
    }
  }, [zoomPanState.isDragging, zoomPanState.dragStartX, zoomPanState.dragStartY, zoomPanState.lastPositionX, zoomPanState.lastPositionY]);

  const handleMouseUp = useCallback(() => {
    setZoomPanState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const handleTouchEnd = useCallback(() => {
    setZoomPanState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const handleDoubleClick = useCallback(() => {
    resetTransform();
  }, [resetTransform]);

  useEffect(() => {
    if (visible) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mouseleave', handleMouseUp);
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
      
      return () => {
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mouseleave', handleMouseUp);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
      };
    }
  }, [visible, handleMouseUp, handleTouchEnd]);

  // 渲染优化：减少重绘和提高性能
  if (images.length === 0 || !currentImage) {
    return null;
  }

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
        <div 
          className="image-container" 
          ref={imageContainerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onDoubleClick={handleDoubleClick}
        >
          <div className="image-transform-wrapper">
            {currentImage && (
              <img
                ref={imageRef}
                src={getImageUrl(currentImage.path)}
                alt={currentImage.name}
                style={{
                  transform: `translate(${zoomPanState.positionX}px, ${zoomPanState.positionY}px) rotate(${rotation}deg) scale(${zoomPanState.scale})`,
                  opacity: imageLoaded ? 1 : 0.3,
                  transition: zoomPanState.isDragging ? 'none' : 
                             fadeTransition ? 'opacity 0.15s ease, transform 0.1s ease-out' :
                             'transform 0.1s ease-out',
                  cursor: zoomPanState.scale > 1 ? 'grab' : 'auto',
                  transformOrigin: 'center center',
                  willChange: 'opacity, transform'
                }}
                className="viewer-img"
                loading="eager"
              />
            )}
          </div>

          {(!imageLoaded || currentLoading) && (
            <div className="image-loading-spinner">
              <Spin size="large" tip={<span className="loading-text">图片加载中...</span>} />
            </div>
          )}

          <div className="zoom-controls">
            <Space>
              <Button icon={<ExpandOutlined />} onClick={resetTransform} />
              <Button icon={<ZoomOutOutlined />} onClick={() => zoomOut()} />
              <Button icon={<ZoomInOutlined />} onClick={() => zoomIn()} />
              <Button icon={<RotateLeftOutlined />} onClick={() => setRotation(prev => prev - 90)} />
              <Button icon={<RotateRightOutlined />} onClick={() => setRotation(prev => prev + 90)} />
            </Space>
          </div>
        </div>

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
