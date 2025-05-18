import React from 'react';
import { Progress, Tag, Tooltip } from 'antd';
import { 
  ClockCircleOutlined, 
  SyncOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined 
} from '@ant-design/icons';
import { ProcessingStatus } from '../api/types';

interface TaskProgressBarProps {
  status: ProcessingStatus;
  progress: number;
  error?: string;
  showLabel?: boolean;
  size?: 'small' | 'default';
  className?: string;
  style?: React.CSSProperties;
}

const TaskProgressBar: React.FC<TaskProgressBarProps> = ({
  status,
  progress,
  error,
  showLabel = true,
  size = 'default',
  className,
  style
}) => {
  let statusColor = '';
  let icon = null;
  let statusText = '';
  let progressStatus: "success" | "exception" | "active" | "normal" | undefined;
  
  switch (status) {
    case ProcessingStatus.Pending:
      statusColor = 'orange';
      progressStatus = 'normal';
      icon = <ClockCircleOutlined />;
      statusText = '等待中';
      break;
    case ProcessingStatus.Processing:
      statusColor = 'processing';
      progressStatus = 'active';
      icon = <SyncOutlined spin />;
      statusText = '处理中';
      break;
    case ProcessingStatus.Completed:
      statusColor = 'success';
      progressStatus = 'success';
      icon = <CheckCircleOutlined />;
      statusText = '已完成';
      break;
    case ProcessingStatus.Failed:
      statusColor = 'error';
      progressStatus = 'exception';
      icon = <CloseCircleOutlined />;
      statusText = '失败';
      break;
  }
  
  return (
    <div className={className} style={{ ...style }}>
      {showLabel && (
        <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center' }}>
          <Tag color={statusColor} icon={icon} style={{ marginRight: 8 }}>
            {statusText}
          </Tag>
          {status === ProcessingStatus.Failed && error && (
            <Tooltip title={error}>
              <span style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 13 }}>
                查看错误
              </span>
            </Tooltip>
          )}
        </div>
      )}
      <Tooltip title={`${progress}%`}>
        <Progress 
          percent={progress} 
          size={size} 
          status={progressStatus}
          showInfo={size !== 'small'}
          strokeColor={status === ProcessingStatus.Failed ? '#ff4d4f' : undefined}
        />
      </Tooltip>
    </div>
  );
};

export default TaskProgressBar;
