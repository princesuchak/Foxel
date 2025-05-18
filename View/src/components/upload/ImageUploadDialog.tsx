import React, { useState, useEffect } from 'react';
import { Modal, Upload, Button, Progress, message, Form, Select, Radio, Slider } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import type { UploadFile, UploadPictureParams, AlbumResponse } from '../../api';
import { uploadPicture, getAlbums } from '../../api';

const { Dragger } = Upload;
const { Option } = Select;

interface UploadDialogProps {
  visible: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

const ImageUploadDialog: React.FC<UploadDialogProps> = ({ visible, onClose, onUploadComplete }) => {
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form] = Form.useForm();
  const [albums, setAlbums] = useState<AlbumResponse[]>([]);
  const [concurrentUploads, setConcurrentUploads] = useState<number>(3);
  
  useEffect(() => {
    if (visible) {
      fetchAlbums();
    }
  }, [visible]);
  
  const fetchAlbums = async () => {
    try {
      const result = await getAlbums();
      if (result.success && result.data) {
        setAlbums(result.data);
      }
    } catch (error) {
      console.error('获取相册列表失败:', error);
    }
  };

  const handleBeforeUpload = (file: File) => {
    // 检查是否为图片文件
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error(`${file.name} 不是图片文件`);
      return false;
    }

    // 限制文件大小，例如 10MB
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('图片大小不能超过 10MB!');
      return false;
    }

    // 添加到上传队列
    const newFile: UploadFile = {
      id: uuidv4(),
      file,
      status: 'pending',
      percent: 0
    };

    setUploadQueue((prev) => [...prev, newFile]);
    return false; // 阻止自动上传
  };

  const uploadFiles = async () => {
    if (uploadQueue.length === 0) {
      message.warning('请先选择需要上传的图片');
      return;
    }

    try {
      setUploading(true);
      const values = await form.validateFields();
      
      const params: UploadPictureParams = {};
      if (values.permission !== undefined) {
        params.permission = values.permission;
      }
      if (values.albumId) {
        params.albumId = values.albumId;
      }
      
      let successCount = 0;
      let failCount = 0;

      // 创建上传队列的副本
      const queue = [...uploadQueue].filter(item => item.status !== 'success');
      
      // 上传单个文件的函数
      const uploadSingleFile = async (item: UploadFile) => {
        // 更新状态为上传中
        setUploadQueue((prev) => 
          prev.map(file => file.id === item.id ? { ...file, status: 'uploading' } : file)
        );

        try {
          // 上传文件
          const result = await uploadPicture(item.file, {
            ...params,
            onProgress: (percent) => {
              setUploadQueue((prev) => 
                prev.map(file => file.id === item.id ? { ...file, percent } : file)
              );
            }
          });

          if (result.success && result.data) {
            // 更新为上传成功
            setUploadQueue((prev) => 
              prev.map(file => file.id === item.id ? { 
                ...file, 
                status: 'success',
                response: result.data,
                percent: 100
              } : file)
            );
            successCount++;
          } else {
            // 更新为上传失败
            setUploadQueue((prev) => 
              prev.map(file => file.id === item.id ? { 
                ...file, 
                status: 'error',
                error: result.message || '上传失败'
              } : file)
            );
            failCount++;
          }
        } catch (error: any) {
          // 更新为上传失败
          setUploadQueue((prev) => 
            prev.map(file => file.id === item.id ? { 
              ...file, 
              status: 'error',
              error: error.message || '上传失败'
            } : file)
          );
          failCount++;
        }
      };

      // 批量上传函数 - 支持并发控制
      const batchUpload = async () => {
        // 每次处理的批次大小
        const batchSize = concurrentUploads;
        
        while (queue.length > 0) {
          // 取出当前批次的文件
          const batch = queue.splice(0, batchSize);
          
          // 并行上传当前批次的所有文件
          await Promise.all(batch.map(item => uploadSingleFile(item)));
        }
      };

      // 执行批量上传
      await batchUpload();

      // 显示上传结果
      if (successCount > 0) {
        if (failCount > 0) {
          message.warning(`上传完成，成功 ${successCount} 张，失败 ${failCount} 张`);
        } else {
          message.success(`成功上传 ${successCount} 张图片`);
          // 如果全部成功，清空队列并关闭对话框
          setTimeout(() => {
            setUploadQueue([]);
            onClose();
            onUploadComplete();
          }, 1000);
        }
      } else {
        message.error('上传失败，请重试');
      }
    } catch (error) {
      console.error('表单验证或上传过程出错:', error);
      message.error('上传失败，请检查表单信息');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (id: string) => {
    setUploadQueue((prev) => prev.filter(file => file.id !== id));
  };

  const handleClose = () => {
    // 如果正在上传，提示用户
    if (uploading) {
      Modal.confirm({
        title: '确认取消',
        content: '上传正在进行中，确定要取消吗？',
        onOk: () => {
          setUploading(false);
          setUploadQueue([]);
          onClose();
        }
      });
    } else {
      setUploadQueue([]);
      onClose();
    }
  };

  // 自定义上传列表项
  const renderUploadItem = (item: UploadFile) => {
    let statusIcon;
    let statusColor;

    switch(item.status) {
      case 'success':
        statusIcon = '✓';
        statusColor = '#52c41a';
        break;
      case 'error':
        statusIcon = '✗';
        statusColor = '#ff4d4f';
        break;
      default:
        statusIcon = '';
        statusColor = '#1890ff';
    }

    return (
      <div key={item.id} style={{ 
        display: 'flex', 
        alignItems: 'center', 
        margin: '8px 0', 
        padding: '8px', 
        background: '#f9f9f9',
        borderRadius: '4px'
      }}>
        <div style={{ marginRight: '8px', width: '40px', height: '40px' }}>
          {item.file instanceof File && (
            <img 
              src={URL.createObjectURL(item.file)} 
              alt={item.file.name} 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                borderRadius: '4px' 
              }} 
            />
          )}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            marginBottom: '4px'
          }}>
            {item.file.name}
          </div>
          {item.status === 'uploading' && (
            <Progress percent={Math.round(item.percent)} size="small" />
          )}
          {item.status === 'error' && item.error && (
            <div style={{ color: '#ff4d4f', fontSize: '12px' }}>{item.error}</div>
          )}
        </div>
        <div style={{ marginLeft: '8px' }}>
          {item.status !== 'uploading' && (
            <Button 
              type="text" 
              danger={item.status !== 'success'} 
              size="small" 
              onClick={() => handleRemove(item.id)}
              disabled={uploading}
            >
              {item.status === 'success' ? '移除' : '删除'}
            </Button>
          )}
          {statusIcon && (
            <span style={{ 
              marginLeft: '8px', 
              color: statusColor, 
              fontWeight: 'bold' 
            }}>
              {statusIcon}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal
      title="上传图片"
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="back" onClick={handleClose} disabled={uploading}>
          取消
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={uploading}
          onClick={uploadFiles}
        >
          {uploading ? '正在上传...' : '开始上传'}
        </Button>,
      ]}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          permission: 2,
          concurrentUploads: 3
        }}
      >
        <Form.Item
          name="albumId"
          label="选择相册"
        >
          <Select placeholder="选择要上传到的相册" allowClear>
            {albums.map(album => (
              <Option key={album.id} value={album.id}>{album.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="permission"
          label="图片权限"
        >
          <Radio.Group>
            <Radio value={0}>公开</Radio>
            <Radio value={1}>好友可见</Radio>
            <Radio value={2}>仅自己</Radio>

          </Radio.Group>
        </Form.Item>
        
        <Form.Item
          name="concurrentUploads"
          label="并发上传数量"
        >
          <Slider
            min={1}
            max={10}
            value={concurrentUploads}
            onChange={(value) => setConcurrentUploads(value)}
            marks={{ 1: '1', 5: '5', 10: '10' }}
          />
        </Form.Item>
      </Form>

      <Dragger
        beforeUpload={handleBeforeUpload}
        multiple
        showUploadList={false}
        disabled={uploading}
        accept="image/*"
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽图片到此区域上传</p>
        <p className="ant-upload-hint">
          支持单个或批量上传，图片大小不超过10MB
        </p>
      </Dragger>

      <div style={{ marginTop: '16px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <div>已选择 {uploadQueue.length} 张图片</div>
        </div>
        <div style={{ 
          maxHeight: '200px', 
          overflowY: 'auto',
          border: uploadQueue.length > 0 ? '1px solid #f0f0f0' : 'none',
          borderRadius: '4px',
          padding: uploadQueue.length > 0 ? '8px' : '0'
        }}>
          {uploadQueue.map(renderUploadItem)}
        </div>
      </div>
    </Modal>
  );
};

export default ImageUploadDialog;
