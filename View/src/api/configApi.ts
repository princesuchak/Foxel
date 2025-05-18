import { UserRole, type BaseResult, type ConfigResponse, type SetConfigRequest } from './types';
import { fetchApi } from './fetchClient';

// 获取所有配置
export const getAllConfigs = async (): Promise<BaseResult<ConfigResponse[]>> => {
  try {
    return await fetchApi<ConfigResponse[]>('/config/get_configs');
  } catch (error: any) {
    return {
      success: false,
      message: `获取配置失败: ${error.message}`,
      code: 500
    };
  }
};

// 获取单个配置
export const getConfig = async (key: string): Promise<BaseResult<ConfigResponse>> => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('key', key);
    
    return await fetchApi<ConfigResponse>(`/config/get_config?${queryParams.toString()}`);
  } catch (error: any) {
    return {
      success: false,
      message: `获取配置失败: ${error.message}`,
      code: 500
    };
  }
};

// 设置配置
export const setConfig = async (config: SetConfigRequest): Promise<BaseResult<ConfigResponse>> => {
  try {
    return await fetchApi<ConfigResponse>('/config/set_config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  } catch (error: any) {
    return {
      success: false,
      message: `设置配置失败: ${error.message}`,
      code: 500
    };
  }
};

// 删除配置
export const deleteConfig = async (key: string): Promise<BaseResult<boolean>> => {
  try {
    return await fetchApi<boolean>('/config/delete_config', {
      method: 'POST',
      body: JSON.stringify(key),
    });
  } catch (error: any) {
    return {
      success: false,
      message: `删除配置失败: ${error.message}`,
      code: 500
    };
  }
};

// 角色权限检查
export const hasRole = (userRole: string | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;
  
  // 如果是管理员，拥有所有权限
  if (userRole === UserRole.Administrator) return true;
  
  // 精确匹配角色
  return userRole === requiredRole;
};
