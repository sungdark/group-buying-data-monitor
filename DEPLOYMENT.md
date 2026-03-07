# 团购+外卖实时自动数据监测系统 - 部署文档

## 📋 系统要求

### 硬件要求
- CPU：2核以上
- 内存：4GB以上
- 磁盘：20GB以上可用空间
- 网络：稳定的互联网连接，建议使用固定IP或代理池

### 软件要求
- Node.js 18+
- Chrome/Chromium 浏览器（Puppeteer依赖）
- Git

## 🚀 快速部署

### 1. 克隆仓库
```bash
git clone https://github.com/sungdark/group-buying-data-monitor.git
cd group-buying-data-monitor
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下参数：
```env
# 飞书机器人配置（必填）
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/你的飞书机器人webhook地址

# 数据存储配置（可选，默认即可）
DATA_DIR=./data/
LOG_DIR=./logs/

# 抓取配置（可选，根据需要调整）
MAX_RETRY_COUNT=3
REQUEST_TIMEOUT=30000
RATE_LIMIT_DELAY=2000

# 评价平台配置（可选）
DIANPING_CITY=上海
DOUYIN_CITY=上海
AMAP_CITY=上海

# 外卖平台配置（可选）
MEITUAN_AREA=浦东新区
ELEME_AREA=浦东新区
JD_AREA=浦东新区

# 代理配置（可选，建议配置代理池避免IP封禁）
HTTP_PROXY=http://你的代理地址:端口
HTTPS_PROXY=http://你的代理地址:端口

# 日志级别（可选）
LOG_LEVEL=info
```

### 4. 配置门店信息
编辑 `config/stores.json` 文件，添加需要监控的门店信息：
```json
{
  "dianping": [
    {
      "id": "大众点评门店ID",
      "name": "门店名称",
      "url": "门店详情页URL"
    }
  ],
  "douyin": [
    {
      "id": "抖音来客门店ID",
      "name": "门店名称",
      "url": "门店详情页URL"
    }
  ],
  "amap": [
    {
      "id": "高德地图POI ID",
      "name": "门店名称",
      "url": "门店详情页URL"
    }
  ],
  "meituan": [
    {
      "id": "美团外卖门店ID",
      "name": "门店名称",
      "url": "门店详情页URL"
    }
  ],
  "eleme": [
    {
      "id": "饿了么门店ID",
      "name": "门店名称",
      "url": "门店详情页URL"
    }
  ],
  "jd": [
    {
      "id": "京东外卖门店ID",
      "name": "门店名称",
      "url": "门店详情页URL"
    }
  ]
}
```

### 5. 初始化系统
```bash
node src/index.js init
```

初始化成功会显示：
```
🚀 初始化数据监测系统...
📂 数据目录创建成功: ./data/
📂 日志目录创建成功: ./logs/
🔍 测试外部服务连接...
✅ 所有外部服务连接正常
✅ 系统初始化成功
```

### 6. 启动系统
```bash
# 前台启动（用于测试）
node src/index.js start

# 后台启动（生产环境）
nohup node src/index.js start > /dev/null 2>&1 &
```

### 7. 验证部署
```bash
# 查看系统状态
node src/index.js status

# 手动执行一次数据抓取（验证功能）
node src/index.js run
```

## ⚙️ 调度配置

### 默认调度规则
| 任务类型 | 执行时间 | 频率 |
|---------|---------|------|
| 评价平台数据抓取 | 10:00 - 20:00 | 每2小时一次 |
| 外卖平台数据抓取 | 10:30 - 12:30（午餐）<br>17:00 - 19:00（晚餐） | 每30分钟一次 |
| 系统健康检查 | 每天 12:00 | 每天一次 |

### 自定义调度
如果需要调整调度时间，编辑 `src/services/Scheduler.js` 中的 `scanIntervals` 配置：
```javascript
this.scanIntervals = {
    reviews: '*/2 * 10-20 * * *',  // 评价平台：10:00-20:00，每2小时
    delivery: '*/30 * 10-12,17-19 * * *'  // 外卖平台：午餐10:30-12:30/晚餐17:00-19:00，每30分钟
};
```

Cron 表达式格式：`秒 分 时 日 月 周`

## 📊 数据结构

### 数据存储路径
- 原始数据：`./data/raw/[type]/[timestamp].json`
- 日志文件：`./logs/[date].log`
- 临时截图：`./temp/[timestamp].png`（调试用）

### 数据字段说明

#### 评价平台数据
| 字段 | 类型 | 说明 |
|------|------|------|
| storeName | string | 门店名称 |
| storeId | string | 门店ID |
| url | string | 门店详情页URL |
| score | float | 门店评分（0-5分） |
| reviewCount | int | 累计评论数 |
| rank | string | 区域排名 |
| reviews | array | 最新评论列表 |
| timestamp | string | 抓取时间 |

#### 外卖平台数据
| 字段 | 类型 | 说明 |
|------|------|------|
| storeName | string | 门店名称 |
| storeId | string | 门店ID |
| url | string | 门店详情页URL |
| orderCount | int | 有效订单量 |
| conversionRate | float | 下单转化率（%） |
| rank | string | 商圈排名 |
| score | float | 门店评分（0-5分） |
| timestamp | string | 抓取时间 |

## 🔧 常见问题

### 1. 反爬与封禁问题
**问题**：大众点评/抖音等平台返回403错误或验证码
**解决方案**：
- 配置代理池，使用动态IP
- 调整 `RATE_LIMIT_DELAY` 增加请求间隔
- 使用浏览器指纹轮换技术
- 避免在短时间内高频请求同一域名

### 2. Puppeteer 启动失败
**问题**：Chrome 浏览器启动报错
**解决方案**：
```bash
# Ubuntu/Debian 系统安装依赖
sudo apt install -y chromium-browser libxss1 libasound2 libatk-bridge2.0-0 libgtk-3-0 libgbm-dev

# CentOS/RHEL 系统安装依赖
sudo yum install -y chromium libXScrnSaver alsa-lib at-spi2-atk gtk3 libgbm

# 配置 Puppeteer 使用系统 Chrome
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### 3. 飞书消息发送失败
**问题**：飞书机器人消息推送失败
**解决方案**：
- 检查 `FEISHU_WEBHOOK_URL` 是否正确
- 确认飞书机器人的IP白名单配置
- 检查网络是否可以访问飞书开放平台

### 4. 数据准确率不足98%
**问题**：数据验证时准确率低于要求
**解决方案**：
- 检查页面选择器是否匹配最新的页面结构
- 增加重试次数 `MAX_RETRY_COUNT`
- 调整超时时间 `REQUEST_TIMEOUT`
- 启用日志调试，分析抓取失败原因

## 🛡️ 安全建议

1. **代理使用**：建议使用高匿代理池，避免真实IP被封禁
2. **数据加密**：敏感数据（如代理密码、API密钥）建议使用环境变量存储
3. **访问控制**：服务器端口仅开放必要端口，配置防火墙规则
4. **定期备份**：重要数据定期备份到外部存储
5. **日志监控**：配置日志告警，及时发现异常情况

## 📈 性能优化

1. **并发控制**：调整并发请求数，避免对目标平台造成过大压力
2. **缓存机制**：对静态页面内容进行缓存，减少重复请求
3. **增量抓取**：仅抓取新增评论和更新数据，降低带宽消耗
4. **资源释放**：及时关闭浏览器实例和网络连接，避免内存泄漏

## 📞 技术支持

如果部署过程中遇到问题，请提交 Issue 到 GitHub 仓库：
https://github.com/fengking-li/group-buying-data-monitor/issues

## 📄 许可证

MIT License
