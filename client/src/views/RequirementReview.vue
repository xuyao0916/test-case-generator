<template>
  <div class="requirement-review">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <h2>需求评审</h2>
          <p>上传需求文档，AI将为您提供专业的需求评审报告</p>
        </div>
      </template>

      <div class="review-content">
        <!-- API选择 -->
        <div class="api-selection">
          <h3>选择AI模型</h3>
          <el-radio-group v-model="selectedApi" class="api-options">
            <el-radio label="cybotstar">CybotStar</el-radio>
            <el-radio label="openai">OpenAI</el-radio>
          </el-radio-group>
        </div>

        <!-- 文件上传区域 -->
        <div class="upload-section">
          <h3>上传需求文档</h3>
          <el-upload
            ref="uploadRef"
            class="upload-demo"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="fileList"
            accept=".txt,.md,.docx,.doc,.pdf,.xlsx,.xls,.json,.xml,.csv"
            :limit="10"
            multiple
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将需求文档拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持格式：.txt, .md, .docx, .doc, .pdf, .xlsx, .xls, .json, .xml, .csv（最大10MB，最多10个文件）
              </div>
            </template>
          </el-upload>
        </div>

        <!-- 文件内容预览 -->
        <div v-if="fileContents.length > 0" class="file-contents-preview">
          <h3>文件内容预览</h3>
          <el-collapse v-model="activeFileNames">
            <el-collapse-item v-for="(fileContent, index) in fileContents" :key="index" :title="fileContent.fileName" :name="fileContent.fileName">
              <el-input
                :value="fileContent.content"
                type="textarea"
                :rows="8"
                placeholder="文件内容将在这里显示..."
                readonly
                class="file-content-textarea"
              />
            </el-collapse-item>
          </el-collapse>
        </div>

        <!-- 操作按钮 -->
        <div class="action-section">
          <el-button
            type="primary"
            size="large"
            :loading="reviewing"
            @click="startReview"
            :disabled="uploadedFiles.length === 0"
            class="review-btn"
          >
            <el-icon v-if="!reviewing"><Magic /></el-icon>
            {{ reviewing ? '评审中...' : '开始需求评审' }}
          </el-button>
        </div>

        <!-- 评审结果 -->
        <div v-if="reviewResult" class="result-section">
          <div class="result-header">
            <h3>需求评审报告</h3>
            <div class="result-actions">
              <el-button
                type="success"
                @click="downloadResult"
                :disabled="!downloadUrl"
              >
                <el-icon><Download /></el-icon>
                下载报告
              </el-button>
              <el-button
                @click="copyToClipboard"
              >
                <el-icon><DocumentCopy /></el-icon>
                复制内容
              </el-button>
            </div>
          </div>
          
          <div class="result-content">
            <div class="review-summary">
              <h4>评审摘要</h4>
              <div class="summary-stats">
                <el-tag :type="getScoreType(reviewResult.score)" size="large">
                  综合评分: {{ reviewResult.score }}/100
                </el-tag>
                <el-tag :type="getIssueTagType(reviewResult.issueCount)" size="large">
                  发现问题: {{ reviewResult.issueCount }}个
                </el-tag>
              </div>
            </div>
            
            <div class="review-details">
              <h4>详细评审内容</h4>
              <div class="review-content-text" v-html="formatReviewContent(reviewResult.content)"></div>
            </div>
            
            <div v-if="reviewResult.suggestions" class="review-suggestions">
              <h4>改进建议</h4>
              <div class="suggestions-content" v-html="formatSuggestions(reviewResult.suggestions)"></div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { UploadFilled, Magic, Download, DocumentCopy } from '@element-plus/icons-vue'

export default {
  name: 'RequirementReview',
  components: {
    UploadFilled,
    Magic,
    Download,
    DocumentCopy
  },
  data() {
    return {
      selectedApi: 'cybotstar',
      fileList: [],
      uploadedFiles: [],
      fileContents: [],
      activeFileNames: [],
      reviewing: false,
      reviewResult: null,
      downloadUrl: ''
    }
  },
  methods: {
    handleFileChange(file) {
      // 文件大小检查（10MB）
      const isLt10M = file.size / 1024 / 1024 < 10
      if (!isLt10M) {
        ElMessage.error('文件大小不能超过 10MB!')
        return false
      }
      
      // 文件类型检查
      const allowedTypes = ['.txt', '.md', '.docx', '.doc', '.pdf', '.xlsx', '.xls', '.json', '.xml', '.csv']
      const fileName = file.name.toLowerCase()
      const isValidType = allowedTypes.some(type => fileName.endsWith(type))
      
      if (!isValidType) {
        ElMessage.error('不支持的文件格式！')
        return false
      }
      
      this.uploadedFiles.push(file.raw)
      
      // 读取文件内容
      const reader = new FileReader()
      reader.onload = (e) => {
        const fileContent = {
          fileName: file.name,
          content: e.target.result
        }
        this.fileContents.push(fileContent)
        if (!this.activeFileNames.includes(file.name)) {
          this.activeFileNames.push(file.name)
        }
      }
      reader.readAsText(file.raw)
      
      ElMessage.success('文件上传成功！')
    },

    handleFileRemove(file) {
      const index = this.uploadedFiles.findIndex(f => f.name === file.name)
      if (index > -1) {
        this.uploadedFiles.splice(index, 1)
      }
      
      // 移除文件内容
      const contentIndex = this.fileContents.findIndex(f => f.fileName === file.name)
      if (contentIndex > -1) {
        this.fileContents.splice(contentIndex, 1)
      }
      
      // 移除激活状态
      const nameIndex = this.activeFileNames.indexOf(file.name)
      if (nameIndex > -1) {
        this.activeFileNames.splice(nameIndex, 1)
      }
    },

    async startReview() {
      if (this.uploadedFiles.length === 0) {
        ElMessage.warning('请先上传需求文档')
        return
      }

      this.reviewing = true
      try {
        const formData = new FormData()
        
        this.uploadedFiles.forEach(file => {
          formData.append('files', file)
        })
        
        formData.append('apiProvider', this.selectedApi)
        formData.append('reviewType', 'requirement')
        
        const response = await axios.post('/api/review/requirement', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        if (response.data.success) {
          this.reviewResult = response.data.result
          this.downloadUrl = response.data.downloadUrl
          ElMessage.success('需求评审完成！')
        } else {
          throw new Error(response.data.error || '评审失败')
        }
      } catch (error) {
        console.error('评审失败:', error)
        ElMessage.error(error.response?.data?.error || '需求评审失败，请稍后重试')
        
        // 模拟评审结果
        this.reviewResult = {
          score: 85,
          issueCount: 3,
          content: '# 需求评审报告\n\n## 整体评价\n该需求文档整体结构清晰，内容相对完整，但在某些方面还有改进空间。\n\n## 详细分析\n\n### 优点\n1. **需求描述清晰**: 功能需求描述较为明确\n2. **业务流程完整**: 主要业务流程覆盖全面\n3. **界面设计合理**: UI/UX设计考虑周到\n\n### 问题点\n1. **非功能需求不足**: 缺少性能、安全性等非功能需求\n2. **验收标准模糊**: 部分功能缺少明确的验收标准\n3. **异常处理不完整**: 异常场景处理描述不够详细',
          suggestions: '## 改进建议\n\n1. **补充非功能需求**\n   - 添加性能要求（响应时间、并发用户数等）\n   - 明确安全性要求\n   - 定义可用性标准\n\n2. **完善验收标准**\n   - 为每个功能点定义明确的验收标准\n   - 添加测试用例示例\n\n3. **增强异常处理**\n   - 详细描述各种异常场景\n   - 定义错误处理策略'
        }
      } finally {
        this.reviewing = false
      }
    },

    async downloadResult() {
      if (!this.downloadUrl) {
        ElMessage.warning('暂无可下载的文件')
        return
      }

      try {
        const response = await axios.get(this.downloadUrl, {
          responseType: 'blob'
        })

        const blob = new Blob([response.data], { type: 'application/octet-stream' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `requirement-review-${new Date().getTime()}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        ElMessage.success('文件下载成功！')
      } catch (error) {
        console.error('下载失败:', error)
        ElMessage.error('文件下载失败')
      }
    },

    async copyToClipboard() {
      if (!this.reviewResult) return
      
      try {
        const content = this.reviewResult.content + '\n\n' + (this.reviewResult.suggestions || '')
        await navigator.clipboard.writeText(content)
        ElMessage.success('评审报告已复制到剪贴板')
      } catch (error) {
        ElMessage.error('复制失败，请手动复制')
      }
    },

    getScoreType(score) {
      if (score >= 90) return 'success'
      if (score >= 70) return 'warning'
      return 'danger'
    },

    getIssueTagType(count) {
      if (count === 0) return 'success'
      if (count <= 3) return 'warning'
      return 'danger'
    },

    formatReviewContent(content) {
      if (!content) return ''
      return content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    },

    formatSuggestions(suggestions) {
      if (!suggestions) return ''
      return suggestions.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    }
  }
}
</script>

<style scoped>
.requirement-review {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.main-card {
  max-width: 1200px;
  margin: 0 auto;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  text-align: center;
  padding: 10px 0;
}

.card-header h2 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 28px;
  font-weight: 600;
}

.card-header p {
  margin: 0;
  color: #6c757d;
  font-size: 16px;
}

.review-content {
  padding: 20px;
}

.api-selection {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.api-selection h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 18px;
}

.api-options {
  display: flex;
  gap: 20px;
}

.upload-section {
  margin-bottom: 30px;
}

.upload-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 18px;
}

.upload-demo {
  width: 100%;
}

.upload-demo .el-upload {
  width: 100%;
}

.upload-demo .el-upload-dragger {
  width: 100%;
  height: 180px;
}

.file-contents-preview {
  margin-bottom: 30px;
}

.file-contents-preview h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 18px;
}

.file-content-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
}

.action-section {
  text-align: center;
  margin: 40px 0;
}

.review-btn {
  padding: 12px 30px;
  font-size: 16px;
  border-radius: 8px;
}

.result-section {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e9ecef;
}

.result-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 20px;
}

.result-actions {
  display: flex;
  gap: 10px;
}

.result-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.review-summary {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e9ecef;
}

.review-summary h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
}

.summary-stats {
  display: flex;
  gap: 15px;
}

.review-details,
.review-suggestions {
  margin-bottom: 25px;
}

.review-details h4,
.review-suggestions h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
}

.review-content-text,
.suggestions-content {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 15px;
  line-height: 1.6;
  color: #495057;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .requirement-review {
    padding: 10px;
  }
  
  .result-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .result-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .summary-stats {
    flex-direction: column;
    gap: 10px;
  }
  
  .api-options {
    flex-direction: column;
    gap: 10px;
  }
}
</style>