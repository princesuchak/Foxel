import type { BaseResult } from './types';
export const BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5153/api';

export async function fetchApi<T = any>(
    url: string,
    options: RequestInit = {}
): Promise<BaseResult<T>> {
    try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers as Record<string, string>,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${BASE_URL}${url}`, {
            ...options,
            headers,
        });
        const data = await response.json();
        return data as BaseResult<T>;
    } catch (error) {
        console.error('API请求错误:', error);
        return {
            success: false,
            message: '网络请求失败，请检查您的网络连接',
            code: 500,
        };
    }
}
