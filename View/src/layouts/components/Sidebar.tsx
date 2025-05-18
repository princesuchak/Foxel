import React from 'react';
import { Layout, Menu, type MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router';
import routes from '../../config/routeConfig';
import logo from '/logo.png';

const { Sider } = Layout;

interface SidebarProps {
    collapsed: boolean;
    isMobile?: boolean;
    onClose?: () => void;
}

// 定义菜单项类型
type MenuItem = Required<MenuProps>['items'][number];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, isMobile = false, onClose }) => {
    const location = useLocation();
    const navigate = useNavigate();

    // 菜单项样式
    const menuItemStyle = { fontSize: 15 };
    const iconStyle = { fontSize: 18 };

    // 分组标题样式
    const groupTitleStyle = {
        fontSize: 12,
        color: '#8c8c8c',
        fontWeight: 500,
        marginLeft: collapsed ? 0 : 16,
        padding: collapsed ? '8px 0' : '8px 0'
    };

    // 从路由配置生成菜单项
    const generateMenuItems = (): MenuItem[] => {
        const items: MenuItem[] = [];
        let lastGroup = '';

        routes.forEach(route => {
            if (route.hideInMenu) return;

            // 如果有分组标签且与上一个不同，添加分组
            if (route.groupLabel && route.groupLabel !== lastGroup && !collapsed) {
                items.push({
                    type: 'group',
                    label: <div style={groupTitleStyle}>{route.groupLabel}</div>,
                    children: []
                } as MenuItem);
                lastGroup = route.groupLabel;
            }

            // 如果需要添加分隔符
            if (route.divider) {
                items.push({
                    type: 'divider'
                });
            }

            // 添加菜单项
            items.push({
                key: route.path,
                icon: route.icon && React.isValidElement(route.icon)
                    ? React.cloneElement(route.icon as React.ReactElement<any>, { style: iconStyle })
                    : route.icon,
                label: <span style={menuItemStyle}>{route.label}</span>
            });
        });

        return items;
    };

    // 获取当前选中的菜单项
    const getSelectedKey = () => {
        const pathname = location.pathname;
        const matchedRoute = routes.find(route => {
            if (route.path.includes(':')) {
                const basePath = route.path.split(':')[0].replace(/\/$/, '');
                return pathname.startsWith('/' + basePath);
            }
            if (route.path === '/' && pathname === '/') {
                return true;
            }
            return pathname === '/' + route.path;
        });
        return matchedRoute ? (matchedRoute.path === '/' ? '/' : matchedRoute.path) : '/';
    };

    const handleMenuClick = ({ key }: { key: string }) => {
        navigate(key);
    };

    return (
        <>
            {/* 遮罩层 - 仅在手机模式且侧边栏展开时显示 */}
            {isMobile && !collapsed && (
                <div
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        zIndex: 999, // 确保在Sider(1000)之下
                    }}
                />
            )}
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                width={isMobile ? 180 : 250}
                collapsedWidth={isMobile ? 0 : 80}
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: isMobile ? 'absolute' : 'relative',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: isMobile ? 1000 : 1,
                    boxShadow: isMobile && !collapsed ? '0 0 10px rgba(0,0,0,0.2)' : 'none',
                    backgroundColor: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Logo区域 */}
                <div style={{
                    height: isMobile ? '56px' : '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '0' : '0 20px',
                    color: '#001529',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    overflow: 'hidden',
                    backgroundColor: 'white',
                    borderBottom: '1px solid #f0f0f0'
                }}>
                    <img
                        src={logo}
                        alt="Foxel Logo"
                        style={{
                            height: collapsed ? '30px' : '32px',
                            marginRight: collapsed ? '0' : '12px',
                            transition: 'all 0.2s'
                        }}
                    />
                    {!collapsed && <span>Foxel</span>}
                </div>

                {/* 侧边栏菜单 */}
                <Menu
                    theme="light"
                    mode="inline"
                    defaultSelectedKeys={[getSelectedKey()]}
                    items={generateMenuItems()}
                    onClick={handleMenuClick}
                    style={{
                        borderRight: 'none',
                        flex: 1 
                    }}
                />
            </Sider>
        </>
    );
};

export default Sidebar;
