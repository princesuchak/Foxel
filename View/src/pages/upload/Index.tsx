import { Typography } from 'antd';

const { Title } = Typography;

function Upload() {
  return (
    <div>
      <Title level={2} style={{ 
        margin: 0, 
        marginBottom: 20, 
        fontWeight: 600, 
        letterSpacing: '0.5px',
        fontSize: 32,
        background: 'linear-gradient(120deg, #000000, #444444)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>上传图片</Title>
      {/* 上传表单 */}
    </div>
  );
}

export default Upload;
