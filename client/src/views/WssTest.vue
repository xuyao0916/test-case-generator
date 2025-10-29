<template>
  <div class="wss-test-container">
    <el-card class="header-card">
      <template #header>
        <div class="card-header">
          <span>WSS接口测试</span>
          <el-button 
            type="primary" 
            :loading="batchTesting" 
            @click="testAllInterfaces"
            :disabled="wssConfigs.length === 0"
          >
            {{ batchTesting ? '测试中...' : '测试所有接口' }}
          </el-button>
        </div>
      </template>
      
      <div class="batch-status" v-if="batchTesting || batchTestResults.length > 0">
        <el-progress 
          v-if="batchTesting"
          :percentage="batchProgress" 
          :format="formatProgress"
        />
        <div v-if="batchTestResults.length > 0" class="batch-summary">
          <el-tag type="success">成功: {{ batchTestResults.filter(r => r.success).length }}</el-tag>
          <el-tag type="danger">失败: {{ batchTestResults.filter(r => !r.success).length }}</el-tag>
          <el-tag type="info">总计: {{ batchTestResults.length }}</el-tag>
        </div>
      </div>
    </el-card>

    <!-- WSS接口配置列表 -->
    <div class="interface-list">
      <el-card 
        v-for="(config, index) in wssConfigs" 
        :key="index" 
        class="interface-card"
        :class="{ 'testing': config.testing, 'connected': config.connected }"
      >
        <template #header>
          <div class="interface-header">
            <div class="interface-info">
              <h3>{{ config.name }}</h3>
              <el-tag :type="getStatusType(config.status)" size="small">
                {{ config.status }}
              </el-tag>
            </div>
            <div class="interface-actions">
              <el-button 
                size="small" 
                :type="config.connected ? 'danger' : 'primary'"
                :loading="config.connecting"
                @click="toggleConnection(index)"
              >
                {{ config.connected ? '断开' : '连接' }}
              </el-button>
              <el-button 
                size="small" 
                type="success"
                :loading="config.testing"
                :disabled="!config.connected"
                @click="testSingleInterface(index)"
              >
                {{ config.testing ? '测试中' : '测试' }}
              </el-button>
            </div>
          </div>
        </template>

        <div class="interface-content">
          <div class="config-info">
            <div class="url-info">
              <strong>连接地址:</strong> {{ config.url }}
            </div>
            <div class="params-info">
              <strong>测试参数:</strong>
              <pre>{{ JSON.stringify(config.testParams, null, 2) }}</pre>
            </div>
          </div>

          <!-- 消息列表 -->
          <div class="messages-section" v-if="config.messages && config.messages.length > 0">
            <h4>消息记录 ({{ config.messages.length }})</h4>
            <div class="messages-container">
              <div 
                v-for="(message, msgIndex) in config.messages" 
                :key="msgIndex"
                class="message-item"
                :class="message.type"
              >
                <div class="message-header">
                  <span class="message-type">{{ getMessageTypeText(message.type) }}</span>
                  <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                  <el-tag 
                    v-if="message.testResult" 
                    :type="message.testResult.success ? 'success' : 'danger'"
                    size="small"
                  >
                    {{ message.testResult.success ? '成功' : '失败' }}
                  </el-tag>
                </div>
                <div class="message-content">{{ message.content }}</div>
                <div v-if="message.testResult && message.testResult.note" class="message-note">
                  {{ message.testResult.note }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 添加新接口配置 -->
    <el-card class="add-interface-card">
      <template #header>
        <span>添加新的WSS接口</span>
      </template>
      
      <el-form :model="newInterfaceForm" label-width="120px">
        <el-form-item label="接口名称">
          <el-input v-model="newInterfaceForm.name" placeholder="请输入接口名称" />
        </el-form-item>
        <el-form-item label="WSS地址">
          <el-input v-model="newInterfaceForm.url" placeholder="wss://example.com/ws" />
        </el-form-item>
        <el-form-item label="测试参数">
          <el-input 
            v-model="newInterfaceForm.params" 
            type="textarea" 
            :rows="6"
            placeholder='{"key": "value"}'
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="addNewInterface">添加接口</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { ElMessage } from 'element-plus'

export default {
  name: 'WssTest',
  data() {
    return {
      // 批量测试状态
      batchTesting: false,
      batchProgress: 0,
      batchTestResults: [],
      
      // WSS接口配置列表
      wssConfigs: [
        {
          name: 'CybotStar多轮对话测试',
          url: 'wss://www.cybotstar.cn/openapi/v2/ws/dialog/',
          testParams: {
            'cybertron-robot-token': 'MTc1MjE1NTEzMjU1Nwp0ejl3K1ZYY2F2MkZrUkVHTGsyRGZhZUltOEU9',
            'cybertron-robot-key': 's%2B6v1Kd9jdVoa79rHsgOLKTy0qE%3D',
            username: 'yao.xu@brgroup.com',
            question: '你帮我写一个10句诗词'
          },
          
          // 运行时状态
          connected: false,
          connecting: false,
          testing: false,
          status: '未连接',
          websocket: null,
          messages: []
        },
        {
          name: '轻量接口',
          url: 'wss://www.cybotstar.cn/openapi/ws/lightweight/dialog/',
          testParams: {
            'cybertron-robot-token': 'MTc1MjE1NTEzMjU1Nwp0ejl3K1ZYY2F2MkZrUkVHTGsyRGZhZUltOEU9',
            'cybertron-robot-key': 's%2B6v1Kd9jdVoa79rHsgOLKTy0qE%3D',
            username: 'yao.xu@brgroup.com',
            question: '你帮我写一个10句诗词'
          },
          
          // 运行时状态
          connected: false,
          connecting: false,
          testing: false,
          status: '未连接',
          websocket: null,
          messages: []
        },
        {
          name: 'bate接口',
          url: 'wss://www.cybotstar.cn/openapi/ws/agent-dialog/lightweight-beta/dialog/',
          testParams: {
            'cybertron-robot-token': 'MTc1MjE1NTEzMjU1Nwp0ejl3K1ZYY2F2MkZrUkVHTGsyRGZhZUltOEU9',
            'cybertron-robot-key': 's%2B6v1Kd9jdVoa79rHsgOLKTy0qE%3D',
            username: 'yao.xu@brgroup.com',
            question: '你帮我写一个10句诗词'
          },
          
          // 运行时状态
          connected: false,
          connecting: false,
          testing: false,
          status: '未连接',
          websocket: null,
          messages: []
          
        }
      ],
      
      // 添加新接口表单
      newInterfaceForm: {
        name: '',
        url: '',
        params: ''
      }
    }
  },
  methods: {
    // 测试所有接口
    async testAllInterfaces() {
      if (this.wssConfigs.length === 0) {
        ElMessage.warning('没有可测试的接口')
        return
      }

      this.batchTesting = true
      this.batchProgress = 0
      this.batchTestResults = []

      try {
        for (let i = 0; i < this.wssConfigs.length; i++) {
          const config = this.wssConfigs[i]
          this.batchProgress = Math.round((i / this.wssConfigs.length) * 100)
          
          try {
            // 如果未连接，先连接
            if (!config.connected) {
              await this.connectInterface(i)
              await this.sleep(1000) // 等待连接稳定
            }
            
            // 执行测试
            if (config.connected) {
              await this.testSingleInterface(i)
              this.batchTestResults.push({ 
                name: config.name, 
                success: true, 
                message: '测试完成' 
              })
            } else {
              this.batchTestResults.push({ 
                name: config.name, 
                success: false, 
                message: '连接失败' 
              })
            }
          } catch (error) {
            this.batchTestResults.push({ 
              name: config.name, 
              success: false, 
              message: error.message 
            })
          }
          
          await this.sleep(500) // 接口间隔
        }
        
        this.batchProgress = 100
        ElMessage.success(`批量测试完成！成功: ${this.batchTestResults.filter(r => r.success).length}, 失败: ${this.batchTestResults.filter(r => !r.success).length}`)
        
        // 测试完成后断开所有连接
        await this.disconnectAllInterfaces()
      } catch (error) {
        ElMessage.error(`批量测试失败: ${error.message}`)
      } finally {
        this.batchTesting = false
      }
    },

    // 切换连接状态
    async toggleConnection(index) {
      const config = this.wssConfigs[index]
      if (config.connected) {
        this.disconnectInterface(index)
      } else {
        await this.connectInterface(index)
      }
    },

    // 连接接口
    async connectInterface(index) {
      const config = this.wssConfigs[index]
      
      if (config.connecting || config.connected) {
        return
      }

      config.connecting = true
      config.status = '连接中...'

      try {
        const websocket = new WebSocket(config.url)
        
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            websocket.close()
            reject(new Error('连接超时'))
          }, 10000)

          websocket.onopen = () => {
            clearTimeout(timeout)
            config.connected = true
            config.connecting = false
            config.status = '已连接'
            config.websocket = websocket
            
            this.addMessage(index, {
              type: 'system',
              content: 'WebSocket连接成功',
              timestamp: new Date(),
              testResult: { success: true, note: '连接建立成功' }
            })
            
            ElMessage.success(`${config.name} 连接成功`)
            resolve()
          }

          websocket.onmessage = (event) => {
            this.addMessage(index, {
              type: 'received',
              content: event.data,
              timestamp: new Date(),
              testResult: { success: true, note: '接收消息成功' }
            })
          }

          websocket.onerror = (error) => {
            clearTimeout(timeout)
            config.connecting = false
            config.status = '连接失败'
            
            this.addMessage(index, {
              type: 'error',
              content: `连接错误: ${error.message || '未知错误'}`,
              timestamp: new Date(),
              testResult: { success: false, note: '连接建立失败' }
            })
            
            reject(error)
          }

          websocket.onclose = (event) => {
            clearTimeout(timeout)
            config.connected = false
            config.connecting = false
            config.status = '已断开'
            config.websocket = null
            
            this.addMessage(index, {
              type: 'system',
              content: `连接关闭 (代码: ${event.code})`,
              timestamp: new Date(),
              testResult: { success: event.code === 1000, note: event.code === 1000 ? '正常关闭连接' : '异常关闭连接' }
            })
          }
        })
      } catch (error) {
        config.connecting = false
        config.status = '连接失败'
        ElMessage.error(`${config.name} 连接失败: ${error.message}`)
        
        this.addMessage(index, {
          type: 'error',
          content: `连接失败: ${error.message}`,
          timestamp: new Date(),
          testResult: { success: false, note: '连接建立失败' }
        })
        
        throw error
      }
    },

    // 断开连接
    disconnectInterface(index) {
      const config = this.wssConfigs[index]
      
      if (config.websocket) {
        config.websocket.close()
        config.websocket = null
      }
      
      config.connected = false
      config.status = '已断开'
      ElMessage.info(`${config.name} 已断开连接`)
    },

    // 断开所有连接
    async disconnectAllInterfaces() {
      let disconnectedCount = 0
      
      for (let i = 0; i < this.wssConfigs.length; i++) {
        const config = this.wssConfigs[i]
        if (config.connected) {
          this.disconnectInterface(i)
          disconnectedCount++
          await this.sleep(200) // 短暂延迟，避免同时断开太多连接
        }
      }
      
      if (disconnectedCount > 0) {
        ElMessage.info(`已断开 ${disconnectedCount} 个WSS连接`)
      }
    },

    // 测试单个接口
    async testSingleInterface(index) {
      const config = this.wssConfigs[index]
      
      if (!config.connected || !config.websocket) {
        ElMessage.warning('请先连接接口')
        return
      }

      config.testing = true

      try {
        const messageContent = JSON.stringify(config.testParams)
        config.websocket.send(messageContent)
        
        this.addMessage(index, {
          type: 'sent',
          content: messageContent,
          timestamp: new Date(),
          testResult: { success: true, note: '消息发送成功' }
        })
        
        ElMessage.success(`${config.name} 测试消息发送成功`)
        
        // 等待响应
        await this.sleep(2000)
      } catch (error) {
        ElMessage.error(`${config.name} 测试失败: ${error.message}`)
        
        this.addMessage(index, {
          type: 'error',
          content: `测试失败: ${error.message}`,
          timestamp: new Date(),
          testResult: { success: false, note: '消息发送失败' }
        })
        
        throw error
      } finally {
        config.testing = false
      }
    },

    // 添加消息到指定接口
    addMessage(index, message) {
      if (!this.wssConfigs[index].messages) {
        this.$set(this.wssConfigs[index], 'messages', [])
      }
      this.wssConfigs[index].messages.unshift(message)
      
      // 限制消息数量
      if (this.wssConfigs[index].messages.length > 100) {
        this.wssConfigs[index].messages = this.wssConfigs[index].messages.slice(0, 100)
      }
    },

    // 添加新接口
    addNewInterface() {
      if (!this.newInterfaceForm.name || !this.newInterfaceForm.url) {
        ElMessage.warning('请填写接口名称和地址')
        return
      }

      let testParams = {}
      if (this.newInterfaceForm.params) {
        try {
          testParams = JSON.parse(this.newInterfaceForm.params)
        } catch (error) {
          ElMessage.error('测试参数格式错误，请输入有效的JSON')
          return
        }
      }

      this.wssConfigs.push({
        name: this.newInterfaceForm.name,
        url: this.newInterfaceForm.url,
        testParams: testParams,
        connected: false,
        connecting: false,
        testing: false,
        status: '未连接',
        websocket: null,
        messages: []
      })

      ElMessage.success('接口添加成功')
      this.resetForm()
    },

    // 重置表单
    resetForm() {
      this.newInterfaceForm = {
        name: '',
        url: '',
        params: ''
      }
    },

    // 工具方法
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },

    getStatusType(status) {
      const statusMap = {
        未连接: 'info',
        '连接中...': 'warning',
        已连接: 'success',
        连接失败: 'danger',
        已断开: 'info'
      }
      return statusMap[status] || 'info'
    },

    getMessageTypeText(type) {
      const typeMap = {
        sent: '发送',
        received: '接收',
        error: '错误',
        system: '系统'
      }
      return typeMap[type] || type
    },

    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString()
    },

    formatProgress(percentage) {
      return `${percentage}%`
    }
  },

  beforeUnmount() {
    // 组件销毁前关闭所有连接
    this.wssConfigs.forEach((config, index) => {
      if (config.connected) {
        this.disconnectInterface(index)
      }
    })
  }
}
</script>

<style scoped>
.wss-test-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-status {
  margin-top: 15px;
}

.batch-summary {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.interface-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}

.interface-card {
  transition: all 0.3s ease;
}

.interface-card.testing {
  border-color: #409eff;
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.3);
}

.interface-card.connected {
  border-color: #67c23a;
}

.interface-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.interface-info h3 {
  margin: 0 0 5px 0;
  color: #303133;
}

.interface-actions {
  display: flex;
  gap: 10px;
}

.interface-content {
  margin-top: 15px;
}

.config-info {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.url-info, .params-info {
  margin-bottom: 10px;
}

.params-info pre {
  background: #fff;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  margin: 5px 0 0 0;
  font-size: 12px;
  overflow-x: auto;
}

.messages-section h4 {
  color: #606266;
  margin-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}

.messages-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.message-item {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.message-item:last-child {
  border-bottom: none;
}

.message-item.sent {
  background-color: #f0f9ff;
}

.message-item.received {
  background-color: #f0f9f0;
}

.message-item.error {
  background-color: #fef0f0;
}

.message-item.system {
  background-color: #fafafa;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #909399;
}

.message-content {
  font-family: 'Courier New', monospace;
  background: rgba(0, 0, 0, 0.05);
  padding: 8px;
  border-radius: 4px;
  word-break: break-all;
  font-size: 13px;
}

.message-note {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
  font-style: italic;
}

.add-interface-card {
  margin-top: 30px;
}

@media (max-width: 768px) {
  .wss-test-container {
    padding: 10px;
  }
  
  .interface-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .interface-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>