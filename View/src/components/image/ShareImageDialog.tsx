import React, { useState, useRef } from 'react';
import { Modal, Tabs, Input, Button, message, Radio, Space, Typography } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import type { PictureResponse } from '../../api/types';
import './ShareImageDialog.css';

const { Text } = Typography;

interface ShareImageDialogProps {
  visible: boolean;
  onClose: () => void;
  image: PictureResponse | null;
}

const ShareImageDialog: React.FC<ShareImageDialogProps> = ({
  visible,
  onClose,
  image
}) => {
  const [imageType, setImageType] = useState<'original' | 'thumbnail'>('original');
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const timerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  if (!image) return null;

  // 构建图片链接
  const imagePath = imageType === 'original' ? image.path : (image.thumbnailPath || image.path);
  const imageUrl = new URL(imagePath, window.location.origin).href;
  const imageName = image.name || 'image';

  // 构建不同格式的链接 - 移到这里，确保随imageType变化而更新
  const linkFormats = {
    direct: imageUrl,
    markdown: `![${imageName}](${imageUrl})`,
    html: `<img src="${imageUrl}" alt="${imageName}" />`
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // 设置复制状态
      setCopied(prev => ({...prev, [key]: true}));
      
      // 清除现有定时器
      if (timerRef.current[key]) {
        clearTimeout(timerRef.current[key]);
      }
      
      // 设置新定时器
      timerRef.current[key] = setTimeout(() => {
        setCopied(prev => ({...prev, [key]: false}));
      }, 2000);
      
      message.success('已复制到剪贴板');
    } catch (error) {
      message.error('复制失败，请手动复制');
    }
  };

  // 定义标签页内容
  const tabItems = [
    {
      key: 'direct',
      label: '直接链接',
      children: (
        <Space direction="vertical" className="share-tab-content" style={{ width: '100%' }}>
          <Text type="secondary">可直接访问的图片链接</Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input 
              value={linkFormats.direct}
              readOnly
              style={{ flex: 1 }}
            />
            <Button 
              icon={copied.direct ? <CheckOutlined /> : <CopyOutlined />}
              onClick={() => handleCopy(linkFormats.direct, 'direct')}
              className={copied.direct ? 'copied' : ''}
            />
          </Space.Compact>
        </Space>
      )
    },
    {
      key: 'markdown',
      label: 'Markdown',
      children: (
        <Space direction="vertical" className="share-tab-content" style={{ width: '100%' }}>
          <Text type="secondary">适用于Markdown文档的图片引用</Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input 
              value={linkFormats.markdown}
              readOnly
              style={{ flex: 1 }}
            />
            <Button 
              icon={copied.markdown ? <CheckOutlined /> : <CopyOutlined />}
              onClick={() => handleCopy(linkFormats.markdown, 'markdown')}
              className={copied.markdown ? 'copied' : ''}
            />
          </Space.Compact>
        </Space>
      )
    },
    {
      key: 'html',
      label: 'HTML',
      children: (
        <Space direction="vertical" className="share-tab-content" style={{ width: '100%' }}>
          <Text type="secondary">适用于网页的HTML图片标签</Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input 
              value={linkFormats.html}
              readOnly
              style={{ flex: 1 }}
            />
            <Button 
              icon={copied.html ? <CheckOutlined /> : <CopyOutlined />}
              onClick={() => handleCopy(linkFormats.html, 'html')}
              className={copied.html ? 'copied' : ''}
            />
          </Space.Compact>
        </Space>
      )
    }
  ];

  return (
    <Modal
      title="分享图片"
      open={visible}
      onCancel={onClose}
      footer={null}
      className="share-image-dialog"
      width={520}
    >
      <div className="share-image-content">
        <div className="share-image-preview">
          <img 
            src={imagePath} 
            alt={imageName} 
            className="share-preview-img" 
          />
        </div>
        
        <div className="share-image-controls">
          <Radio.Group 
            value={imageType} 
            onChange={e => setImageType(e.target.value)}
            buttonStyle="solid"
            className="share-type-switch"
          >
            <Radio.Button value="original">原图</Radio.Button>
            <Radio.Button value="thumbnail">缩略图</Radio.Button>
          </Radio.Group>
        </div>

        <Tabs 
          defaultActiveKey="direct" 
          className="share-tabs"
          items={tabItems}
        />
      </div>
    </Modal>
  );
};

export default ShareImageDialog;
