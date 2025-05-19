import React, {useState, useEffect} from 'react';
import {Form, Input, Button, Checkbox, Typography, Row, Col, Divider, message} from 'antd';
import {UserOutlined, LockOutlined, GithubOutlined, GoogleOutlined} from '@ant-design/icons';
import {useNavigate, Link} from 'react-router';
import {login, saveAuthData, isAuthenticated, handleOAuthCallback, getGitHubLoginUrl} from '../../api';
import useIsMobile from '../../hooks/useIsMobile';

const {Title, Text} = Typography;

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    useEffect(() => {
        const checkOAuthCallback = async () => {
            try {
                if (await handleOAuthCallback()) {
                    message.success('第三方登录成功！');
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
            const response = await login({
                email: values.email,
                password: values.password
            });

            if (response.success && response.data) {
                // 保存认证信息
                saveAuthData(response.data);

                
                // 显示成功消息
                message.success(response.message || '登录成功！');

                // 跳转到首页
                navigate('/');
            } else {
                // 显示错误消息
                message.error(response.message || '登录失败，请检查账号和密码');
            }
        } catch (error) {
            console.error('登录出错:', error);
            message.error('登录过程中出现错误，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    const handleGitHubLogin = () => {
        window.location.href = getGitHubLoginUrl();
    };

    return (
        <Row style={{height: '100vh', overflow: 'hidden'}}>
            {/* 左侧登录表单 */}
            <Col
                xs={24}
                md={isMobile ? 24 : 12}
                style={{
                    padding: isMobile ? '20px' : '40px',
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
                    <div style={{marginBottom: '40px', textAlign: 'center'}}>
                        <Title level={2} style={{
                            marginBottom: '8px',
                            fontWeight: 700,
                            background: 'linear-gradient(120deg, #18181b, #444444)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            欢迎回到 Foxel
                        </Title>
                        <Text style={{fontSize: '16px', color: '#666'}}>
                            请登录您的账户以继续使用
                        </Text>
                    </div>

                    <Form
                        name="login_form"
                        initialValues={{remember: true}}
                        onFinish={onFinish}
                        size="large"
                        layout="vertical"
                    >
                        <Form.Item
                            name="email"
                            rules={[{required: true, message: '请输入您的邮箱'}]}
                        >
                            <Input
                                prefix={<UserOutlined style={{color: '#bfbfbf'}}/>}
                                placeholder="邮箱"
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
                            rules={[{required: true, message: '请输入您的密码'}]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{color: '#bfbfbf'}}/>}
                                placeholder="密码"
                                style={{
                                    height: '50px',
                                    borderRadius: '10px',
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #eaeaea'
                                }}
                            />
                        </Form.Item>

                        <Form.Item>
                            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <Checkbox name="remember">记住我</Checkbox>
                                <a href="#forgot" style={{color: '#18181b'}}>忘记密码？</a>
                            </div>
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
                                登录
                            </Button>
                        </Form.Item>

                        <Divider plain style={{color: '#999', fontSize: '14px'}}>
                            或使用以下方式登录
                        </Divider>

                        <div style={{display: 'flex', justifyContent: 'center', gap: '20px', margin: '20px 0'}}>
                            <Button
                                icon={<GithubOutlined/>}
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
                                icon={<GoogleOutlined/>}
                                size="large"
                                shape="circle"
                                style={{
                                    backgroundColor: '#f6f6f6',
                                    border: 'none',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                }}
                            />
                        </div>

                        <div style={{textAlign: 'center', marginTop: '30px'}}>
                            <Text style={{color: '#666'}}>
                                还没有账户？ <Link to="/register"
                                                  style={{color: '#18181b', fontWeight: 500}}>立即注册</Link>
                            </Text>
                            <div style={{marginTop: '15px'}}>
                                <Link to="/anonymous" style={{color: '#666'}}>
                                    <Button type="link" style={{padding: '0', fontWeight: 500}}>匿名图床</Button>
                                </Link>
                            </div>
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
                        width: '600px',
                        height: '600px',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
                        top: '20%',
                        left: '30%'
                    }}></div>

                    <div style={{
                        position: 'absolute',
                        width: '400px',
                        height: '400px',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)',
                        bottom: '10%',
                        right: '20%'
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
                            图片管理新方式
                        </Title>
                        <Text style={{
                            fontSize: '18px',
                            color: 'rgba(255,255,255,0.8)',
                            lineHeight: '1.8',
                            display: 'block',
                            marginBottom: '30px'
                        }}>
                            Foxel 提供高效、直观的图片管理体验，让您轻松整理、查找和分享珍贵的视觉记忆。
                        </Text>

                        {/* 图片管理界面预览 */}
                        <div style={{
                            width: '100%',
                            height: '300px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '20px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '12px',
                                left: '12px',
                                right: '12px',
                                height: '30px',
                                borderRadius: '8px 8px 0 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                paddingLeft: '12px'
                            }}>
                                <div style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.6)'
                                }}/>
                                <div style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.6)'
                                }}/>
                                <div style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.6)'
                                }}/>
                            </div>

                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: '24px',
                                fontWeight: 'bold',
                                color: 'rgba(255,255,255,0.7)'
                            }}>
                                Foxel 界面预览
                            </div>
                        </div>
                    </div>
                </Col>
            )}
        </Row>
    );
};

export default Login;