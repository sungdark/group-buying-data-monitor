#!/usr/bin/env node

/**
 * Group Buying & Food Delivery Data Monitor - OpenClaw Skill
 *
 * 自动化数据监测系统，支持大众点评、抖音来客、高德地图等评价平台，
 * 以及美团、饿了么、京东外卖等外卖平台的数据抓取与分析。
 *
 * @author OpenClaw
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { DataMonitor } = require('./services/DataMonitor');
const { FeishuRobot } = require('./services/FeishuRobot');
const { Scheduler } = require('./services/Scheduler');

class GroupBuyingDataMonitor {
    constructor() {
        this.monitor = new DataMonitor();
        this.feishuRobot = new FeishuRobot();
        this.scheduler = new Scheduler();
        this.isRunning = false;
    }

    /**
     * 初始化监控系统
     */
    async initialize() {
        console.log('🚀 初始化数据监测系统...');
        
        try {
            // 检查配置文件
            this.checkConfig();
            
            // 初始化数据目录
            this.createDataDirectory();
            
            // 测试连接
            await this.testConnections();
            
            console.log('✅ 系统初始化成功');
            return true;
        } catch (error) {
            console.error('❌ 系统初始化失败:', error.message);
            this.reportError('系统初始化失败', error);
            return false;
        }
    }

    /**
     * 检查配置文件
     */
    checkConfig() {
        const requiredEnv = [
            'FEISHU_WEBHOOK_URL',
            'DATA_DIR',
            'LOG_DIR'
        ];

        requiredEnv.forEach(env => {
            if (!process.env[env]) {
                throw new Error(`环境变量 ${env} 未配置`);
            }
        });
    }

    /**
     * 创建数据目录
     */
    createDataDirectory() {
        const dataDir = process.env.DATA_DIR;
        const logDir = process.env.LOG_DIR;

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log(`📂 数据目录创建成功: ${dataDir}`);
        }

        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
            console.log(`📂 日志目录创建成功: ${logDir}`);
        }
    }

    /**
     * 测试连接
     */
    async testConnections() {
        console.log('🔍 测试外部服务连接...');

        // 测试飞书机器人
        const feishuTest = await this.feishuRobot.testConnection();
        if (!feishuTest) {
            throw new Error('飞书机器人连接测试失败');
        }

        console.log('✅ 所有外部服务连接正常');
    }

    /**
     * 启动监控系统
     */
    async start() {
        if (this.isRunning) {
            console.log('⚠️  系统已在运行中');
            return;
        }

        this.isRunning = true;
        console.log('🎯 启动数据监测系统...');

        try {
            // 初始化调度器
            this.scheduler.setupSchedules();

            // 启动定时任务
            this.scheduler.start();

            console.log('✅ 数据监测系统启动成功');
            return true;
        } catch (error) {
            console.error('❌ 系统启动失败:', error.message);
            this.reportError('系统启动失败', error);
            this.isRunning = false;
            return false;
        }
    }

    /**
     * 停止监控系统
     */
    async stop() {
        if (!this.isRunning) {
            console.log('⚠️  系统已停止');
            return;
        }

        console.log('🛑 正在停止数据监测系统...');
        this.scheduler.stop();
        this.isRunning = false;
        console.log('✅ 系统已停止');
    }

    /**
     * 立即执行一次完整数据抓取
     */
    async runOnce() {
        console.log('⚡ 立即执行一次完整数据抓取...');
        
        try {
            // 评价平台数据抓取（10:00-20:00，每2小时）
            const reviewData = await this.monitor.fetchReviewData();
            await this.feishuRobot.sendReviewData(reviewData);

            // 外卖平台数据抓取（根据时间判断）
            const now = new Date();
            const hour = now.getHours();
            
            if ((hour >= 10 && hour <= 12) || (hour >= 17 && hour <= 19)) {
                const deliveryData = await this.monitor.fetchDeliveryData();
                await this.feishuRobot.sendDeliveryData(deliveryData);
            }

            console.log('✅ 数据抓取完成');
            return true;
        } catch (error) {
            console.error('❌ 数据抓取失败:', error.message);
            this.reportError('数据抓取失败', error);
            return false;
        }
    }

    /**
     * 报告错误
     */
    async reportError(title, error) {
        const errorInfo = {
            title,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };

        console.error('❌ 系统错误:', errorInfo);

        // 发送错误通知到飞书
        try {
            await this.feishuRobot.sendErrorNotification(errorInfo);
        } catch (notifyError) {
            console.error('❌ 错误通知发送失败:', notifyError);
        }
    }
}

// 导出为 OpenClaw Skill
module.exports = {
    GroupBuyingDataMonitor,
    version: '1.0.0',
    description: 'Real-time group buying and food delivery data monitoring system',
    categories: ['data-monitoring', 'group-buying', 'food-delivery'],
    dependencies: ['axios', 'cheerio', 'puppeteer', 'node-cron', 'dotenv'],
    author: 'OpenClaw',
    license: 'MIT'
};

// 主程序入口
if (require.main === module) {
    const monitor = new GroupBuyingDataMonitor();
    
    // 处理命令行参数
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'init':
            monitor.initialize();
            break;
        case 'start':
            monitor.initialize().then(() => monitor.start());
            break;
        case 'stop':
            monitor.stop();
            break;
        case 'run':
            monitor.initialize().then(() => monitor.runOnce());
            break;
        case 'status':
            console.log(`System Status: ${monitor.isRunning ? 'Running' : 'Stopped'}`);
            break;
        default:
            console.log(`
Group Buying & Food Delivery Data Monitor - OpenClaw Skill
Version: 1.0.0

Usage:
  node src/index.js [command]

Commands:
  init    - Initialize and test the system
  start   - Start the monitoring system
  stop    - Stop the monitoring system
  run     - Run a single data fetch cycle
  status  - Check system status

Example:
  node src/index.js start
            `);
    }
}