import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, Typography, Row, Col, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, GithubOutlined, GoogleOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router';
import { register, saveAuthData, isAuthenticated, handleOAuthCallback, getGitHubLoginUrl } from '../../api';
import useIsMobile from '../../hooks/useIsMobile';

const { Title, Text } = Typography;

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const checkOAuthCallback = async () => {
      try {
        if (await handleOAuthCallback()) {
          message.success('使用GitHub账号注册成功！');
          navigate('/');
          return;
        }

        if (isAuthenticated()) {
          navigate('/');
        }
      } catch (error) {
        console.error('处理登录回调失败:', error);
        message.error('登录过程中出现错误');
      }
    };
    
    checkOAuthCallback();
  }, [navigate]);

  const onFinish = async (values: any) => {
    setLoading(true);
    
    try {
      const response = await register({
        username: values.username,
        email: values.email,
        password: values.password
      });

      if (response.success && response.data) {
        // 保存认证信息
        saveAuthData(response.data);
        
        // 显示成功消息
        message.success(response.message || '注册成功！');
        
        // 跳转到首页
        navigate('/');
      } else {
        // 显示错误消息
        message.error(response.message || '注册失败，请检查填写信息');
      }
    } catch (error) {
      console.error('注册出错:', error);
      message.error('注册过程中出现错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    window.location.href = getGitHubLoginUrl();
  };

  return (
    <Row style={{ height: '100vh', overflow: 'hidden' }}>
      {/* 左侧注册表单 */}
      <Col 
        xs={24} 
        md={isMobile ? 24 : 12} 
        style={{
          padding: isMobile ? '20px' : '20px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          maxWidth: isMobile ? '100%' : '650px',
          margin: '0 auto'
        }}
      >
        <div style={{ 
          maxWidth: isMobile ? '100%' : '400px', 
          width: '100%', 
          margin: '0 auto',
          paddingBottom: isMobile ? '40px' : 0 
        }}>
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <Title level={2} style={{
              marginBottom: '8px',
              fontWeight: 700,
              background: 'linear-gradient(120deg, #18181b, #444444)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              创建 Foxel 账户
            </Title>
            <Text style={{ fontSize: '16px', color: '#666' }}>
              开始您的图像管理之旅
            </Text>
          </div>

          <Form
            name="register_form"
            initialValues={{ agreement: true }}
            onFinish={onFinish}
            size="large"
            layout="vertical"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入您的用户名' },
                { min: 3, message: '用户名至少3个字符' }
              ]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} 
                placeholder="用户名" 
                style={{ 
                  height: '50px', 
                  borderRadius: '10px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #eaeaea'
                }} 
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入您的电子邮箱' },
                { type: 'email', message: '请输入有效的电子邮箱地址' }
              ]}
            >
              <Input 
                prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} 
                placeholder="电子邮箱" 
                style={{ 
                  height: '50px', 
                  borderRadius: '10px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #eaeaea'
                }} 
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入您的密码' },
                { min: 8, message: '密码至少8个字符' }
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} 
                placeholder="密码" 
                style={{ 
                  height: '50px', 
                  borderRadius: '10px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #eaeaea'
                }} 
              />
            </Form.Item>

            <Form.Item
              name="confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认您的密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不匹配'));
                  },
                }),
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} 
                placeholder="确认密码" 
                style={{ 
                  height: '50px', 
                  borderRadius: '10px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #eaeaea'
                }} 
              />
            </Form.Item>

            <Form.Item
              name="agreement"
              valuePropName="checked"
              rules={[
                { 
                  validator: (_, value) => 
                    value ? Promise.resolve() : Promise.reject(new Error('请阅读并同意服务条款和隐私政策')) 
                },
              ]}
            >
              <Checkbox>
                我已阅读并同意 <a href="#terms">服务条款</a> 和 <a href="#privacy">隐私政策</a>
              </Checkbox>
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                style={{ 
                  width: '100%', 
                  height: '50px',
                  borderRadius: '10px',
                  fontWeight: 500,
                  fontSize: '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                注册
              </Button>
            </Form.Item>

            <Divider plain style={{ color: '#999', fontSize: '14px' }}>
              或使用以下方式注册
            </Divider>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '20px 0' }}>
              <Button 
                icon={<GithubOutlined />} 
                size="large" 
                shape="circle" 
                onClick={handleGitHubLogin}
                style={{ 
                  backgroundColor: '#f6f6f6', 
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }} 
              />
              <Button 
                icon={<GoogleOutlined />} 
                size="large" 
                shape="circle" 
                style={{ 
                  backgroundColor: '#f6f6f6', 
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }} 
              />
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Text style={{ color: '#666' }}>
                已经有账户？ <Link to="/login" style={{ color: '#18181b', fontWeight: 500 }}>立即登录</Link>
              </Text>
            </div>
          </Form>
        </div>
      </Col>

      {/* 右侧视觉区域 - 仅在非移动设备上显示 */}
      {!isMobile && (
        <Col md={12} style={{ 
          background: 'linear-gradient(135deg, #18181b 0%, #444444 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          height: '100vh'
        }}>
          <div style={{ 
            position: 'absolute', 
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
            bottom: '20%',
            left: '10%'
          }}></div>
          
          <div style={{ 
            position: 'absolute', 
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)',
            top: '15%',
            right: '15%'
          }}></div>
          
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: 'white',
            position: 'relative',
            zIndex: 1,
            maxWidth: '500px'
          }}>
            <Title level={2} style={{ 
              color: 'white', 
              marginBottom: '25px',
              fontWeight: 700,
              letterSpacing: '1px'
            }}>
              加入 Foxel 社区
            </Title>
            <Text style={{ 
              fontSize: '18px',
              color: 'rgba(255,255,255,0.8)',
              lineHeight: '1.8',
              display: 'block',
              marginBottom: '30px'
            }}>
              注册账户后，您可以享受无缝的图片管理体验，包括云端存储、智能相册分类和高级分享功能。
            </Text>
            
            {/* 特性列表 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              marginTop: '30px',
              alignItems: 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.05)',
              padding: '30px',
              borderRadius: '20px',
              boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>✓</div>
                <Text style={{ color: 'white', fontSize: '16px', textAlign: 'left' }}>
                  无限云存储空间
                </Text>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>✓</div>
                <Text style={{ color: 'white', fontSize: '16px', textAlign: 'left' }}>
                  AI 智能相册分类
                </Text>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>✓</div>
                <Text style={{ color: 'white', fontSize: '16px', textAlign: 'left' }}>
                  跨设备同步与访问
                </Text>
              </div>
            </div>
          </div>
        </Col>
      )}
    </Row>
  );
};

export default Register;