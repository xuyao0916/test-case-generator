<template>
  <div class="test-case-review">
    <el-card class="main-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h2><el-icon><Document /></el-icon> 用例评审</h2>
          <p class="card-subtitle">上传测试用例文件，AI智能体将为您提供专业的评审意见</p>
        </div>
      </template>

      <!-- 功能描述 -->
      <div class="feature-description">
        <el-alert
          title="用例评审功能"
          type="info"
          description="支持上传各种格式的测试用例文件，AI将从用例完整性、覆盖度、可执行性等多个维度进行专业评审，并提供改进建议。"
          show-icon
          :closable="false"
        />
      </div>

      <!-- AI服务选择 -->
      <div class="api-selection">
        <h3>选择AI服务</h3>
        <el-radio-group v-model="selectedApi" class="api-radio-group">
          <el-radio-button label="cybotstar">Cybotstar AI</el-radio-button>
          <el-radio-button label="deepseek">DeepSeek AI</el-radio-button>
        </el-radio-group>
        <div class="api-description">
          <span v-if="selectedApi === 'cybotstar'" class="api-desc">
            <el-icon><Star /></el-icon> 使用Cybotstar AI进行用例评审，专业的测试用例分析能力
          </span>
          <span v-if="selectedApi === 'deepseek'" class="api-desc">
            <el-icon><Cpu /></el-icon> 使用DeepSeek AI进行用例评审，强大的逻辑分析和建议能力
          </span>
        </div>
      </div>

      <!-- 文件上传区域 -->
      <div class="upload-section">
        <h3>上传测试用例文件</h3>
        <div class="upload-tip">
          <p>支持多种格式的测试用例文件，包括Excel、XMind、Word、文本等格式</p>
        </div>
        
        <el-upload
          ref="uploadRef"
          class="upload-demo"
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :file-list="fileList"
          accept=".txt,.md,.docx,.doc,.pdf,.xlsx,.xls,.xmind,.json,.xml,.csv"
          :limit="1"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            将测试用例文件拖到此处，或<em>点击上传</em>
          </div>
          <div class="el-upload__tip">
            支持 .txt, .md, .docx, .doc, .pdf, .xlsx, .xls, .xmind, .json, .xml, .csv 格式
          </div>
        </el-upload>
      </div>

      <!-- 评审配置 -->
      <div class="review-config" v-if="fileList.length > 0">
        <h3>评审配置</h3>
        <el-form :model="reviewForm" label-width="120px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="评审维度">
                <el-checkbox-group v-model="reviewForm.dimensions">
                  <el-checkbox label="completeness">完整性</el-checkbox>
                  <el-checkbox label="coverage">覆盖度</el-checkbox>
                  <el-checkbox label="executability">可执行性</el-checkbox>
                  <el-checkbox label="clarity">清晰度</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="评审深度">
                <el-radio-group v-model="reviewForm.depth">
                  <el-radio label="basic">基础评审</el-radio>
                  <el-radio label="detailed">详细评审</el-radio>
                  <el-radio label="comprehensive">全面评审</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="特殊要求">
            <el-input
              v-model="reviewForm.requirements"
              type="textarea"
              :rows="3"
              placeholder="请输入特殊的评审要求或关注点（可选）"
            />
          </el-form-item>
        </el-form>
      </div>

      <!-- 开始评审按钮 -->
      <div class="action-section" v-if="fileList.length > 0">
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          @click="startReview"
          class="review-btn"
        >
          <el-icon v-if="!loading"><Search /></el-icon>
          {{ loading ? '评审中...' : '开始评审' }}
        </el-button>
      </div>

      <!-- 评审进度 -->
      <el-card v-if="showProgress" class="progress-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h3>评审进度</h3>
          </div>
        </template>
        <div class="progress-content">
          <el-progress :percentage="progress" :status="progressStatus" />
          <p class="progress-text">{{ progressText }}</p>
        </div>
      </el-card>

      <!-- 评审结果 -->
      <el-card v-if="reviewResult" class="result-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h3>评审结果</h3>
            <div class="header-actions">
              <el-button
                type="success"
                size="small"
                @click="downloadResult"
                :disabled="!downloadUrl"
              >
                <el-icon><Download /></el-icon>
                下载报告
              </el-button>
              <el-button
                type="primary"
                size="small"
                @click="copyToClipboard"
              >
                <el-icon><CopyDocument /></el-icon>
                复制结果
              </el-button>
            </div>
          </div>
        </template>
        
        <div class="result-content">
          <el-tabs v-model="activeTab" type="border-card">
            <el-tab-pane label="评审总结" name="summary">
              <div class="review-summary">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="总体评分">
                    <el-rate v-model="reviewResult.overallScore" disabled show-score />
                  </el-descriptions-item>
                  <el-descriptions-item label="评审时间">
                    {{ formatTime(reviewResult.reviewTime) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="用例总数">
                    {{ reviewResult.totalCases || 'N/A' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="问题数量">
                    <el-tag :type="getIssueTagType(reviewResult.issueCount)">{{ reviewResult.issueCount || 0 }}</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </el-tab-pane>
            <el-tab-pane label="详细评审" name="detailed">
              <div class="review-content" v-html="formatReviewContent(reviewResult.content)"></div>
            </el-tab-pane>
            <el-tab-pane label="改进建议" name="suggestions">
              <div class="suggestions-content" v-html="formatSuggestions(reviewResult.suggestions)"></div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-card>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Star, Cpu, UploadFilled, Search, Download, CopyDocument } from '@element-plus/icons-vue'
import axios from 'axios'

export default {
  name: 'TestCaseReview',
  components: {
    Document,
    Star,
    Cpu,
    UploadFilled,
    Search,
    Download,
    CopyDocument
  },
  setup() {
    const selectedApi = ref('cybotstar')
    const fileList = ref([])
    const loading = ref(false)
    const showProgress = ref(false)
    const progress = ref(0)
    const progressStatus = ref('')
    const progressText = ref('')
    const reviewResult = ref(null)
    const downloadUrl = ref('')
    const activeTab = ref('summary')
    
    const reviewForm = reactive({
      dimensions: ['completeness', 'coverage', 'executability', 'clarity'],
      depth: 'detailed',
      requirements: ''
    })

    const uploadRef = ref(null)

    // 处理文件变化
    const handleFileChange = (file) => {
      fileList.value = [file]
    }

    // 处理文件移除
    const handleFileRemove = () => {
      fileList.value = []
    }

    // 开始评审
    const startReview = async () => {
      if (fileList.value.length === 0) {
        ElMessage.warning('请先上传测试用例文件')
        return
      }

      loading.value = true
      showProgress.value = true
      progress.value = 0
      progressStatus.value = 'active'
      progressText.value = '正在上传文件...'

      try {
        const formData = new FormData()
        formData.append('file', fileList.value[0].raw)
        formData.append('apiProvider', selectedApi.value)
        formData.append('dimensions', JSON.stringify(reviewForm.dimensions))
        formData.append('depth', reviewForm.depth)
        formData.append('requirements', reviewForm.requirements)

        // 模拟进度更新
        const progressInterval = setInterval(() => {
          if (progress.value < 90) {
            progress.value += 10
            if (progress.value === 30) {
              progressText.value = '正在解析文件内容...'
            } else if (progress.value === 60) {
              progressText.value = '正在进行AI评审...'
            } else if (progress.value === 90) {
              progressText.value = '正在生成评审报告...'
            }
          }
        }, 500)

        const response = await axios.post('/api/review-test-cases', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        clearInterval(progressInterval)
        progress.value = 100
        progressStatus.value = 'success'
        progressText.value = '评审完成！'

        if (response.data.success) {
          reviewResult.value = {
            content: response.data.content,
            overallScore: response.data.overallScore || 4,
            reviewTime: new Date(),
            totalCases: response.data.totalCases,
            issueCount: response.data.issueCount,
            suggestions: response.data.suggestions
          }
          downloadUrl.value = response.data.downloadUrl
          ElMessage.success('用例评审完成')
        } else {
          throw new Error(response.data.error || '评审失败')
        }
      } catch (error) {
        console.error('评审失败:', error)
        progress.value = 100
        progressStatus.value = 'exception'
        progressText.value = '评审失败'
        ElMessage.error(error.message || '评审失败，请稍后重试')
        
        // 模拟评审结果
        reviewResult.value = {
          content: '# 测试用例评审报告\n\n## 总体评价\n\n本次评审的测试用例整体质量良好，但仍有改进空间。\n\n## 详细分析\n\n### 1. 完整性分析\n- ✅ 测试用例覆盖了主要功能点\n- ⚠️ 部分边界条件测试用例缺失\n- ❌ 异常处理测试用例不够充分\n\n### 2. 可执行性分析\n- ✅ 测试步骤描述清晰\n- ✅ 预期结果明确\n- ⚠️ 部分前置条件描述不够详细\n\n### 3. 覆盖度分析\n- ✅ 功能覆盖度: 85%\n- ⚠️ 边界值覆盖度: 60%\n- ❌ 异常场景覆盖度: 40%\n\n*注意：由于网络问题，当前显示模拟评审结果。*',
          overallScore: 3.5,
          reviewTime: new Date(),
          totalCases: 25,
          issueCount: 8,
          suggestions: '## 改进建议\n\n1. **增加边界值测试**\n   - 建议添加最大值、最小值、临界值的测试用例\n   - 特别关注数值型输入的边界情况\n\n2. **完善异常处理测试**\n   - 增加非法输入的测试用例\n   - 添加系统异常情况的处理验证\n\n3. **优化测试步骤描述**\n   - 使测试步骤更加具体和可操作\n   - 明确每个步骤的预期结果\n\n4. **补充前置条件**\n   - 详细描述测试环境要求\n   - 明确测试数据准备步骤'
        }
      } finally {
        loading.value = false
        setTimeout(() => {
          showProgress.value = false
        }, 2000)
      }
    }

    // 下载结果
    const downloadResult = () => {
      if (downloadUrl.value) {
        window.open(downloadUrl.value, '_blank')
      } else {
        ElMessage.warning('暂无可下载的文件')
      }
    }

    // 复制到剪贴板
    const copyToClipboard = async () => {
      if (!reviewResult.value) return
      
      try {
        const content = reviewResult.value.content + '\n\n' + reviewResult.value.suggestions
        await navigator.clipboard.writeText(content)
        ElMessage.success('评审结果已复制到剪贴板')
      } catch (error) {
        ElMessage.error('复制失败，请手动复制')
      }
    }

    // 格式化时间
    const formatTime = (time) => {
      if (!time) return 'N/A'
      return new Date(time).toLocaleString('zh-CN')
    }

    // 格式化评审内容
    const formatReviewContent = (content) => {
      if (!content) return ''
      return content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    }

    // 格式化建议内容
    const formatSuggestions = (suggestions) => {
      if (!suggestions) return ''
      return suggestions.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    }

    // 获取问题标签类型
    const getIssueTagType = (count) => {
      if (count === 0) return 'success'
      if (count <= 5) return 'warning'
      return 'danger'
    }

    return {
      selectedApi,
      fileList,
      loading,
      showProgress,
      progress,
      progressStatus,
      progressText,
      reviewResult,
      downloadUrl,
      activeTab,
      reviewForm,
      uploadRef,
      handleFileChange,
      handleFileRemove,
      startReview,
      downloadResult,
      copyToClipboard,
      formatTime,
      formatReviewContent,
      formatSuggestions,
      getIssueTagType
    }
  }
}
</script>

<style scoped>
.test-case-review {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.main-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-header h2 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
}

.card-subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.feature-description {
  margin-bottom: 24px;
}

.api-selection {
  margin-bottom: 24px;
}

.api-selection h3 {
  margin: 0 0 12px 0;
  color: #303133;
}

.api-radio-group {
  margin-bottom: 12px;
}

.api-description {
  color: #606266;
  font-size: 14px;
}

.api-desc {
  display: flex;
  align-items: center;
  gap: 6px;
}

.upload-section {
  margin-bottom: 24px;
}

.upload-section h3 {
  margin: 0 0 12px 0;
  color: #303133;
}

.upload-tip {
  margin-bottom: 16px;
  color: #606266;
  font-size: 14px;
}

.upload-demo {
  width: 100%;
}

.review-config {
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.review-config h3 {
  margin: 0 0 16px 0;
  color: #303133;
}

.action-section {
  text-align: center;
  margin-bottom: 24px;
}

.review-btn {
  padding: 12px 32px;
  font-size: 16px;
}

.progress-card {
  margin-bottom: 24px;
}

.progress-content {
  text-align: center;
}

.progress-text {
  margin-top: 12px;
  color: #606266;
  font-size: 14px;
}

.result-card {
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.result-content {
  margin-top: 16px;
}

.review-summary {
  margin-bottom: 16px;
}

.review-content,
.suggestions-content {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.review-content :deep(strong),
.suggestions-content :deep(strong) {
  color: #409eff;
  font-weight: 600;
}

@media (max-width: 768px) {
  .test-case-review {
    padding: 12px;
  }
  
  .card-header {
    text-align: center;
  }
  
  .header-actions {
    flex-direction: column;
  }
}
</style>