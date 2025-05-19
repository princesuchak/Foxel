import React from 'react';
import { Card, Form, Input, Button } from 'antd';
import { useAuth } from '../../api/AuthContext';
import UserAvatar from '../../components/UserAvatar';
import useIsMobile from '../../hooks/useIsMobile';

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  return (
    <Card 
      title="个人资料" 
      style={{ 
        maxWidth: '100%',
        margin: isMobile ? '0 auto' : '0 auto',
        boxShadow: isMobile ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'
      }}
      bodyStyle={{ 
        padding: isMobile ? '16px 12px' : '24px' 
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: isMobile ? 16 : 24 
      }}>
        <UserAvatar 
          size={isMobile ? 80 : 100}
          email={user?.email}
          text={user?.userName}
        />
      </div>
      
      <Form 
        layout="vertical" 
        initialValues={{
          username: user?.userName || '',
          email: user?.email || '',
        }}
        size={isMobile ? "middle" : "large"}
      >
        <Form.Item name="username" label="用户名">
          <Input placeholder="用户名" />
        </Form.Item>
        
        <Form.Item name="email" label="邮箱">
          <Input placeholder="邮箱" disabled />
        </Form.Item>
        
        <Form.Item name="password" label="更新密码">
          <Input.Password placeholder="留空则不更改" />
        </Form.Item>
        
        <Form.Item name="confirmPassword" label="确认新密码">
          <Input.Password placeholder="确认新密码" />
        </Form.Item>
        
        <Form.Item>
          <Button 
            type="primary" 
            block={isMobile}
            size={isMobile ? "middle" : "large"}
            style={{
              height: isMobile ? 40 : 'auto'
            }}
          >
            保存更改
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default UserProfile;
