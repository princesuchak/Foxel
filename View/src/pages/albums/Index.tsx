import { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, Button, Modal, Form, Input, Spin, Empty, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { getAlbums, createAlbum, updateAlbum, deleteAlbum } from '../../api';
import type { AlbumResponse, CreateAlbumRequest, UpdateAlbumRequest } from '../../api';
import { Link } from 'react-router';

const { Title, Text } = Typography;
const { Meta } = Card;
const { TextArea } = Input;

function Albums() {
  const [albums, setAlbums] = useState<AlbumResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAlbums, setTotalAlbums] = useState(0);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [currentAlbum, setCurrentAlbum] = useState<AlbumResponse | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const loadAlbums = async () => {
    setLoading(true);
    try {
      const result = await getAlbums();
      if (result.success && result.data) {
        setAlbums(result.data);
        setTotalAlbums(result.totalCount);
      } else {
        message.error(result.message || '获取相册失败');
      }
    } catch (error) {
      console.error('加载相册出错:', error);
      message.error('加载相册列表出错');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, []);

  const handleCreateAlbum = async (values: CreateAlbumRequest) => {
    try {
      const result = await createAlbum(values);
      if (result.success && result.data) {
        message.success('相册创建成功');
        setIsCreateModalVisible(false);
        form.resetFields();
        loadAlbums();
      } else {
        message.error(result.message || '创建相册失败');
      }
    } catch (error) {
      console.error('创建相册出错:', error);
      message.error('创建相册失败，请重试');
    }
  };

  const handleEditAlbum = async (values: UpdateAlbumRequest) => {
    if (!currentAlbum) return;
    
    try {
      const result = await updateAlbum({
        ...values,
        id: currentAlbum.id
      });
      
      if (result.success && result.data) {
        message.success('相册更新成功');
        setIsEditModalVisible(false);
        editForm.resetFields();
        setCurrentAlbum(null);
        loadAlbums();
      } else {
        message.error(result.message || '更新相册失败');
      }
    } catch (error) {
      console.error('更新相册出错:', error);
      message.error('更新相册失败，请重试');
    }
  };

  const handleDeleteAlbum = async (id: number) => {
    try {
      const result = await deleteAlbum(id);
      if (result.success) {
        message.success('相册已删除');
        loadAlbums();
      } else {
        message.error(result.message || '删除相册失败');
      }
    } catch (error) {
      console.error('删除相册出错:', error);
      message.error('删除相册失败，请重试');
    }
  };

  const openEditModal = (album: AlbumResponse) => {
    setCurrentAlbum(album);
    editForm.setFieldsValue({
      name: album.name,
      description: album.description
    });
    setIsEditModalVisible(true);
  };

  const getRandomColor = () => {
    const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068', '#108ee9', '#f50', '#13c2c2'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getFormattedDate = (dateString: Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div>
      <div style={{ 
        marginBottom: 50, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
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
          }}>相册</Title>
          <Text type="secondary" style={{ 
            fontSize: 16,
            color: '#888',
            letterSpacing: '0.3px'
          }}>共 {totalAlbums} 个相册，分类管理你的照片</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalVisible(true)}
          style={{ 
            borderRadius: 10, 
            height: 46,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 15
          }}
        >
          创建相册
        </Button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
        </div>
      ) : albums.length === 0 ? (
        <Empty 
          description="暂无相册" 
          style={{ margin: '80px 0' }}
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
        >
          <Button type="primary" onClick={() => setIsCreateModalVisible(true)}>创建第一个相册</Button>
        </Empty>
      ) : (
        <Row gutter={[40, 40]}>
          {albums.map(album => (
            <Col xs={24} sm={12} md={8} lg={6} key={album.id}>
              <Card
                hoverable
                style={{ 
                  borderRadius: 16, 
                  overflow: 'hidden', 
                  border: 'none', 
                  background: '#ffffff',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transform: 'translateY(0)'
                }}
                bodyStyle={{ padding: '20px' }}
                cover={
                  <Link to={`/albums/${album.id}`}>
                    {album.coverImageUrl ? (
                      <img alt={album.name} src={album.coverImageUrl} style={{ 
                        height: 180, 
                        width: '100%',
                        objectFit: 'cover'
                      }} />
                    ) : (
                      <div style={{ 
                        height: 180, 
                        width: '100%', 
                        background: getRandomColor(),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <PictureOutlined style={{ fontSize: 60, color: 'white' }} />
                      </div>
                    )}
                  </Link>
                }
                actions={[
                  <Link to={`/albums/${album.id}`} key="view">查看</Link>,
                  <EditOutlined key="edit" onClick={() => openEditModal(album)} />,
                  <Popconfirm
                    title="确定要删除这个相册吗？"
                    description="删除后不可恢复，但相册中的照片不会被删除。"
                    onConfirm={() => handleDeleteAlbum(album.id)}
                    okText="确定"
                    cancelText="取消"
                    key="delete"
                  >
                    <DeleteOutlined />
                  </Popconfirm>
                ]}
              >
                <Meta
                  title={<Link to={`/albums/${album.id}`} style={{ color: 'inherit' }}>{album.name}</Link>}
                  description={
                    <div style={{ marginTop: 8 }}>
                      <Text ellipsis style={{ display: 'block', marginBottom: 8 }}>
                        {album.description || "无描述"}
                      </Text>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">{album.pictureCount || 0} 张照片</Text>
                        <Text type="secondary">{getFormattedDate(album.createdAt)}</Text>
                      </div>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* 创建相册对话框 */}
      <Modal
        title="创建新相册"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateAlbum}
        >
          <Form.Item
            name="name"
            label="相册名称"
            rules={[{ required: true, message: '请输入相册名称' }]}
          >
            <Input placeholder="给你的相册起个名字" />
          </Form.Item>
          <Form.Item
            name="description"
            label="相册描述"
          >
            <TextArea placeholder="描述一下这个相册" rows={4} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button style={{ marginRight: 8 }} onClick={() => {
              setIsCreateModalVisible(false);
              form.resetFields();
            }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              创建
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑相册对话框 */}
      <Modal
        title="编辑相册"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          editForm.resetFields();
          setCurrentAlbum(null);
        }}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditAlbum}
        >
          <Form.Item
            name="name"
            label="相册名称"
            rules={[{ required: true, message: '请输入相册名称' }]}
          >
            <Input placeholder="相册名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="相册描述"
          >
            <TextArea placeholder="相册描述" rows={4} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button style={{ marginRight: 8 }} onClick={() => {
              setIsEditModalVisible(false);
              editForm.resetFields();
              setCurrentAlbum(null);
            }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Albums;