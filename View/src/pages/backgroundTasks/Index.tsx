import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Table, Card, Tag, Space, Button, Empty, message, Modal } from 'antd';
import { SyncOutlined, EyeOutlined } from '@ant-design/icons';
import { getUserTasks } from '../../api';
import { type PictureProcessingTask, ProcessingStatus } from '../../api/types';
import TaskProgressBar from '../../components/TaskProgressBar';
import dayjs from 'dayjs';
import { Link } from 'react-router';
import type { ColumnType } from 'antd/es/table';

const { Title, Text } = Typography;

const BackgroundTasks: React.FC = () => {
  const [tasks, setTasks] = useState<PictureProcessingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollingActive, setPollingActive] = useState(true);
  const [pollingInterval, setPollingIntervalState] = useState<number | null>(null);

  // 加载任务数据
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getUserTasks();
      if (result.success && result.data) {
        setTasks(result.data);
      } else {
        message.error(result.message || '获取任务列表失败');
      }
    } catch (error) {
      console.error('获取任务失败:', error);
      message.error('加载任务列表时出错');
    } finally {
      setLoading(false);
    }
  }, []);

  // 自动刷新逻辑
  useEffect(() => {
    fetchTasks();

    // 设置轮询
    if (pollingActive) {
      const interval = setInterval(fetchTasks, 3000);
      setPollingIntervalState(interval);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [fetchTasks, pollingActive]);

  // 检查是否有活跃的任务，如果没有则停止轮询
  useEffect(() => {
    const hasActiveTasks = tasks.some(
      task => task.status === ProcessingStatus.Pending || task.status === ProcessingStatus.Processing
    );
    
    if (!hasActiveTasks && pollingActive) {
      setPollingActive(false);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingIntervalState(null);
      }
    } else if (hasActiveTasks && !pollingActive) {
      setPollingActive(true);
      const interval = setInterval(fetchTasks, 3000);
      setPollingIntervalState(interval);
    }
  }, [tasks, pollingActive, pollingInterval, fetchTasks]);

  // 渲染状态标签
  const renderStatus = (status: ProcessingStatus) => {
    let color = '';
    let text = '';
    let icon = null;

    switch (status) {
      case ProcessingStatus.Pending:
        color = 'orange';
        text = '等待中';
        icon = <SyncOutlined spin />;
        break;
      case ProcessingStatus.Processing:
        color = 'processing';
        text = '处理中';
        icon = <SyncOutlined spin />;
        break;
      case ProcessingStatus.Completed:
        color = 'success';
        text = '已完成';
        break;
      case ProcessingStatus.Failed:
        color = 'error';
        text = '失败';
        break;
    }

    return <Tag color={color} icon={icon}>{text}</Tag>;
  };

  // 格式化日期
  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  };

  // 渲染错误信息
  const showErrorMessage = (error: string) => {
    Modal.error({
      title: '处理失败',
      content: error,
    });
  };

  // 表格列定义
  const columns: ColumnType<PictureProcessingTask>[] = [
    {
      title: '图片名称',
      dataIndex: 'pictureName',
      key: 'pictureName',
      render: (text: string, record: PictureProcessingTask) => (
        <Link to={`/pictures/${record.pictureId}`}>{text}</Link>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: ProcessingStatus) => renderStatus(status),
      filters: [
        { text: '等待中', value: ProcessingStatus.Pending },
        { text: '处理中', value: ProcessingStatus.Processing },
        { text: '已完成', value: ProcessingStatus.Completed },
        { text: '失败', value: ProcessingStatus.Failed },
      ],
      onFilter: (value, record: PictureProcessingTask) => 
        record.status === value.toString(),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number, record: PictureProcessingTask) => (
        <TaskProgressBar 
          status={record.status} 
          progress={progress} 
          error={record.error} 
          showLabel={false}
          size="small" 
          style={{ width: '150px' }}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => formatDate(date),
      sorter: (a: PictureProcessingTask, b: PictureProcessingTask) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (date: Date) => formatDate(date),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: PictureProcessingTask) => (
        <Space size="middle">
          <Link to={`/pictures/${record.pictureId}`}>
            <Button type="link" icon={<EyeOutlined />} size="small">
              查看
            </Button>
          </Link>
          {record.status === ProcessingStatus.Failed && record.error && (
            <Button 
              type="link" 
              danger 
              size="small"
              onClick={() => showErrorMessage(record.error!)}
            >
              查看错误
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="background-tasks-container">
      <div style={{ 
        marginBottom: 30, 
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
          }}>图片处理队列</Title>
          <Text type="secondary" style={{ 
            fontSize: 16,
            color: '#888',
            letterSpacing: '0.3px'
          }}>查看和管理图片后台处理任务</Text>
        </div>
        <Button 
          type="primary" 
          icon={<SyncOutlined />} 
          onClick={fetchTasks}
          loading={loading}
        >
          刷新
        </Button>
      </div>
      
      <Card>
        {tasks.length > 0 ? (
          <Table 
            dataSource={tasks} 
            columns={columns} 
            rowKey="taskId"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Empty 
            description={
              loading ? "正在加载..." : "暂无处理任务"
            }
            style={{ margin: '40px 0' }}
          />
        )}
      </Card>
    </div>
  );
};

export default BackgroundTasks;
