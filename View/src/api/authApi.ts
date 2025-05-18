import { type BaseResult, type AuthResponse, type LoginRequest, type RegisterRequest, type UserProfile } from './types';
import { fetchApi, BASE_URL } from './fetchClient';

// 认证数据本地存储键
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// 用户注册
export async function register(data: RegisterRequest): Promise<BaseResult<AuthResponse>> {
    return fetchApi<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

// 用户登录
export async function login(data: LoginRequest): Promise<BaseResult<AuthResponse>> {
    const response = await fetchApi<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
    });
    
    if (response.success && response.data) {
        clearAuthData(); // 清除旧的认证数据
        console.log('登录成功，保存认证数据:', response.data);
        saveAuthData(response.data); // 保存新的认证数据
    }
    
    return response;
}

// 获取当前登录用户
export async function getCurrentUser(): Promise<BaseResult<UserProfile>> {
    try {
        const token = getToken();

        if (!token) {
            return {
                success: false,
                message: '用户未登录',
                code: 401
            };
        }

        const response = await fetchApi<UserProfile>('/auth/get_current_user');

        // 如果成功获取到用户数据，更新本地存储
        if (response.success && response.data) {
            localStorage.setItem(USER_KEY, JSON.stringify(response.data));
        }

        return response;
    } catch (error: any) {
        return {
            success: false,
            message: `获取用户信息失败: ${error.message}`,
            code: 500
        };
    }
}

// 保存认证数据到本地存储
export const saveAuthData = (authData: AuthResponse): void => {
    localStorage.setItem(TOKEN_KEY, authData.token);
    if (authData.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
    }
};

// 清除认证数据
export const clearAuthData = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

// 检查是否已认证
export const isAuthenticated = (): boolean => {
    return !!getToken();
};

// 获取存储的用户信息
export const getStoredUser = (): UserProfile | null => {
    try {
        const userJson = localStorage.getItem(USER_KEY);
        if (!userJson) return null;

        return JSON.parse(userJson) as UserProfile;
    } catch (error) {
        return null;
    }
};

// 获取存储的令牌
export const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

// 处理GitHub OAuth回调，接收token并保存
export function handleOAuthCallback(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (error) return false;

    if (token) {
        const githubUser = parseJwt(token);
        if (githubUser) {
            // 保存token
            localStorage.setItem('token', token);

            // 保存用户信息
            if (githubUser.unique_name && githubUser.email) {
                const user: UserProfile = {
                    id: parseInt(githubUser.nameid),
                    userName: githubUser.unique_name,
                    email: githubUser.email,
                    roleName: ''
                };
                localStorage.setItem('user', JSON.stringify(user));
            }

            // 清除URL中的token参数
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url.toString());

            return true;
        }
    }

    return false;
}

// 解析JWT获取用户信息
function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

// 获取GitHub登录URL
export function getGitHubLoginUrl(): string {
    return `${BASE_URL}/auth/github/login?returnUrl=${window.location.origin}/api/auth/github/callback`;
}
