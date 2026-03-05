const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const moment = require('moment-timezone');
const fs = require('fs-extra');

class DataMonitor {
    constructor() {
        this.baseURLs = {
            dianping: 'https://www.dianping.com',
            douyin: 'https://www.douyin.com',
            amap: 'https://ditu.amap.com',
            meituan: 'https://waimai.meituan.com',
            eleme: 'https://ele.me',
            jd: 'https://waimai.jd.com'
        };
        
        this.storeLocations = {
            dianping: [],
            douyin: [],
            amap: [],
            meituan: [],
            eleme: [],
            jd: []
        };

        this.scanIntervals = {
            reviews: '*/2 * 10-20 * * *',  // 评价平台：10:00-20:00，每2小时
            delivery: '*/30 * 10-12,17-19 * * *'  // 外卖平台：午餐10:30-12:30/晚餐17:00-19:00，每30分钟
        };
    }

    /**
     * 初始化商店位置配置
     */
    async initStoreLocations() {
        try {
            const config = await fs.readJson('./config/stores.json');
            this.storeLocations = config;
            console.log('✅ 商店位置配置加载成功');
            return true;
        } catch (error) {
            console.error('❌ 商店位置配置加载失败:', error);
            return false;
        }
    }

    /**
     * 通用页面抓取函数
     */
    async fetchPage(url, options = {}) {
        const defaultOptions = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'no-cache'
            },
            timeout: 30000,
            proxy: null
        };

        const requestOptions = { ...defaultOptions, ...options };

        try {
            const response = await axios.get(url, requestOptions);
            return response.data;
        } catch (error) {
            console.error('❌ 页面请求失败:', url, error.message);
            return null;
        }
    }

    /**
     * 使用 Puppeteer 抓取动态页面
     */
    async fetchDynamicPage(url, selector = 'body') {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });

            const page = await browser.newPage();
            
            // 配置浏览器信息
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // 等待指定选择器出现
            await page.waitForSelector(selector, { timeout: 30000 });
            
            // 截图用于调试
            const timestamp = moment().format('YYYYMMDDHHmmss');
            await page.screenshot({ path: `./temp/${timestamp}-${Math.random().toString(36).substr(2, 9)}.png` });
            
            const content = await page.content();
            return content;
        } catch (error) {
            console.error('❌ 动态页面抓取失败:', url, error.message);
            return null;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * 获取评价平台数据
     */
    async fetchReviewData() {
        console.log('📊 开始获取评价平台数据...');
        
        const reviewData = {
            timestamp: new Date().toISOString(),
            dianping: [],
            douyin: [],
            amap: []
        };

        // 大众点评数据抓取
        for (const store of this.storeLocations.dianping) {
            const dianpingData = await this.fetchDianpingData(store);
            if (dianpingData) {
                reviewData.dianping.push(dianpingData);
            }
        }

        // 抖音来客数据抓取
        for (const store of this.storeLocations.douyin) {
            const douyinData = await this.fetchDouyinData(store);
            if (douyinData) {
                reviewData.douyin.push(douyinData);
            }
        }

        // 高德地图数据抓取
        for (const store of this.storeLocations.amap) {
            const amapData = await this.fetchAmapData(store);
            if (amapData) {
                reviewData.amap.push(amapData);
            }
        }

        // 保存原始数据
        await this.saveRawData('reviews', reviewData);

        return this.processReviewData(reviewData);
    }

    /**
     * 获取外卖平台数据
     */
    async fetchDeliveryData() {
        console.log('🍽️ 开始获取外卖平台数据...');
        
        const deliveryData = {
            timestamp: new Date().toISOString(),
            meituan: [],
            eleme: [],
            jd: []
        };

        // 美团数据抓取
        for (const store of this.storeLocations.meituan) {
            const meituanData = await this.fetchMeituanData(store);
            if (meituanData) {
                deliveryData.meituan.push(meituanData);
            }
        }

        // 饿了么数据抓取
        for (const store of this.storeLocations.eleme) {
            const elemeData = await this.fetchElemeData(store);
            if (elemeData) {
                deliveryData.eleme.push(elemeData);
            }
        }

        // 京东外卖数据抓取
        for (const store of this.storeLocations.jd) {
            const jdData = await this.fetchJDData(store);
            if (jdData) {
                deliveryData.jd.push(jdData);
            }
        }

        // 保存原始数据
        await this.saveRawData('delivery', deliveryData);

        return this.processDeliveryData(deliveryData);
    }

    /**
     * 大众点评数据抓取
     */
    async fetchDianpingData(store) {
        const url = `${this.baseURLs.dianping}/shop/${store.id}`;
        
        try {
            const content = await this.fetchDynamicPage(url, '.basic-info');
            if (!content) return null;

            const $ = cheerio.load(content);

            const data = {
                storeName: store.name,
                storeId: store.id,
                url,
                score: parseFloat($('.score-info .score').text().trim()) || 0,
                reviewCount: parseInt($('.review-list-wrap .item').length) || 0,
                reviews: [],
                rank: $('.rank-info .rank-num').text().trim() || '未排名',
                timestamp: new Date().toISOString()
            };

            // 解析评论
            $('.review-list-wrap .review-item').each((index, element) => {
                const review = {
                    user: $(element).find('.reviewer-info .name').text().trim(),
                    level: $(element).find('.reviewer-info .level').text().trim(),
                    score: parseFloat($(element).find('.score-star .star').attr('style').replace('width:', '').replace('%', '')) / 20,
                    content: $(element).find('.review-content').text().trim(),
                    date: $(element).find('.time').text().trim(),
                    hasImage: $(element).find('.review-images').length > 0
                };

                data.reviews.push(review);

                if (index >= 10) return false; // 只取前10条评论
            });

            return data;
        } catch (error) {
            console.error(`❌ 大众点评数据抓取失败 (${store.name}):`, error.message);
            return null;
        }
    }

    /**
     * 抖音来客数据抓取
     */
    async fetchDouyinData(store) {
        const url = `${this.baseURLs.douyin}/shop/${store.id}`;
        
        try {
            const content = await this.fetchDynamicPage(url, '.shop-info');
            if (!content) return null;

            const $ = cheerio.load(content);

            const data = {
                storeName: store.name,
                storeId: store.id,
                url,
                score: parseFloat($('.shop-score .value').text().trim()) || 0,
                reviewCount: parseInt($('.review-count').text().replace(/[^0-9]/g, '')) || 0,
                userCount: parseInt($('.user-count').text().replace(/[^0-9]/g, '')) || 0,
                reviews: [],
                timestamp: new Date().toISOString()
            };

            // 解析评论
            $('.review-item').each((index, element) => {
                const review = {
                    user: $(element).find('.user-name').text().trim(),
                    level: $(element).find('.user-level').text().trim(),
                    score: parseFloat($(element).find('.review-score').text().trim()) || 0,
                    content: $(element).find('.review-content').text().trim(),
                    date: $(element).find('.review-time').text().trim(),
                    hasImage: $(element).find('.review-images').length > 0
                };

                data.reviews.push(review);

                if (index >= 10) return false;
            });

            return data;
        } catch (error) {
            console.error(`❌ 抖音来客数据抓取失败 (${store.name}):`, error.message);
            return null;
        }
    }

    /**
     * 高德地图数据抓取
     */
    async fetchAmapData(store) {
        const url = `${this.baseURLs.amap}/poi/${store.id}`;
        
        try {
            const content = await this.fetchPage(url);
            if (!content) return null;

            const $ = cheerio.load(content);

            const data = {
                storeName: store.name,
                storeId: store.id,
                url,
                score: parseFloat($('.score').text().trim()) || 0,
                reviewCount: parseInt($('.review-count').text().replace(/[^0-9]/g, '')) || 0,
                returnRate: parseFloat($('.return-rate').text().trim()) || 0,
                rank: $('.rank-info .rank').text().trim() || '未排名',
                reviews: [],
                timestamp: new Date().toISOString()
            };

            // 解析评论
            $('.review-item').each((index, element) => {
                const review = {
                    user: $(element).find('.user-name').text().trim(),
                    level: $(element).find('.user-level').text().trim(),
                    score: parseFloat($(element).find('.review-score').text().trim()) || 0,
                    content: $(element).find('.review-content').text().trim(),
                    date: $(element).find('.review-time').text().trim(),
                    hasImage: $(element).find('.review-images').length > 0
                };

                data.reviews.push(review);

                if (index >= 10) return false;
            });

            return data;
        } catch (error) {
            console.error(`❌ 高德地图数据抓取失败 (${store.name}):`, error.message);
            return null;
        }
    }

    /**
     * 美团外卖数据抓取
     */
    async fetchMeituanData(store) {
        const url = `${this.baseURLs.meituan}/shop/${store.id}`;
        
        try {
            const content = await this.fetchDynamicPage(url, '.shop-info');
            if (!content) return null;

            const $ = cheerio.load(content);

            const data = {
                storeName: store.name,
                storeId: store.id,
                url,
                orderCount: parseInt($('.order-count').text().replace(/[^0-9]/g, '')) || 0,
                conversionRate: parseFloat($('.conversion-rate').text().replace('%', '').trim()) || 0,
                rank: $('.rank-info .rank').text().trim() || '未排名',
                score: parseFloat($('.shop-score').text().trim()) || 0,
                timestamp: new Date().toISOString()
            };

            return data;
        } catch (error) {
            console.error(`❌ 美团外卖数据抓取失败 (${store.name}):`, error.message);
            return null;
        }
    }

    /**
     * 饿了么数据抓取
     */
    async fetchElemeData(store) {
        const url = `${this.baseURLs.eleme}/shop/${store.id}`;
        
        try {
            const content = await this.fetchDynamicPage(url, '.shop-info');
            if (!content) return null;

            const $ = cheerio.load(content);

            const data = {
                storeName: store.name,
                storeId: store.id,
                url,
                orderCount: parseInt($('.order-count').text().replace(/[^0-9]/g, '')) || 0,
                conversionRate: parseFloat($('.conversion-rate').text().replace('%', '').trim()) || 0,
                rank: $('.rank-info .rank').text().trim() || '未排名',
                score: parseFloat($('.shop-score').text().trim()) || 0,
                timestamp: new Date().toISOString()
            };

            return data;
        } catch (error) {
            console.error(`❌ 饿了么数据抓取失败 (${store.name}):`, error.message);
            return null;
        }
    }

    /**
     * 京东外卖数据抓取
     */
    async fetchJDData(store) {
        const url = `${this.baseURLs.jd}/shop/${store.id}`;
        
        try {
            const content = await this.fetchDynamicPage(url, '.shop-info');
            if (!content) return null;

            const $ = cheerio.load(content);

            const data = {
                storeName: store.name,
                storeId: store.id,
                url,
                orderCount: parseInt($('.order-count').text().replace(/[^0-9]/g, '')) || 0,
                conversionRate: parseFloat($('.conversion-rate').text().replace('%', '').trim()) || 0,
                rank: $('.rank-info .rank').text().trim() || '未排名',
                score: parseFloat($('.shop-score').text().trim()) || 0,
                timestamp: new Date().toISOString()
            };

            return data;
        } catch (error) {
            console.error(`❌ 京东外卖数据抓取失败 (${store.name}):`, error.message);
            return null;
        }
    }

    /**
     * 处理评价数据
     */
    processReviewData(data) {
        const processed = {
            summary: {
                totalReviews: 0,
                avgScore: 0,
                activeStores: 0
            },
            details: data
        };

        let totalScore = 0;
        let totalReviews = 0;
        let activeStores = 0;

        Object.values(data).forEach(category => {
            if (Array.isArray(category)) {
                category.forEach(store => {
                    activeStores++;
                    totalReviews += store.reviewCount;
                    totalScore += store.score;
                });
            }
        });

        processed.summary = {
            totalReviews,
            avgScore: activeStores > 0 ? parseFloat((totalScore / activeStores).toFixed(1)) : 0,
            activeStores
        };

        return processed;
    }

    /**
     * 处理外卖数据
     */
    processDeliveryData(data) {
        const processed = {
            summary: {
                totalOrders: 0,
                avgConversion: 0,
                activeStores: 0
            },
            details: data
        };

        let totalOrders = 0;
        let totalConversion = 0;
        let activeStores = 0;

        Object.values(data).forEach(category => {
            if (Array.isArray(category)) {
                category.forEach(store => {
                    activeStores++;
                    totalOrders += store.orderCount;
                    totalConversion += store.conversionRate;
                });
            }
        });

        processed.summary = {
            totalOrders,
            avgConversion: activeStores > 0 ? parseFloat((totalConversion / activeStores).toFixed(1)) : 0,
            activeStores
        };

        return processed;
    }

    /**
     * 保存原始数据
     */
    async saveRawData(type, data) {
        const dir = `./data/raw/${type}`;
        await fs.ensureDir(dir);
        
        const filename = `${dir}/${moment().format('YYYYMMDDHHmmss')}.json`;
        await fs.writeJson(filename, data, { spaces: 2 });
        
        console.log(`📥 原始数据已保存: ${filename}`);
    }

    /**
     * 验证数据准确性
     */
    validateData(data) {
        const validation = {
            valid: true,
            errors: [],
            accuracy: 0
        };

        let validFields = 0;
        let totalFields = 0;

        Object.values(data.details).forEach(category => {
            if (Array.isArray(category)) {
                category.forEach(store => {
                    Object.keys(store).forEach(field => {
                        totalFields++;
                        
                        if (field === 'score' && (store[field] < 0 || store[field] > 5)) {
                            validation.errors.push(`无效评分: ${store.storeName} - ${store[field]}`);
                        } else if (field === 'reviewCount' && store[field] < 0) {
                            validation.errors.push(`无效评论数: ${store.storeName} - ${store[field]}`);
                        } else if (field === 'orderCount' && store[field] < 0) {
                            validation.errors.push(`无效订单数: ${store.storeName} - ${store[field]}`);
                        } else if (field === 'conversionRate' && (store[field] < 0 || store[field] > 100)) {
                            validation.errors.push(`无效转化率: ${store.storeName} - ${store[field]}%`);
                        } else {
                            validFields++;
                        }
                    });
                });
            }
        });

        validation.accuracy = totalFields > 0 ? parseFloat((validFields / totalFields * 100).toFixed(1)) : 0;
        
        if (validation.accuracy < 98) {
            validation.valid = false;
            validation.errors.push(`数据准确率低于98%: ${validation.accuracy}%`);
        }

        if (validation.errors.length > 0) {
            validation.valid = false;
        }

        return validation;
    }
}

module.exports = { DataMonitor };