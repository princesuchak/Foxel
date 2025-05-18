import React from 'react';
import { Card, Form, Input, Button } from 'antd';
import { useAuth } from '../../api/AuthContext';
import UserAvatar from '../../components/UserAvatar';

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <Card title="个人资料" style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <UserAvatar 
          size={100}
          email={user?.email}
          text={user?.userName}
        />
      </div>
      
      <Form layout="vertical" initialValues={{
        username: user?.userName || '',
        email: user?.email || '',
      }}>
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
          <Button type="primary">保存更改</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default UserProfile;
