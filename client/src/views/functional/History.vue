<template>
  <div class="history">
    <el-card class="main-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>生成记录</span>
          <el-icon><Clock /></el-icon>
        </div>
      </template>

      <div class="history-content">
        <el-empty v-if="historyList.length === 0" description="暂无生成记录" />
        
        <div v-else class="history-list">
          <el-card 
            v-for="(item, index) in historyList" 
            :key="index" 
            class="history-item" 
            shadow="hover"
          >
            <div class="history-item-content">
              <div class="history-info">
                <h3 class="history-title">{{ item.title }}</h3>
                <p class="history-time">{{ formatTime(item.createTime) }}</p>
                <p class="history-desc">{{ item.description }}</p>
              </div>
              <div class="history-actions">
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="downloadFile(item.downloadUrl)"
                >
                  <el-icon><Download /></el-icon>
                  下载XMind
                </el-button>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { Clock, Download } from '@element-plus/icons-vue'
import axios from 'axios'

export default {
  name: 'History',
  components: {
    Clock,
    Download
  },
  data() {
    return {
      historyList: [],
      loading: false
    }
  },
  mounted() {
    this.loadHistory()
  },
  methods: {
    async loadHistory() {
      this.loading = true
      try {
        const response = await axios.get('/api/history')
        this.historyList = response.data.data || []
        
        // 如果历史记录为空，显示提示信息
        if (this.historyList.length === 0) {
          console.log('暂无历史记录')
        }
      } catch (error) {
        console.error('加载历史记录失败:', error)
        // 设置为空数组，显示空状态
        this.historyList = []
        
        // 根据错误类型显示不同的提示
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
          this.$message.warning('无法连接到服务器，请检查后端服务是否启动')
        } else if (error.response && error.response.status === 404) {
          this.$message.warning('API接口不存在')
        } else {
          this.$message.error('加载历史记录失败，请稍后重试')
        }
      } finally {
        this.loading = false
      }
    },
    
    formatTime(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },
    
    downloadFile(downloadUrl) {
      if (downloadUrl) {
        window.open(downloadUrl, '_blank')
      } else {
        this.$message.error('下载链接不存在')
      }
    }
  }
}
</script>

<style scoped>
.history {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.main-card {
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.history-content {
  min-height: 400px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-item {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.history-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.history-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
}

.history-info {
  flex: 1;
}

.history-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.history-time {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #909399;
}

.history-desc {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  max-width: 600px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-actions {
  margin-left: 20px;
}

.el-button {
  border-radius: 6px;
}
</style>
