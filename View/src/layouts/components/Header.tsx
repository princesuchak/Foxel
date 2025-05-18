import { Layout, Button, Dropdown, Breadcrumb, Input } from 'antd';
import { 
    MenuFoldOutlined, 
    MenuUnfoldOutlined, 
    UserOutlined, 
    LogoutOutlined,
    SettingOutlined
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router';
import routes, { type RouteConfig } from '../../config/routeConfig';
import UserAvatar from '../../components/UserAvatar';
import { useAuth } from '../../api/AuthContext';
import { useState } from 'react';
import SearchDialog from '../../components/search/SearchDialog';

const { Header: AntHeader } = Layout;
const { Search } = Input;

interface HeaderProps {
    collapsed: boolean;
    toggleCollapsed: () => void;
    onLogout: () => void;
    currentRouteData?: {
        routeInfo: RouteConfig | undefined;
        params: Record<string, string>;
        title?: string; // 动态标题，用于显示如"相册名称"等动态数据
    };
    isMobile?: boolean;
}

const Header = ({ 
    collapsed, 
    toggleCollapsed, 
    onLogout, 
    currentRouteData,
    isMobile = false 
}: HeaderProps) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchDialogVisible, setSearchDialogVisible] = useState(false);
    const [searchText, setSearchText] = useState('');

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined/>,
            label: '个人资料',
            onClick: () => navigate('/settings')
        },
        {
            key: 'settings',
            icon: <SettingOutlined/>,
            label: '设置',
            onClick: () => navigate('/settings')
        },
        {
            key: 'logout',
            icon: <LogoutOutlined/>,
            label: '退出登录',
            onClick: onLogout
        }
    ];

    // 生成面包屑项
    const generateBreadcrumbItems = () => {
        const breadcrumbItems = [];
        
        // 添加首页
        breadcrumbItems.push({
            key: 'home',
            title: <Link to="/">首页</Link>,
        });

        // 确保routeInfo和breadcrumb都存在
        if (currentRouteData?.routeInfo && currentRouteData.routeInfo.breadcrumb) {
            const { routeInfo, title } = currentRouteData;
            const breadcrumb = routeInfo.breadcrumb;
            
            // 如果有父级路由，先添加父级路由的面包屑
            if (breadcrumb && breadcrumb.parent) {
                const parentRoute = routes.find(r => r.key === breadcrumb.parent);
                if (parentRoute && parentRoute.breadcrumb) {
                    breadcrumbItems.push({
                        key: parentRoute.key,
                        title: <Link to={`/${parentRoute.path}`}>{parentRoute.breadcrumb.title}</Link>,
                    });
                }
            }
            
            // 添加当前路由的面包屑
            breadcrumbItems.push({
                key: routeInfo.key,
                title: title || breadcrumb?.title,
            });
        }
        
        return breadcrumbItems;
    };

    // 处理搜索框输入
    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(e.target.value);
    };

    // 处理搜索操作，仅当点击搜索按钮或按回车时执行
    const handleSearch = (value: string) => {
        if (value.trim() || !value) { // 允许空搜索打开高级搜索
            setSearchDialogVisible(true);
        }
    };

    return (
        <>
            <AntHeader style={{
                padding: isMobile ? '0 10px' : '0 40px',
                background: '#ffffff',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: isMobile ? 56 : 64,
                position: 'sticky',
                top: 0,
                zIndex: 10,
                width: '100%',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined/> : <MenuFoldOutlined/>}
                        onClick={toggleCollapsed}
                        style={{
                            fontSize: 18,
                            width: 46,
                            height: 46,
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    />
                    
                    {/* 面包屑导航 */}
                    {!isMobile && (
                      <Breadcrumb 
                          items={generateBreadcrumbItems()} 
                          style={{ marginLeft: 16 }} 
                      />
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 25 }}>
                    {/* 搜索框 - 修复交互问题 */}
                    {!isMobile && (
                      <Search
                          placeholder="搜索图片..."
                          allowClear
                          value={searchText}
                          onChange={handleSearchInputChange}
                          onSearch={handleSearch}
                          style={{
                              width: 300,
                              borderRadius: 100
                          }}
                          size="middle"
                      />
                    )}
                    
                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                        <UserAvatar 
                            size={46}
                            email={user?.email}
                            text={user?.userName}
                        />
                    </Dropdown>
                </div>
            </AntHeader>
            
            {/* 搜索对话框 - 传递搜索文本 */}
            <SearchDialog 
                visible={searchDialogVisible}
                initialSearchText={searchText}
                onClose={() => {
                    setSearchDialogVisible(false);
                    // 可选：关闭对话框后清空搜索框
                    // setSearchText('');
                }}
            />
        </>
    );
};

export default Header;
