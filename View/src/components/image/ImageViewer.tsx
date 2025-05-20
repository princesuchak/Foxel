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
  const preloadImageRef = useRef<HTMLImageElement | null>(null);
  const [cacheKey, setCacheKey] = useState<number>(Date.now());
  
  const currentImage = localImages[currentIndex];

  const resetViewerState = useCallback(() => {
    setRotation(0);
    setIsInfoDrawerOpen(false);
    setImageLoaded(false);
    setCacheKey(Date.now());
  }, []);

  useEffect(() => {
    setImageLoaded(false);
    setCacheKey(Date.now());
  }, [currentIndex]);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      resetViewerState();
    } else if (!visible && wasVisible.current) {
      setTimeout(() => setCacheKey(Date.now()), 300);
    }
    wasVisible.current = visible;
  }, [visible, resetViewerState]);
  
  useEffect(() => {
    if (visible && initialIndex >= 0 && initialIndex < images.length) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex, images.length]);

  useEffect(() => {
    if (currentImage) {
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
        preloadImageRef.current = img;
      };
      const cacheBuster = `${currentImage.path}${currentImage.path.includes('?') ? '&' : '?'}_cb=${cacheKey}`;
      img.src = cacheBuster;
      
      return () => {
        img.onload = null;
        if (preloadImageRef.current === img) {
          preloadImageRef.current = null;
        }
      };
    }
  }, [currentImage, cacheKey]);

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
                      src={`${currentImage.path}${currentImage.path.includes('?') ? '&' : '?'}_cb=${cacheKey}`}
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
