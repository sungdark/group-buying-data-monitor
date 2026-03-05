const cron = require('node-cron');
const moment = require('moment-timezone');

class Scheduler {
    constructor() {
        this.jobs = [];
        this.scanIntervals = {
            reviews: '*/2 * 10-20 * * *',  // 评价平台：10:00-20:00，每2小时
            delivery: '*/30 * 10-12,17-19 * * *'  // 外卖平台：午餐10:30-12:30/晚餐17:00-19:00，每30分钟
        };
    }

    /**
     * 设置定时任务
     */
    setupSchedules() {
        console.log('⏰ 设置定时任务...');

        // 评价平台数据抓取任务
        const reviewJob = cron.schedule(this.scanIntervals.reviews, async () => {
            try {
                console.log('📊 开始评价平台数据抓取任务...');
                const monitor = require('./DataMonitor');
                const dataMonitor = new monitor.DataMonitor();
                const data = await dataMonitor.fetchReviewData();
                
                const feishuRobot = require('./FeishuRobot');
                const robot = new feishuRobot.FeishuRobot();
                await robot.sendReviewData(data);
                
                console.log('✅ 评价平台数据抓取任务完成');
            } catch (error) {
                console.error('❌ 评价平台数据抓取任务失败:', error.message);
                const feishuRobot = require('./FeishuRobot');
                const robot = new feishuRobot.FeishuRobot();
                await robot.sendErrorNotification({
                    title: '评价平台数据抓取失败',
                    message: error.message,
                    stack: error.stack
                });
            }
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });

        this.jobs.push(reviewJob);

        // 外卖平台数据抓取任务
        const deliveryJob = cron.schedule(this.scanIntervals.delivery, async () => {
            try {
                console.log('🍽️ 开始外卖平台数据抓取任务...');
                const monitor = require('./DataMonitor');
                const dataMonitor = new monitor.DataMonitor();
                const data = await dataMonitor.fetchDeliveryData();
                
                const feishuRobot = require('./FeishuRobot');
                const robot = new feishuRobot.FeishuRobot();
                await robot.sendDeliveryData(data);
                
                console.log('✅ 外卖平台数据抓取任务完成');
            } catch (error) {
                console.error('❌ 外卖平台数据抓取任务失败:', error.message);
                const feishuRobot = require('./FeishuRobot');
                const robot = new feishuRobot.FeishuRobot();
                await robot.sendErrorNotification({
                    title: '外卖平台数据抓取失败',
                    message: error.message,
                    stack: error.stack
                });
            }
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });

        this.jobs.push(deliveryJob);

        // 系统健康检查任务
        const healthJob = cron.schedule('0 12 * * *', async () => {
            try {
                console.log('🏥 开始系统健康检查任务...');
                const feishuRobot = require('./FeishuRobot');
                const robot = new feishuRobot.FeishuRobot();
                await robot.testConnection();
                
                console.log('✅ 系统健康检查任务完成');
            } catch (error) {
                console.error('❌ 系统健康检查任务失败:', error.message);
                const feishuRobot = require('./FeishuRobot');
                const robot = new feishuRobot.FeishuRobot();
                await robot.sendErrorNotification({
                    title: '系统健康检查失败',
                    message: error.message,
                    stack: error.stack
                });
            }
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        });

        this.jobs.push(healthJob);
    }

    /**
     * 启动所有定时任务
     */
    start() {
        console.log('🚀 启动定时任务...');
        this.jobs.forEach(job => job.start());
        console.log(`✅ ${this.jobs.length}个定时任务已启动`);
    }

    /**
     * 停止所有定时任务
     */
    stop() {
        console.log('🛑 停止定时任务...');
        this.jobs.forEach(job => job.stop());
        console.log(`✅ ${this.jobs.length}个定时任务已停止`);
    }

    /**
     * 获取任务状态
     */
    getJobStatus() {
        return this.jobs.map((job, index) => ({
            index: index + 1,
            running: job.running,
            nextExecution: job.nextScheduled
        }));
    }

    /**
     * 获取下次执行时间
     */
    getNextExecution() {
        const now = moment();
        const nextReviewExecution = this.getNextRunDate(this.scanIntervals.reviews);
        const nextDeliveryExecution = this.getNextRunDate(this.scanIntervals.delivery);

        return {
            reviews: nextReviewExecution ? moment(nextReviewExecution).format('YYYY-MM-DD HH:mm') : null,
            delivery: nextDeliveryExecution ? moment(nextDeliveryExecution).format('YYYY-MM-DD HH:mm') : null
        };
    }

    /**
     * 获取任务调度信息
     */
    getScheduleInfo() {
        return {
            reviews: {
                interval: '10:00-20:00，每2小时',
                cron: this.scanIntervals.reviews,
                description: '评价平台数据抓取'
            },
            delivery: {
                interval: '10:30-12:30，17:00-19:00，每30分钟',
                cron: this.scanIntervals.delivery,
                description: '外卖平台数据抓取'
            },
            health: {
                interval: '每天12:00',
                cron: '0 12 * * *',
                description: '系统健康检查'
            }
        };
    }

    /**
     * 计算下次执行时间
     */
    getNextRunDate(cronExpression) {
        try {
            const job = cron.schedule(cronExpression, () => {}, {
                scheduled: false,
                timezone: 'Asia/Shanghai'
            });
            
            const nextDate = job.nextScheduled;
            job.destroy();
            return nextDate;
        } catch (error) {
            console.error('❌ 计算下次执行时间失败:', error.message);
            return null;
        }
    }

    /**
     * 检查任务是否在运行
     */
    isJobRunning(jobIndex) {
        if (jobIndex >= 0 && jobIndex < this.jobs.length) {
            return this.jobs[jobIndex].running;
        }
        return false;
    }

    /**
     * 立即执行任务
     */
    async runJobImmediately(jobType) {
        if (jobType === 'reviews') {
            console.log('⚡ 立即执行评价平台数据抓取...');
            const monitor = require('./DataMonitor');
            const dataMonitor = new monitor.DataMonitor();
            const data = await dataMonitor.fetchReviewData();
            
            const feishuRobot = require('./FeishuRobot');
            const robot = new feishuRobot.FeishuRobot();
            await robot.sendReviewData(data);
            
            console.log('✅ 评价平台数据抓取完成');
        } else if (jobType === 'delivery') {
            console.log('⚡ 立即执行外卖平台数据抓取...');
            const monitor = require('./DataMonitor');
            const dataMonitor = new monitor.DataMonitor();
            const data = await dataMonitor.fetchDeliveryData();
            
            const feishuRobot = require('./FeishuRobot');
            const robot = new feishuRobot.FeishuRobot();
            await robot.sendDeliveryData(data);
            
            console.log('✅ 外卖平台数据抓取完成');
        }
    }

    /**
     * 重启动任务
     */
    restartJob(jobType) {
        const jobIndex = jobType === 'reviews' ? 0 : jobType === 'delivery' ? 1 : 2;
        
        if (jobIndex >= 0 && jobIndex < this.jobs.length) {
            const job = this.jobs[jobIndex];
            job.stop();
            job.start();
            console.log(`✅ 任务${jobType}已重启`);
            return true;
        }
        
        console.error(`❌ 任务${jobType}不存在`);
        return false;
    }
}

module.exports = { Scheduler };