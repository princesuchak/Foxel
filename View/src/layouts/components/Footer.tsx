import React from 'react';
import { Layout } from 'antd';
import { GithubOutlined } from '@ant-design/icons';

const { Footer: AntFooter } = Layout;

interface FooterProps {
  isMobile?: boolean;
}

const Footer: React.FC<FooterProps> = ({ isMobile = false }) => {
  return (
    <AntFooter style={{
      background: 'white',
      padding: isMobile ? '10px' : '10px',
      fontSize: isMobile ? '12px' : '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>Foxel ©{new Date().getFullYear()}</div>
      <a 
        href="https://github.com/DrizzleTime/Foxel" 
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: isMobile ? '16px' : '18px', color: '#333' }}
      >
        <GithubOutlined />
      </a>
    </AntFooter>
  );
};

export default Footer;
