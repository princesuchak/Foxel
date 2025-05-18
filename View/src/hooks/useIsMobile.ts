import { useState, useEffect } from 'react';

/**
 * 自定义hook，用于检测当前设备是否为移动设备
 * @param breakpoint 断点宽度，默认为768px
 * @returns boolean 如果是移动设备则返回true，否则返回false
 */
const useIsMobile = (breakpoint: number = 768): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // 初始化检测
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    
    // 首次运行
    checkIfMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkIfMobile);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, [breakpoint]);

  return isMobile;
};

export default useIsMobile;
