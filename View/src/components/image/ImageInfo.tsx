import React, { useState } from 'react';
import { Divider } from 'antd';
import { CloseOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import type { PictureResponse } from '../../api/types';
import './ImageViewer.css';

interface ImageInfoProps {
  image: PictureResponse;
  onClose: () => void;
  visible: boolean;
}

const ImageInfo: React.FC<ImageInfoProps> = ({
  image,
  onClose,
  visible
}) => {
  const [expandDescription, setExpandDescription] = useState(false);

  // 切换描述展开/折叠状态
  const toggleDescription = () => {
    setExpandDescription(!expandDescription);
  };

  // 格式化EXIF数据
  const formatExifInfo = (exifInfo: any) => {
    if (!exifInfo) return [];
    
    // 定义EXIF信息分类
    const categories = {
      basic: { title: "基本信息", items: [] as any[] },
      camera: { title: "相机信息", items: [] as any[] },
      settings: { title: "拍摄参数", items: [] as any[] },
      time: { title: "时间信息", items: [] as any[] },
      location: { title: "位置信息", items: [] as any[] }
    };
    
    // 将EXIF信息映射到对应字段
    const exifMapping: Record<string, { key: string; category: keyof typeof categories; formatter?: (value: any) => string }> = {
      // 基本信息
      width: { key: "width", category: "basic", formatter: (v) => `${v}px` },
      height: { key: "height", category: "basic", formatter: (v) => `${v}px` },
      
      // 相机信息
      cameraMaker: { key: "make", category: "camera" },
      cameraModel: { key: "model", category: "camera" },
      software: { key: "software", category: "camera" },
      
      // 拍摄参数
      exposureTime: { key: "exposureTime", category: "settings" },
      aperture: { key: "fNumber", category: "settings", formatter: (v) => `f/${v}` },
      isoSpeed: { key: "iso", category: "settings", formatter: (v) => `ISO ${v}` },
      focalLength: { key: "focalLength", category: "settings", formatter: (v) => `${v}mm` },
      flash: { key: "flash", category: "settings" },
      meteringMode: { key: "meteringMode", category: "settings" },
      whiteBalance: { key: "whiteBalance", category: "settings" },
      dateTimeOriginal: { 
        key: "dateTime", 
        category: "time", 
        formatter: (v) => {
          if (typeof v === 'string' && v.match(/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/)) {
            const normalized = v.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
            const date = new Date(normalized);
            if (!isNaN(date.getTime())) {
              return date.toLocaleString();
            }
          }
          return v.toString(); 
        }
      },
      
      // 位置信息
      gpsLatitude: { key: "latitude", category: "location" },
      gpsLongitude: { key: "longitude", category: "location" }
    };
    
    // 处理每个EXIF字段
    Object.entries(exifInfo).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      
      const mapping = exifMapping[key];
      if (mapping) {
        const formattedValue = mapping.formatter ? mapping.formatter(value) : value.toString();
        const label = formatExifLabel(mapping.key);
        
        categories[mapping.category].items.push({
          key: mapping.key,
          label,
          value: formattedValue
        });
      }
    });
    
    // 返回包含数据的分类
    return Object.values(categories).filter(category => category.items.length > 0);
  };

  // 格式化EXIF标签名称
  const formatExifLabel = (key: string): string => {
    const labels: Record<string, string> = {
      // 基本信息
      width: "宽度",
      height: "高度",
      
      // 相机信息
      make: "相机品牌",
      model: "相机型号",
      software: "软件",
      
      // 拍摄参数
      exposureTime: "曝光时间",
      fNumber: "光圈值",
      iso: "ISO感光度",
      focalLength: "焦距",
      flash: "闪光灯",
      meteringMode: "测光模式",
      whiteBalance: "白平衡",
      
      // 时间信息
      dateTime: "拍摄时间",
      
      // 位置信息
      latitude: "纬度",
      longitude: "经度"
    };
    
    return labels[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
  };

  // 渲染EXIF信息
  const renderExifInfo = (styles: any) => {
    if (!image?.exifInfo) return <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>无EXIF信息</div>;
    
    const formattedCategories = formatExifInfo(image.exifInfo);
    
    if (formattedCategories.length === 0) {
      return <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>无EXIF信息</div>;
    }
    
    return (
      <div style={styles.exifContainer}>
        {formattedCategories.map(category => (
          <div key={category.title} style={styles.exifCategory}>
            <Divider
              orientation="left"
              style={styles.divider}
            >
              {category.title}
            </Divider>
            <div style={styles.exifTable}>
              {category.items.map(item => (
                <div key={item.key} style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={styles.exifLabel}>{item.label}</div>
                  <div style={styles.exifValue}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 定义内联样式对象
  const styles = {
    // 抽屉基础样式
    drawer: {
      position: 'fixed' as const,
      top: 0,
      right: 0,
      width: '350px',
      height: '100%',
      zIndex: 1050,
      backgroundColor: 'rgba(28, 30, 34, 0.5)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      border: 'none',
      boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.2)',
      transition: 'transform 0.3s ease',
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      overflowY: 'auto' as const
    },
    header: {
      backgroundColor: 'rgba(28, 30, 34, 0.6)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      color: 'rgba(255, 255, 255, 0.95)',
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    headerTitle: {
      color: 'rgba(255, 255, 255, 0.95)',
      margin: 0,
      fontSize: '16px',
      fontWeight: 500
    },
    closeButton: {
      background: 'transparent',
      border: 'none',
      color: 'rgba(255, 255, 255, 0.8)',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    body: {
      padding: '24px 20px',
      color: 'white'
    },
    // 标题样式
    titleContainer: {
      padding: '0 0 16px 0',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      marginBottom: '20px'
    },
    title: {
      color: 'rgba(255, 255, 255, 0.95)',
      margin: '0 0 4px 0',
      fontSize: '18px',
      fontWeight: 500,
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
    },
    date: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '13px'
    },
    // 描述区域
    descSection: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(10px) saturate(180%)',
      WebkitBackdropFilter: 'blur(10px) saturate(180%)',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    },
    descText: {
      color: 'rgba(255, 255, 255, 0.9)',
      lineHeight: '1.6',
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      WebkitLineClamp: expandDescription ? 'unset' : 8
    },
    expandButton: {
      background: 'transparent',
      border: 'none',
      color: 'rgba(255, 255, 255, 0.7)',
      cursor: 'pointer',
      padding: '8px 0 0 0',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      justifyContent: 'center'
    },
    // 标签区域
    tagsSection: {
      marginBottom: '20px',
      padding: '0 4px'
    },
    tagTitle: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '14px',
      fontWeight: 500,
      marginBottom: '12px'
    },
    tagItem: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: '16px',
      color: 'rgba(255, 255, 255, 0.9)',
      border: 'none',
      padding: '4px 12px',
      margin: '0 8px 8px 0',
      display: 'inline-block',
      fontSize: '12px'
    },
    // 规格信息区
    specsSection: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(10px) saturate(180%)',
      WebkitBackdropFilter: 'blur(10px) saturate(180%)',
      padding: '16px',
      borderRadius: '8px',
      margin: '16px 0 20px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    },
    specsContainer: {
      display: 'flex',
      justifyContent: 'space-around',
      textAlign: 'center' as const
    },
    specItem: {
      padding: '0 8px',
      flex: 1
    },
    specValue: {
      fontSize: '15px',
      fontWeight: 500,
      color: 'rgba(255, 255, 255, 0.95)',
      marginBottom: '4px',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
    },
    specLabel: {
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.6)'
    },
    // EXIF信息区
    exifContainer: {
      marginTop: '10px'
    },
    exifCategory: {
      marginBottom: '20px'
    },
    divider: {
      borderColor: 'rgba(255, 255, 255, 0.08)',
      margin: '10px 0 16px',
      fontSize: '14px',
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: 500
    },
    exifTable: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    exifLabel: {
      color: 'rgba(255, 255, 255, 0.7)',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      padding: '8px 12px',
      width: '100px',
      fontSize: '13px'
    },
    exifValue: {
      color: 'rgba(255, 255, 255, 0.9)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      padding: '8px 12px',
      fontSize: '13px'
    }
  };

  return (
    <div style={styles.drawer}>
      <div style={styles.header}>
        <h3 style={styles.headerTitle}>图片信息</h3>
        <button style={styles.closeButton} onClick={onClose}>
          <CloseOutlined />
        </button>
      </div>
      <div style={styles.body}>
        <div style={styles.titleContainer}>
          <h4 style={styles.title}>{image?.name}</h4>
          <div style={styles.date}>上传于{new Date(image?.createdAt).toLocaleString()}</div>
        </div>
        
        {image?.description && (
          <div style={styles.descSection}>
            <div style={styles.descText}>{image.description}</div>
            {image.description.split('\n').length > 8 || image.description.length > 200 ? (
              <button style={styles.expandButton} onClick={toggleDescription}>
                {expandDescription ? (
                  <>收起 <UpOutlined style={{ fontSize: '12px', marginLeft: '4px' }} /></>
                ) : (
                  <>展开 <DownOutlined style={{ fontSize: '12px', marginLeft: '4px' }} /></>
                )}
              </button>
            ) : null}
          </div>
        )}
        
        {image?.tags && image.tags.length > 0 && (
          <div style={styles.tagsSection}>
            <div style={styles.tagTitle}>标签</div>
            <div>
              {image.tags.map(tag => (
                <span key={tag} style={styles.tagItem}>#{tag}</span>
              ))}
            </div>
          </div>
        )}
        
        {image?.exifInfo && (
          <div style={styles.specsSection}>
            <div style={styles.specsContainer}>
              <div style={styles.specItem}>
                <div style={styles.specValue}>{image.exifInfo.width}×{image.exifInfo.height}</div>
                <div style={styles.specLabel}>分辨率</div>
              </div>
              {image.exifInfo.focalLength && (
                <div style={styles.specItem}>
                  <div style={styles.specValue}>{image.exifInfo.focalLength}</div>
                  <div style={styles.specLabel}>焦距</div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 渲染EXIF信息 */}
        {renderExifInfo(styles)}
      </div>
    </div>
  );
};

export default ImageInfo;
