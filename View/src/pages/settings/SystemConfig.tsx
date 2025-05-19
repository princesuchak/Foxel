import React, { useEffect, useState } from 'react';
import { Tabs, Card, message, Spin, Select } from 'antd';
import { CloudOutlined, DatabaseOutlined } from '@ant-design/icons';
import { getAllConfigs, setConfig } from '../../api';
import ConfigGroup from './ConfigGroup.tsx';

const { TabPane } = Tabs;
const { Option } = Select;

interface ConfigStructure {
  [key: string]: {
    [key: string]: string;
  };
}

const SystemConfig: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<ConfigStructure>({});
  const [activeKey, setActiveKey] = useState('AI');
  const [storageType, setStorageType] = useState('Telegram');

  // 获取所有配置项
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await getAllConfigs();
      if (response.success && response.data) {
        const configGroups: ConfigStructure = {};
        response.data.forEach(config => {
          const [group, key] = config.key.split(':');
          if (!configGroups[group]) {
            configGroups[group] = {};
          }
          configGroups[group][key] = config.value;
        });

        setConfigs(configGroups);
        
        // 设置初始存储类型
        if (configGroups.Storage?.DefaultStorage) {
          setStorageType(configGroups.Storage.DefaultStorage);
        }
      } else {
        message.error('获取配置失败: ' + response.message);
      }
    } catch (error) {
      message.error('获取配置出错');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 保存配置项
  const handleSaveConfig = async (group: string, key: string, value: string) => {
    try {
      const configKey = `${group}:${key}`;
      const response = await setConfig({
        key: configKey,
        value: value,
        description: `${group} ${key} setting`
      });

      if (response.success) {
        message.success(`保存 ${key} 配置成功`);
        // 更新本地状态
        setConfigs(prev => ({
          ...prev,
          [group]: {
            ...prev[group],
            [key]: value
          }
        }));
      } else {
        message.error(`保存失败: ${response.message}`);
      }
    } catch (error) {
      message.error('保存配置出错');
      console.error(error);
    }
  };

  // 存储类型选项
  const storageOptions = [
    { value: 'Telegram', label: 'Telegram存储', icon: <CloudOutlined style={{ color: '#0088cc' }} /> },
    { value: 'Local', label: '本地存储', icon: <DatabaseOutlined style={{ color: '#52c41a' }} /> },
    // 未来可以添加更多存储选项
  ];

  useEffect(() => {
    fetchConfigs();
  }, []);

  return (
    <Card title="系统配置" className="system-config-card">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin tip="加载配置中..." />
        </div>
      ) : (
        <Tabs activeKey={activeKey} onChange={setActiveKey}>
          <TabPane tab="AI 设置" key="AI">
            <ConfigGroup
              groupName="AI"
              configs={{
                ApiEndpoint: configs.AI?.ApiEndpoint || '',
                ApiKey: configs.AI?.ApiKey || '',
                Model: configs.AI?.Model || '',
                EmbeddingModel: configs.AI?.EmbeddingModel || ''
              }}
              onSave={handleSaveConfig}
              descriptions={{
                ApiEndpoint: 'AI 服务的API端点地址',
                ApiKey: 'AI 服务的API密钥',
                Model: 'AI 模型名称',
                EmbeddingModel: '嵌入向量模型名称'
              }}
            />
          </TabPane>

          <TabPane tab="JWT 设置" key="Jwt">
            <ConfigGroup
              groupName="Jwt"
              configs={{
                SecretKey: configs.Jwt?.SecretKey || '',
                Issuer: configs.Jwt?.Issuer || '',
                Audience: configs.Jwt?.Audience || '',
              }}
              onSave={handleSaveConfig}
              descriptions={{
                SecretKey: 'JWT 加密密钥',
                Issuer: 'JWT 签发者',
                Audience: 'JWT 接收者',
              }}
            />
          </TabPane>

          <TabPane tab="应用设置" key="AppSettings">
            <ConfigGroup
              groupName="AppSettings"
              configs={{
                ServerUrl: configs.AppSettings?.ServerUrl || ''
              }}
              onSave={handleSaveConfig}
              descriptions={{
                ServerUrl: '服务器URL'
              }}
            />
          </TabPane>

          <TabPane tab="GitHub认证" key="Authentication">
            <ConfigGroup
              groupName="Authentication"
              configs={{
                "GitHubClientId": configs.Authentication?.["GitHubClientId"] || '',
                "GitHubClientSecret": configs.Authentication?.["GitHubClientSecret"] || '',
                "GitHubCallbackUrl": configs.Authentication?.["GitHubCallbackUrl"] || ''
              }}
              onSave={(_group, key, value) => handleSaveConfig('Authentication', key, value)}
              descriptions={{
                "GitHubClientId": 'GitHub OAuth 应用客户端ID',
                "GitHubClientSecret": 'GitHub OAuth 应用客户端密钥',
                "GitHubCallbackUrl": 'GitHub OAuth 认证回调地址'
              }}
            />
          </TabPane>

          <TabPane tab="存储设置" key="Storage">
            <div style={{ marginBottom: 20 }}>
              <span style={{ marginRight: 8, display: 'inline-block', width: 100 }}>默认存储:</span>
              <Select 
                value={configs.Storage?.DefaultStorage || 'Telegram'} 
                onChange={(value) => {
                  handleSaveConfig('Storage', 'DefaultStorage', value);
                }}
                style={{ width: 200 }}
              >
                {storageOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {option.icon}
                      <span style={{ marginLeft: 8 }}>{option.label}</span>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <span style={{ marginRight: 8, display: 'inline-block', width: 100 }}>配置存储:</span>
              <Select 
                value={storageType} 
                onChange={(value) => {
                  setStorageType(value);
                }}
                style={{ width: 200 }}
              >
                {storageOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {option.icon}
                      <span style={{ marginLeft: 8 }}>{option.label}</span>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>

            {storageType === 'Telegram' && (
              <ConfigGroup
                groupName="Storage"
                configs={{
                  "TelegramStorageBotToken": configs.Storage?.TelegramStorageBotToken || '',
                  "TelegramStorageChatId": configs.Storage?.TelegramStorageChatId || ''
                }}
                onSave={handleSaveConfig}
                descriptions={{
                  "TelegramStorageBotToken": 'Telegram 机器人令牌',
                  "TelegramStorageChatId": 'Telegram 聊天ID'
                }}
              />
            )}
          </TabPane>
        </Tabs>
      )}
    </Card>
  );
};

export default SystemConfig;
