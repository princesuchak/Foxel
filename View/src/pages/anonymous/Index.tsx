import React, { useState } from 'react';
import {
    Upload,
    Button,
    Card,
    message,
    Typography,
    Row,
    Col,
    Empty,
    Layout,
    Divider,
    Space
} from 'antd';
import {
    UploadOutlined,
    FileImageOutlined,
    LinkOutlined,
    CloudUploadOutlined
} from '@ant-design/icons';
import type { RcFile, UploadFile as AntUploadFile } from 'antd/es/upload/interface';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router';

import ShareImageDialog from '../../components/image/ShareImageDialog';
import { uploadPicture } from '../../api/pictureApi';
import type { PictureResponse } from '../../api/types';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Header, Content } = Layout;

const AnonymousPage: React.FC = () => {
    const [fileList, setFileList] = useState<AntUploadFile[]>([]);
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadedImages, setUploadedImages] = useState<PictureResponse[]>([]);
    const [shareImage, setShareImage] = useState<PictureResponse | null>(null);
    const [shareDialogVisible, setShareDialogVisible] = useState<boolean>(false);

    // 处理文件选择
    const handleBeforeUpload = (file: RcFile) => {
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            message.error(`${file.name} 不是图片文件`);
            return false;
        }

        // 限制文件大小
        const isLt10M = file.size / 1024 / 1024 < 10;
        if (!isLt10M) {
            message.error('图片大小不能超过 10MB!');
            return false;
        }

        // 添加到上传列表
        const newFile: AntUploadFile = {
            uid: uuidv4(),
            name: file.name,
            status: 'done',
            size: file.size,
            type: file.type,
            originFileObj: file,
        };

        setFileList((prevList) => [...prevList, newFile]);

        // 阻止默认上传行为
        return false;
    };

    // 执行上传
    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.warning('请先选择需要上传的图片');
            return;
        }

        setUploading(true);
        const uploadedList: PictureResponse[] = [];

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const originFile = file.originFileObj;

            if (!originFile) continue;

            // 更新状态为上传中
            setFileList((prevList) =>
                prevList.map(item => {
                    if (item.uid === file.uid) {
                        return { ...item, status: 'uploading' };
                    }
                    return item;
                })
            );

            try {
                const result = await uploadPicture(originFile, {
                    permission: 0,  // 匿名上传默认为公开
                    onProgress: (percent) => {
                        setFileList((prevList) =>
                            prevList.map(item => {
                                if (item.uid === file.uid) {
                                    return { ...item, percent };
                                }
                                return item;
                            })
                        );
                    }
                });

                // 处理上传结果
                if (result.success && result.data) {
                    // 更新上传完成状态
                    setFileList((prevList) =>
                        prevList.map(item => {
                            if (item.uid === file.uid) {
                                return { ...item, status: 'done', percent: 100 };
                            }
                            return item;
                        })
                    );

                    // 添加到已上传图片列表
                    uploadedList.push(result.data);
                } else {
                    // 更新上传失败状态
                    setFileList((prevList) =>
                        prevList.map(item => {
                            if (item.uid === file.uid) {
                                return { ...item, status: 'error' };
                            }
                            return item;
                        })
                    );

                    message.error(`${file.name} 上传失败: ${result.message || '未知错误'}`);
                }
            } catch (error) {
                console.error('上传出错:', error);

                // 更新上传失败状态
                setFileList((prevList) =>
                    prevList.map(item => {
                        if (item.uid === file.uid) {
                            return { ...item, status: 'error' };
                        }
                        return item;
                    })
                );

                message.error(`${file.name} 上传出错`);
            }
        }

        // 更新上传完成的图片列表
        setUploadedImages((prev) => [...prev, ...uploadedList]);
        setUploading(false);

        // 如果有成功上传的图片，清空上传队列
        if (uploadedList.length > 0) {
            message.success(`成功上传 ${uploadedList.length} 张图片`);
            setFileList([]);
        }
    };

    // 移除待上传文件
    const handleRemove = (file: AntUploadFile) => {
        setFileList((prevList) => prevList.filter(item => item.uid !== file.uid));
    };

    // 打开分享对话框
    const handleShareImage = (image: PictureResponse) => {
        setShareImage(image);
        setShareDialogVisible(true);
    };

    // 关闭分享对话框
    const handleCloseShareDialog = () => {
        setShareDialogVisible(false);
    };

    return (
        <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
            <Header style={{
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '0 24px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                backdropFilter: 'blur(10px)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', height: '100%', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Title level={3} style={{ margin: 0 }}>Foxel 匿名图床</Title>
                    </div>
                    <div>
                        <Space>
                            <Link to="/login">
                                <Button type="primary" ghost>登录账户</Button>
                            </Link>
                            <Link to="https://github.com/DrizzleTime/Foxel">
                                <Button type="primary" ghost>Github</Button>
                            </Link>
                        </Space>
                    </div>
                </div>
            </Header>

            <Content style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                <Card
                    style={{
                        marginBottom: '32px',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
                        overflow: 'hidden'
                    }}
                    bodyStyle={{ padding: '32px' }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <CloudUploadOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '12px' }} />
                        <Title level={3} style={{ margin: 0 }}>快速上传</Title>
                        <Text type="secondary" style={{ marginTop: '8px', display: 'block' }}>
                            无需登录，快速上传分享图片，支持一次性上传多张图片
                        </Text>
                        <Divider style={{ margin: '24px 0' }} />
                    </div>

                    {/* 上传区域 */}
                    <Dragger
                        multiple
                        fileList={fileList}
                        beforeUpload={handleBeforeUpload}
                        onRemove={handleRemove}
                        style={{
                            backgroundColor: 'rgba(240, 244, 248, 0.6)',
                            borderRadius: '8px',
                            border: '2px dashed #d9d9d9',
                            padding: '20px 0'
                        }}
                        itemRender={(originNode, file) => (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px 16px',
                                backgroundColor: file.status === 'error' ? 'rgba(255,0,0,0.05)' :
                                    file.status === 'done' ? 'rgba(82,196,26,0.05)' : 'transparent',
                                borderRadius: '6px',
                                marginBottom: '8px'
                            }}>
                                {file.status === 'uploading' ? (
                                    <div style={{ marginRight: '16px', color: '#1890ff', minWidth: '80px' }}>
                                        上传中 {file.percent?.toFixed(0)}%
                                    </div>
                                ) : file.status === 'error' ? (
                                    <div style={{ marginRight: '16px', color: '#ff4d4f', minWidth: '80px' }}>上传失败</div>
                                ) : file.status === 'done' ? (
                                    <div style={{ marginRight: '16px', color: '#52c41a', minWidth: '80px' }}>上传成功</div>
                                ) : (
                                    <div style={{ marginRight: '16px', color: '#8c8c8c', minWidth: '80px' }}>等待上传</div>
                                )}
                                {originNode}
                            </div>
                        )}
                    >
                        <p className="ant-upload-drag-icon">
                            <FileImageOutlined style={{ fontSize: '56px', color: '#1890ff' }} />
                        </p>
                        <p className="ant-upload-text" style={{ fontSize: '18px', margin: '16px 0' }}>
                            点击或拖拽图片到此区域上传
                        </p>
                        <p className="ant-upload-hint" style={{ fontSize: '14px' }}>
                            支持单个或批量上传，图片大小不超过10MB
                        </p>
                    </Dragger>

                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <Button
                            type="primary"
                            onClick={handleUpload}
                            loading={uploading}
                            disabled={fileList.length === 0}
                            icon={<UploadOutlined />}
                            size="large"
                            style={{
                                height: '46px',
                                paddingLeft: '30px',
                                paddingRight: '30px',
                                fontSize: '16px',
                                boxShadow: '0 2px 10px rgba(24,144,255,0.3)'
                            }}
                        >
                            {uploading ? '正在上传...' : '开始上传'}
                        </Button>
                    </div>
                </Card>

                {/* 已上传图片展示 */}
                <Card
                    style={{
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
                    }}
                    bodyStyle={{ padding: '32px' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                        <Title level={4} style={{ margin: 0, flexGrow: 1 }}>已上传图片</Title>
                        {uploadedImages.length > 0 && (
                            <Text type="secondary">共 {uploadedImages.length} 张图片</Text>
                        )}
                    </div>

                    {uploadedImages.length > 0 ? (
                        <Row gutter={[24, 24]}>
                            {uploadedImages.map((image) => (
                                <Col xs={24} sm={12} md={8} lg={6} key={image.id}>
                                    <Card
                                        hoverable
                                        cover={
                                            <div style={{
                                                height: '180px',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: '#f0f0f0',
                                                borderTopLeftRadius: '8px',
                                                borderTopRightRadius: '8px',
                                                position: 'relative',
                                            }}>
                                                <img
                                                    alt={image.name || 'uploaded image'}
                                                    src={image.path}
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: '180px',
                                                        objectFit: 'contain',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                />
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    background: 'rgba(0,0,0,0.02)',
                                                    transition: 'all 0.3s ease',
                                                }}></div>
                                            </div>
                                        }
                                        style={{
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            transition: 'all 0.3s ease',
                                        }}
                                        bodyStyle={{ padding: '16px' }}
                                        actions={[
                                            <Button
                                                type="primary"
                                                key="share"
                                                onClick={() => handleShareImage(image)}
                                                icon={<LinkOutlined />}
                                                style={{ width: '80%' }}
                                            >
                                                获取链接
                                            </Button>
                                        ]}
                                    >
                                        <Card.Meta
                                            title={
                                                <div style={{
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {image.name || '未命名图片'}
                                                </div>
                                            }
                                            description={
                                                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                                    上传成功 · {new Date().toLocaleString()}
                                                </div>
                                            }
                                        />
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    ) : (
                        <Empty
                            description={
                                <Space direction="vertical" align="center" size="small">
                                    <Text style={{ fontSize: '16px' }}>暂无已上传图片</Text>
                                    <Text type="secondary">上传图片后将显示在这里</Text>
                                </Space>
                            }
                            style={{
                                margin: '60px 0',
                                padding: '30px',
                                background: 'rgba(0,0,0,0.01)',
                                borderRadius: '8px'
                            }}
                        />
                    )}
                </Card>

                <div style={{ textAlign: 'center', margin: '32px 0 16px', opacity: 0.6 }}>
                    <Text type="secondary">Foxel 图床 · 安全存储 · 便捷分享</Text>
                </div>
            </Content>

            {/* 分享对话框 */}
            <ShareImageDialog
                visible={shareDialogVisible}
                onClose={handleCloseShareDialog}
                image={shareImage}
            />
        </Layout>
    );
};

export default AnonymousPage;
