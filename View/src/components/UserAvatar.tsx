import React from 'react';
import { Avatar as AntAvatar, type AvatarProps as AntAvatarProps } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import md5 from 'md5';

interface UserAvatarProps extends Omit<AntAvatarProps, 'src'> {
  email?: string;
  url?: string;
  text?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  email, 
  url, 
  text, 
  size = 46, 
  style,
  ...restProps 
}) => {
  // 确定头像源
  const getAvatarSrc = () => {
    if (url) {
      return url;
    }
    
    if (email) {
      const hash = md5(email.toLowerCase().trim());
      return `https://cn.cravatar.com/avatar/${hash}?s=${typeof size === 'number' ? size * 2 : 96}&d=identicon`;
    }
    
    return null;
  };
  
  const avatarSrc = getAvatarSrc();
  
  // 默认样式
  const defaultStyle = {
    backgroundColor: !avatarSrc && !text ? '#18181b' : undefined,
    cursor: 'pointer',
    boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
    ...style
  };

  return (
    <AntAvatar
      size={size}
      src={avatarSrc}
      style={defaultStyle}
      icon={!avatarSrc && !text ? <UserOutlined /> : null}
      {...restProps}
    >
      {!avatarSrc && text ? text.charAt(0).toUpperCase() : null}
    </AntAvatar>
  );
};

export default UserAvatar;
