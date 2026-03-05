const axios = require('axios');
const moment = require('moment-timezone');

class FeishuRobot {
    constructor() {
        this.webhookUrl = process.env.FEISHU_WEBHOOK_URL;
        this.timeZone = 'Asia/Shanghai';
    }

    /**
     * 测试连接
     */
    async testConnection() {
        try {
            const response = await this.sendText('系统测试 - 飞书机器人连接正常');
            return response?.code === 0;
        } catch (error) {
            console.error('❌ 飞书机器人连接测试失败:', error.message);
            return false;
        }
    }

    /**
     * 发送文本消息
     */
    async sendText(content) {
        const data = {
            msg_type: 'text',
            content: {
                text: content
            }
        };

        return await this.sendRequest(data);
    }

    /**
     * 发送评价平台数据
     */
    async sendReviewData(data) {
        const sections = [];
        
        // 汇总数据
        const totalReviews = Object.values(data.details).flat().length;
        const avgScore = data.summary.avgScore;

        sections.push({
            tag: 'div',
            text: {
                content: `**📊 评价平台数据更新** - ${moment().format('YYYY年MM月DD日 HH:mm')}`,
                tag: 'lark_md'
            }
        });

        sections.push({
            tag: 'div',
            text: {
                content: `**总店铺数**: ${data.summary.activeStores} 家 | **平均评分**: ${avgScore}分 | **评论总数**: ${data.summary.totalReviews}条`,
                tag: 'lark_md'
            }
        });

        // 大众点评数据
        if (data.details.dianping.length > 0) {
            const dianpingStores = data.details.dianping
                .map(store => `• [${store.storeName}](${store.url}) - ${store.score}分`)
                .join('\n');
            
            sections.push({
                tag: 'div',
                text: {
                    content: `\n**大众点评**:`,
                    tag: 'lark_md'
                }
            });
            
            sections.push({
                tag: 'div',
                text: {
                    content: dianpingStores,
                    tag: 'lark_md'
                }
            });
        }

        // 抖音来客数据
        if (data.details.douyin.length > 0) {
            const douyinStores = data.details.douyin
                .map(store => `• [${store.storeName}](${store.url}) - ${store.score}分`)
                .join('\n');
            
            sections.push({
                tag: 'div',
                text: {
                    content: `\n**抖音来客**:`,
                    tag: 'lark_md'
                }
            });
            
            sections.push({
                tag: 'div',
                text: {
                    content: douyinStores,
                    tag: 'lark_md'
                }
            });
        }

        // 高德地图数据
        if (data.details.amap.length > 0) {
            const amapStores = data.details.amap
                .map(store => `• [${store.storeName}](${store.url}) - ${store.score}分`)
                .join('\n');
            
            sections.push({
                tag: 'div',
                text: {
                    content: `\n**高德地图**:`,
                    tag: 'lark_md'
                }
            });
            
            sections.push({
                tag: 'div',
                text: {
                    content: amapStores,
                    tag: 'lark_md'
                }
            });
        }

        // 发送关键评论分析
        const keyReviews = this.getCriticalReviews(data);
        if (keyReviews.length > 0) {
            sections.push({
                tag: 'div',
                text: {
                    content: `\n**关键评论分析**:`,
                    tag: 'lark_md'
                }
            });
            
            sections.push({
                tag: 'div',
                text: {
                    content: keyReviews.join('\n'),
                    tag: 'lark_md'
                }
            });
        }

        const card = {
            msg_type: 'interactive',
            card: {
                config: {
                    wide_screen_mode: true
                },
                elements: sections,
                header: {
                    title: {
                        content: '📊 评价平台数据',
                        tag: 'plain_text'
                    },
                    template: 'blue'
                }
            }
        };

        return await this.sendRequest(card);
    }

    /**
     * 发送外卖平台数据
     */
    async sendDeliveryData(data) {
        const sections = [];
        
        sections.push({
            tag: 'div',
            text: {
                content: `**🍽️ 外卖平台数据更新** - ${moment().format('YYYY年MM月DD日 HH:mm')}`,
                tag: 'lark_md'
            }
        });

        sections.push({
            tag: 'div',
            text: {
                content: `**总店铺数**: ${data.summary.activeStores} 家 | **总订单数**: ${data.summary.totalOrders}单 | **平均转化率**: ${data.summary.avgConversion}%`,
                tag: 'lark_md'
            }
        });

        // 美团数据
        if (data.details.meituan.length > 0) {
            const meituanStores = data.details.meituan
                .map(store => `• [${store.storeName}](${store.url}) - ${store.orderCount}单`)
                .join('\n');
            
            sections.push({
                tag: 'div',
                text: {
                    content: `\n**美团外卖**:`,
                    tag: 'lark_md'
                }
            });
            
            sections.push({
                tag: 'div',
                text: {
                    content: meituanStores,
                    tag: 'lark_md'
                }
            });
        }

        // 饿了么数据
        if (data.details.eleme.length > 0) {
            const elemeStores = data.details.eleme
                .map(store => `• [${store.storeName}](${store.url}) - ${store.orderCount}单`)
                .join('\n');
            
            sections.push({
                tag: 'div',
                text: {
                    content: `\n**饿了么**:`,
                    tag: 'lark_md'
                }
            });
            
            sections.push({
                tag: 'div',
                text: {
                    content: elemeStores,
                    tag: 'lark_md'
                }
            });
        }

        // 京东外卖数据
        if (data.details.jd.length > 0) {
            const jdStores = data.details.jd
                .map(store => `• [${store.storeName}](${store.url}) - ${store.orderCount}单`)
                .join('\n');
            
            sections.push({
                tag: 'div',
                text: {
                    content: `\n**京东外卖**:`,
                    tag: 'lark_md'
                }
            });
            
            sections.push({
                tag: 'div',
                text: {
                    content: jdStores,
                    tag: 'lark_md'
                }
            });
        }

        // 高峰时段分析
        const peakAnalysis = this.getPeakAnalysis(data);
        if (peakAnalysis) {
            sections.push({
                tag: 'div',
                text: {
                    content: `\n**📈 高峰时段分析**: ${peakAnalysis}`,
                    tag: 'lark_md'
                }
            });
        }

        const card = {
            msg_type: 'interactive',
            card: {
                config: {
                    wide_screen_mode: true
                },
                elements: sections,
                header: {
                    title: {
                        content: '🍽️ 外卖平台数据',
                        tag: 'plain_text'
                    },
                    template: 'orange'
                }
            }
        };

        return await this.sendRequest(card);
    }

    /**
     * 发送错误通知
     */
    async sendErrorNotification(errorInfo) {
        const sections = [];
        
        sections.push({
            tag: 'div',
            text: {
                content: `**❌ 系统错误** - ${moment().format('YYYY年MM月DD日 HH:mm')}`,
                tag: 'lark_md'
            }
        });

        sections.push({
            tag: 'div',
            text: {
                content: `**错误标题**: ${errorInfo.title}`,
                tag: 'lark_md'
            }
        });

        sections.push({
            tag: 'div',
            text: {
                content: `**错误信息**: ${errorInfo.message}`,
                tag: 'lark_md'
            }
        });

        if (errorInfo.stack) {
            sections.push({
                tag: 'div',
                text: {
                    content: `**堆栈信息**: \`\`\`${errorInfo.stack}\`\`\``,
                    tag: 'lark_md'
                }
            });
        }

        const card = {
            msg_type: 'interactive',
            card: {
                config: {
                    wide_screen_mode: true
                },
                elements: sections,
                header: {
                    title: {
                        content: '❌ 系统错误',
                        tag: 'plain_text'
                    },
                    template: 'red'
                }
            }
        };

        return await this.sendRequest(card);
    }

    /**
     * 提取关键评论
     */
    getCriticalReviews(data) {
        const reviews = [];
        
        Object.values(data.details).forEach(category => {
            category.forEach(store => {
                if (store.reviews.length > 0) {
                    const negativeReviews = store.reviews
                        .filter(review => review.score <= 3 && review.content.length > 20)
                        .slice(0, 2);
                    
                    negativeReviews.forEach(review => {
                        reviews.push(`• [${store.storeName}](${store.url}) - [${review.user}]评: ${review.content.slice(0, 50)}...`);
                    });
                }
            });
        });

        return reviews.slice(0, 5);
    }

    /**
     * 高峰时段分析
     */
    getPeakAnalysis(data) {
        const now = new Date();
        const hour = now.getHours();
        
        if ((hour >= 10 && hour <= 12) || (hour >= 17 && hour <= 19)) {
            const meituanOrders = data.details.meituan.reduce((sum, store) => sum + store.orderCount, 0);
            const elemeOrders = data.details.eleme.reduce((sum, store) => sum + store.orderCount, 0);
            const jdOrders = data.details.jd.reduce((sum, store) => sum + store.orderCount, 0);
            
            const totalOrders = meituanOrders + elemeOrders + jdOrders;
            
            return `外卖订单总量: ${totalOrders}单，美团占比: ${Math.round(meituanOrders / totalOrders * 100)}%，饿了么占比: ${Math.round(elemeOrders / totalOrders * 100)}%，京东占比: ${Math.round(jdOrders / totalOrders * 100)}%`;
        }
        
        return null;
    }

    /**
     * 发送请求
     */
    async sendRequest(data) {
        try {
            const response = await axios.post(this.webhookUrl, data, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log('✅ 飞书消息发送成功');
            return response.data;
        } catch (error) {
            console.error('❌ 飞书消息发送失败:', error.message);
            throw error;
        }
    }
}

module.exports = { FeishuRobot };