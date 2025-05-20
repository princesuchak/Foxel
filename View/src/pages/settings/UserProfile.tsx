import React, { useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { useAuth } from '../../api/AuthContext';
import UserAvatar from '../../components/UserAvatar';
import useIsMobile from '../../hooks/useIsMobile';
import { updateUserInfo } from '../../api';

const UserProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const isMobile = useIsMobile();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (values: any) => {
    // 验证两次密码输入是否一致
    if (values.newPassword && values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const updateData = {
        userName: values.username !== user?.userName ? values.username : undefined,
        email: values.email !== user?.email ? values.email : undefined,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      };

      // 过滤掉空值
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined || 
            updateData[key as keyof typeof updateData] === '') {
          delete updateData[key as keyof typeof updateData];
        }
      });

      // 如果没有需要更新的内容，直接返回
      if (Object.keys(updateData).length === 0) {
        message.info('没有内容需要更新');
        setLoading(false);
        return;
      }

      const response = await updateUserInfo(updateData);
      
      if (response.success && response.data) {
        message.success('个人信息更新成功');
        // 更新Context中的用户信息
        refreshUser();
        // 清除密码字段
        form.setFieldsValue({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        message.error(response.message || '更新失败');
      }
    } catch (error) {
      console.error('更新个人信息时出错:', error);
      message.error('系统错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };
  
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
        form={form}
        layout="vertical" 
        initialValues={{
          username: user?.userName || '',
          email: user?.email || '',
        }}
        size={isMobile ? "middle" : "large"}
        onFinish={handleSubmit}
      >
        <Form.Item 
          name="username" 
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { max: 50, message: '用户名最长50个字符' }
          ]}
        >
          <Input placeholder="用户名" />
        </Form.Item>
        
        <Form.Item name="email" label="邮箱">
          <Input placeholder="邮箱" disabled />
        </Form.Item>
        
        <Form.Item 
          name="currentPassword" 
          label="当前密码"
          rules={[
            { 
              required: false, 
              message: '更改密码时需要输入当前密码'
            }
          ]}
          tooltip="修改密码时必填，其他情况可不填"
        >
          <Input.Password placeholder="只有修改密码时才需要填写" />
        </Form.Item>
        
        <Form.Item 
          name="newPassword" 
          label="新密码"
          rules={[
            { min: 6, message: '密码至少6位' },
            { max: 20, message: '密码最长20位' }
          ]}
          dependencies={['currentPassword']}
        >
          <Input.Password placeholder="留空则不更改密码" />
        </Form.Item>
        
        <Form.Item 
          name="confirmPassword" 
          label="确认新密码"
          dependencies={['newPassword']}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="确认新密码" />
        </Form.Item>
        
        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit"
            block={isMobile}
            size={isMobile ? "middle" : "large"}
            loading={loading}
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
