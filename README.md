<p align="center">
    <img src="View/public/logo.png" alt="Foxel Logo" width="150"><br>
    <strong>Foxel - 智能图像检索与管理系统</strong>
</p>
<p align="center">
    <a href="#-核心功能"><img src="https://img.shields.io/badge/核心功能-Features-blue?style=for-the-badge" alt="核心功能"></a>
    <a href="#-部署指南"><img src="https://img.shields.io/badge/部署-Deploy-orange?style=for-the-badge" alt="部署"></a>
    <a href="#-使用方法"><img src="https://img.shields.io/badge/使用-Usage-green?style=for-the-badge" alt="使用"></a>
    <a href="#-贡献指南"><img src="https://img.shields.io/badge/贡献-Contribute-brightgreen?style=for-the-badge" alt="贡献"></a>
</p>

<p>
    <strong>Foxel</strong> 是一个基于 <strong>.NET 9</strong> 开发的现代化智能图像检索与管理系统，集成先进的 <strong>AI 视觉模型</strong> 和 <strong>向量嵌入技术</strong>，提供高效的图像搜索与管理功能。
</p>

> 🖥️ **在线演示：**  
> 访问 [https://foxel.cc](https://foxel.cc) 体验 Foxel 部分功能。  
> ⚠️ **注意：演示环境数据可能不定期清理，请勿存放重要信息。**

---

## ✨ 核心功能

| 功能模块      | 主要特性                                |
|:----------|:------------------------------------|
| 🤖 智能图像检索 | - 基于 AI 的图像内容检索与相似度匹配<br>- 快速定位目标图片 |
| 🗂️ 图像管理  | - 支持图片分类、标签管理、批量操作<br>- 多分辨率与格式化处理  |
| 🖼️ 图床功能  | - 图片上传、存储与分享<br>- 支持多种链接格式，访问权限灵活控制 |
| 👥 多用户支持  | - 用户注册、登录、权限与分组管理                   |
| 💬 轻社交功能  | - 点赞、评论、分享                          |
| 🔗 第三方登录  | - 支持 GitHub、LinuxDo 等第三方账号快捷登录      |

---

## 🚀 部署指南

### 📋 前提条件

- 已安装 [Docker](https://www.docker.com/)。

### ⚙️ 一键部署

1. **克隆仓库**
    ```bash
    git clone https://github.com/DrizzleTime/Foxel.git
    cd Foxel
    ```

2. **构建并运行容器**
    ```bash
    docker build -t foxel .
    docker run -d -p 80:80 --name foxel foxel
    ```

3. **访问服务**

   打开浏览器访问您的域名或者IP 即可使用 Foxel。

4. **获取管理员账号信息**

   容器启动后，可通过以下命令查看日志，获取管理员邮箱和初始密码：
   ```bash
   docker logs foxel
   ```

> ⚠️ **注意：**  
> Foxel 依赖 PostgreSQL 数据库，并需要在数据库中启用 [vector 扩展](https://github.com/pgvector/pgvector)。  
> 请确保您的 PostgreSQL 实例已正确安装并启用 `vector` 扩展，否则图像检索功能无法正常使用。  
> 可通过如下命令在数据库中启用扩展：
> ```sql
> CREATE EXTENSION IF NOT EXISTS vector;
> ```

> 如需自定义数据库等配置，可通过修改 `Dockerfile` 或挂载配置文件实现。

---

## 📖 使用方法

### 🔄 匿名上传

1. 访问网站主页。
2. 拖放图片到上传区域或点击选择文件。
3. 上传完成后，系统会生成多种链接格式供分享。

### 👤 用户功能

- **注册/登录**：创建账户或通过第三方登录。
- **图片管理**：查看、编辑、删除和搜索图片。
- **批量操作**：支持批量上传和管理。

---

## 🤝 贡献指南

> ⚠️ 注意：Foxel 目前处于早期实验阶段，数据库结构和各项功能仍在持续迭代中，未来版本可能会有**较大变动**。建议在生产环境使用前充分测试，并关注项目更新动态。

我们欢迎所有对 Foxel 感兴趣的开发者加入贡献，共同改进和提升这个项目。

|      步骤      | 说明                                                                                          |
|:------------:|:--------------------------------------------------------------------------------------------|
| **提交 Issue** | - 发现 Bug 或有建议时，请提交 Issue。<br>- 请详细描述问题及复现步骤，便于快速定位和修复。                                      |
|   **贡献代码**   | - Fork 本项目并创建新分支。<br>- 遵循项目代码规范。                                                            |
|   **功能扩展**   | - 欢迎参与以下重点功能开发：<br>• 更智能的图像检索算法<br>• 增强社交互动<br>• 云存储/网盘集成<br>• 更多智能图像处理方法（如自动标注、风格迁移、图像增强等） |

如有任何疑问或建议，欢迎通过 Issue 与我们联系。感谢您的贡献！

---
[![Star History Chart](https://api.star-history.com/svg?repos=DrizzleTime/Foxel&type=Date)](https://www.star-history.com/#DrizzleTime/Foxel&Date)
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blueviolet?style=for-the-badge" alt="MIT License"></a>
<img src="https://img.shields.io/badge/感谢您的支持-Thanks-yellow?style=for-the-badge" alt="感谢" style="margin-left: 10px;">
