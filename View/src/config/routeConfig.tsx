import {
  PictureOutlined,
  FolderOutlined,
  HeartOutlined,
  CloudUploadOutlined,
  SettingOutlined,
  CompassOutlined
} from '@ant-design/icons';
import React from 'react';

import AllImages from '../pages/allImages/Index';
import Albums from '../pages/albums/Index';
import AlbumDetail from '../pages/albumDetail/Index';
import Favorites from '../pages/favorites/Index';
import Upload from '../pages/upload/Index';
import Settings from '../pages/settings/Index';
import BackgroundTasks from '../pages/backgroundTasks/Index';
import PixHub from '../pages/pixHub/Index';

// 路由配置类型定义
export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  // 以下属性用于菜单配置
  key: string;
  icon?: React.ReactNode;
  label: string;
  hideInMenu?: boolean;
  children?: RouteConfig[];
  groupLabel?: string; // 分组标题
  divider?: boolean; // 是否显示分隔线
  // 面包屑相关配置
  breadcrumb?: {
    title: string;
    parent?: string; // 父级路由的key
  };
}

// 统一的路由和菜单配置
const routes: RouteConfig[] = [
  {
    path: '/',
    key: 'all-images',
    icon: <PictureOutlined />,
    label: '所有图片',
    element: <AllImages />,
    breadcrumb: {
      title: '所有图片'
    }
  },
  {
    path: 'albums',
    key: 'albums',
    icon: <FolderOutlined />,
    label: '相册',
    element: <Albums />,
    breadcrumb: {
      title: '相册'
    }
  },
  {
    path: 'albums/:id',
    key: 'album-detail',
    label: '相册详情',
    element: <AlbumDetail />,
    hideInMenu: true,
    breadcrumb: {
      title: '相册详情',
      parent: 'albums'
    }
  },
  {
    path: 'favorites',
    key: 'favorites',
    icon: <HeartOutlined />,
    label: '收藏',
    element: <Favorites />,
    breadcrumb: {
      title: '收藏'
    }
  },
  {
    path: 'square',
    key: 'square',
    icon: <CompassOutlined />,
    label: '图片广场',
    element: <PixHub />,
    groupLabel: '社区发现',
    breadcrumb: {
      title: '图片广场'
    }
  },
  {
    path: 'tasks',
    key: 'tasks',
    icon: <CloudUploadOutlined />,
    label: '任务中心',
    element: <BackgroundTasks />,
    groupLabel: '系统功能',
    breadcrumb: {
      title: '任务中心'
    }
  },
  {
    path: 'settings',
    key: 'settings',
    icon: <SettingOutlined />,
    label: '设置',
    element: <Settings />,
    breadcrumb: {
      title: '设置'
    }
  },
  {
    path: 'upload',
    key: 'upload',
    label: '上传',
    element: <Upload />,
    hideInMenu: true,
    breadcrumb: {
      title: '上传'
    }
  },
];

export default routes;
