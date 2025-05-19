import { Tabs, Layout, Menu, Space } from 'antd';
import { useAuth } from '../../api/AuthContext';
import { UserRole } from '../../api/types';
import { useState, type SetStateAction } from 'react';
import SystemConfig from './SystemConfig.tsx';
import UserProfile from './UserProfile.tsx';
import useIsMobile from '../../hooks/useIsMobile';
import {
  UserOutlined,
  SettingOutlined,
  BgColorsOutlined,
  BellOutlined,
} from '@ant-design/icons';

const { TabPane } = Tabs;
const { Sider, Content } = Layout;

function Settings() {
  const { hasRole } = useAuth();
  const isMobile = useIsMobile();
  const [activeMenu, setActiveMenu] = useState('profile');
  const [activeTab, setActiveTab] = useState('basic');

  const renderContent = () => {
    switch (activeMenu) {
      case 'profile':
        return (
          <div className="settings-content">
            <UserProfile />
          </div>
        );
      case 'system':
        return (
          <div className="settings-content">
            <SystemConfig />

          </div>
        );
      case 'appearance':
        return (
          <div className="settings-content">
            <Tabs activeKey={activeTab} onChange={setActiveTab} className="horizontal-tabs">
              <TabPane tab="主题" key="theme">
                <div>主题设置</div>
              </TabPane>
              <TabPane tab="布局" key="layout">
                <div>布局设置</div>
              </TabPane>
            </Tabs>
          </div>
        );
      case 'notifications':
        return (
          <div className="settings-content">
            <Tabs activeKey={activeTab} onChange={setActiveTab} className="horizontal-tabs">
              <TabPane tab="通知类型" key="types">
                <div>通知类型设置</div>
              </TabPane>
              <TabPane tab="提醒方式" key="methods">
                <div>提醒方式设置</div>
              </TabPane>
            </Tabs>
          </div>
        );
      default:
        return null;
    }
  };

  // 菜单项配置
  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    hasRole(UserRole.Administrator) ? {
      key: 'system',
      icon: <SettingOutlined />,
      label: '系统配置',
    } : null,
    {
      key: 'appearance',
      icon: <BgColorsOutlined />,
      label: '外观设置',
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: '通知设置',
    },
  ].filter(Boolean);

  const handleMenuChange = (key: SetStateAction<string>) => {
    setActiveMenu(key);
    switch (key) {
      case 'profile':
        setActiveTab('basic');
        break;
      case 'system':
        setActiveTab('basic');
        break;
      case 'appearance':
        setActiveTab('theme');
        break;
      case 'notifications':
        setActiveTab('types');
        break;
    }
  };
  
  // 手机版使用Tabs作为顶部导航
  if (isMobile) {
    return (
      <div style={{ padding: 0 }}>
        <Tabs
          activeKey={activeMenu}
          onChange={(key) => handleMenuChange(key)}
          centered
          size="large"
          tabBarStyle={{ 
            marginBottom: 16, 
            fontWeight: 500,
            backgroundColor: '#f5f5f5',
            padding: '8px 0',
            borderRadius: '8px'
          }}
        >
          {menuItems.map((item) => (
            <TabPane 
              tab={
                <Space size={4}>
                  {item?.icon}
                  <span>{item?.label}</span>
                </Space>
              } 
              key={item?.key || ''} 
            >
              <div style={{ padding: '0 4px' }}>
                {renderContent()}
              </div>
            </TabPane>
          ))}
        </Tabs>
      </div>
    );
  }

  // 桌面版使用侧边栏
  return (
    <Layout style={{
      background: '#fff',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      <Sider width={200} style={{ background: '#f5f5f5' }}>
        <Menu
          mode="vertical"
          selectedKeys={[activeMenu]}
          style={{ height: '100%', borderRight: 0 }}
          items={menuItems}
          onClick={({ key }) => handleMenuChange(key)}
        />
      </Sider>
      <Content style={{ minHeight: 500 }}>
        {renderContent()}
      </Content>
    </Layout>
  );
}

export default Settings;
