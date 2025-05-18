import React from 'react';
import { Form, Input, Button, Space, Row, Col, Tooltip } from 'antd';
import { SaveOutlined, QuestionCircleOutlined } from '@ant-design/icons';

interface ConfigGroupProps {
  groupName: string;
  configs: {
    [key: string]: string;
  };
  onSave: (group: string, key: string, value: string) => Promise<void>;
  descriptions: {
    [key: string]: string;
  };
}

const ConfigGroup: React.FC<ConfigGroupProps> = ({
  groupName,
  configs,
  onSave,
  descriptions
}) => {
  const [form] = Form.useForm();

  // 保存单个配置项
  const handleSaveSingle = async (key: string) => {
    try {
      const value = form.getFieldValue(key);
      await onSave(groupName, key, value);
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  };

  // 保存所有配置项
  const handleSaveAll = async () => {
    try {
      const values = form.getFieldsValue();
      for (const key in values) {
        await onSave(groupName, key, values[key]);
      }
    } catch (error) {
      console.error('保存所有配置失败:', error);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={configs}
    >
      {Object.keys(configs).map(key => (
        <Row key={key} gutter={16} align="middle">
          <Col xs={24} lg={16}>
            <Form.Item
              name={key}
              label={
                <Space>
                  {key}
                  {descriptions[key] && (
                    <Tooltip title={descriptions[key]}>
                      <QuestionCircleOutlined />
                    </Tooltip>
                  )}
                </Space>
              }
            >
              {key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password') ? (
                <Input.Password placeholder={`请输入${key}`} />
              ) : (
                <Input placeholder={`请输入${key}`} />
              )}
            </Form.Item>
          </Col>
          <Col xs={24} lg={8} style={{ textAlign: 'right' }}>
            <Button 
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => handleSaveSingle(key)}
              style={{ marginBottom: 24 }}
            >
              保存
            </Button>
          </Col>
        </Row>
      ))}

      <Form.Item>
        <Button
          type="primary"
          onClick={handleSaveAll}
          style={{ marginTop: 16 }}
          block
        >
          保存所有
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ConfigGroup;
