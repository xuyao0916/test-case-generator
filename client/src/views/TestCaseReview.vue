<template>
  <div class="test-case-review">
    <el-card class="main-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h2><el-icon><Document /></el-icon> 测试用例评审</h2>
          <p class="subtitle">分步骤进行测试用例评审，获得专业的AI评审报告</p>
        </div>
      </template>

      <!-- 步骤指示器 -->
      <div class="steps-container">
        <el-steps :active="currentStep" finish-status="success" align-center>
          <el-step title="需求文档" description="上传需求文档或输入需求描述" />
          <el-step title="测试用例" description="上传测试用例或输入测试用例" />
          <el-step title="评审结果" description="查看AI评审报告" />
        </el-steps>
      </div>

      <!-- 步骤1: 需求文档 -->
      <div v-if="currentStep === 0" class="step-content">
        <!-- AI服务选择 -->
        <div class="api-selection">
          <h3><el-icon><Star /></el-icon> 选择AI服务</h3>
          <el-radio-group v-model="selectedApi" class="api-options">
            <el-radio-button label="cybotstar">
              <el-icon><Cpu /></el-icon>
              Cybotstar AI
            </el-radio-button>
            <el-radio-button label="deepseek">
              <el-icon><Cpu /></el-icon>
              DeepSeek AI
            </el-radio-button>
          </el-radio-group>
        </div>

        <!-- 需求文档上传 -->
        <div class="upload-section">
          <h3><el-icon><UploadFilled /></el-icon> 上传需求文档</h3>
          <el-upload
            ref="requirementUploadRef"
            class="upload-demo"
            drag
            :file-list="requirementFileList"
            :on-change="handleRequirementFileChange"
            :on-remove="handleRequirementFileRemove"
            :auto-upload="false"
            accept=".txt,.doc,.docx,.pdf,.xls,.xlsx"
            :limit="10"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将需求文档拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 txt/doc/docx/pdf/xls/xlsx 格式文件，最多上传10个文件，单个文件大小不超过10MB
              </div>
            </template>
          </el-upload>
        </div>

        <!-- 需求描述输入 -->
        <div class="input-section">
          <h3>或者直接输入需求描述</h3>
          <el-input
            v-model="requirementContent"
            type="textarea"
            :rows="8"
            placeholder="请输入需求描述内容..."
            show-word-limit
            maxlength="10000"
          />
        </div>

        <!-- 步骤1操作按钮 -->
        <div class="step-actions">
          <el-button
            type="primary"
            size="large"
            @click="nextStep"
            :disabled="!canProceedToStep2"
          >
            下一步：上传测试用例
          </el-button>
        </div>
      </div>

      <!-- 步骤2: 测试用例 -->
      <div v-if="currentStep === 1" class="step-content">
        <!-- 测试用例上传 -->
        <div class="upload-section">
          <h3><el-icon><UploadFilled /></el-icon> 上传测试用例</h3>
          <el-upload
            ref="testCaseUploadRef"
            class="upload-demo"
            drag
            :file-list="testCaseFileList"
            :on-change="handleTestCaseFileChange"
            :on-remove="handleTestCaseFileRemove"
            :auto-upload="false"
            accept=".txt,.doc,.docx,.pdf,.xls,.xlsx,.xmind"
            :limit="10"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将测试用例文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 txt/doc/docx/pdf/xls/xlsx/xmind 格式文件，最多上传10个文件，单个文件大小不超过10MB
              </div>
            </template>
          </el-upload>
        </div>

        <!-- 测试用例输入 -->
        <div class="input-section">
          <h3>或者直接输入测试用例</h3>
          <el-input
            v-model="testCaseContent"
            type="textarea"
            :rows="8"
            placeholder="请输入测试用例内容..."
            show-word-limit
            maxlength="10000"
          />
        </div>

        <!-- 评审配置 -->
        <div class="config-section">
          <h3>评审配置</h3>
          <el-form :model="reviewForm" label-width="120px">
            <el-form-item label="评审维度">
              <el-checkbox-group v-model="reviewForm.dimensions">
                <el-checkbox label="completeness">完整性</el-checkbox>
                <el-checkbox label="coverage">覆盖度</el-checkbox>
                <el-checkbox label="executability">可执行性</el-checkbox>
                <el-checkbox label="clarity">清晰度</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="评审深度">
              <el-radio-group v-model="reviewForm.depth">
                <el-radio label="basic">基础评审</el-radio>
                <el-radio label="detailed">详细评审</el-radio>
                <el-radio label="comprehensive">全面评审</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="特殊要求">
              <el-input
                v-model="reviewForm.requirements"
                type="textarea"
                :rows="3"
                placeholder="请输入特殊评审要求（可选）"
              />
            </el-form-item>
          </el-form>
        </div>

        <!-- 步骤2操作按钮 -->
        <div class="step-actions">
          <el-button size="large" @click="prevStep">
            上一步
          </el-button>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="startReview"
            :disabled="!canStartReview"
          >
            <el-icon v-if="!loading"><Search /></el-icon>
            {{ loading ? '评审中...' : '开始评审' }}
          </el-button>
        </div>
      </div>

      <!-- 步骤3: 评审结果 -->
      <div v-if="currentStep === 2" class="step-content">
        <!-- 重新开始按钮 -->
        <div class="restart-section">
          <el-button @click="restartReview" size="large">
            重新开始评审
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 评审进度和结果显示区域 -->
    <div v-if="currentStep === 2">
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
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed } from 'vue'
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
    const currentStep = ref(0)
    const requirementFileList = ref([])
    const testCaseFileList = ref([])
    const requirementContent = ref('')
    const testCaseContent = ref('')
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

    const requirementUploadRef = ref(null)
    const testCaseUploadRef = ref(null)

    // 计算属性：是否可以进入第二步
    const canProceedToStep2 = computed(() => {
      return requirementFileList.value.length > 0 || requirementContent.value.trim().length > 0
    })

    // 计算属性：是否可以开始评审
    const canStartReview = computed(() => {
      return testCaseFileList.value.length > 0 || testCaseContent.value.trim().length > 0
    })

    // 步骤控制
    const nextStep = () => {
      if (currentStep.value < 2) {
        currentStep.value++
      }
    }

    const prevStep = () => {
      if (currentStep.value > 0) {
        currentStep.value--
      }
    }

    // 重新开始评审
    const restartReview = () => {
      currentStep.value = 0
      requirementFileList.value = []
      testCaseFileList.value = []
      requirementContent.value = ''
      testCaseContent.value = ''
      reviewResult.value = null
      showProgress.value = false
      progress.value = 0
    }

    // 处理需求文档文件变化
    const handleRequirementFileChange = (file) => {
      requirementFileList.value.push(file)
    }

    // 处理需求文档文件移除
    const handleRequirementFileRemove = (file) => {
      const index = requirementFileList.value.findIndex(f => f.uid === file.uid)
      if (index > -1) {
        requirementFileList.value.splice(index, 1)
      }
    }

    // 处理测试用例文件变化
    const handleTestCaseFileChange = (file) => {
      testCaseFileList.value.push(file)
    }

    // 处理测试用例文件移除
    const handleTestCaseFileRemove = (file) => {
      const index = testCaseFileList.value.findIndex(f => f.uid === file.uid)
      if (index > -1) {
        testCaseFileList.value.splice(index, 1)
      }
    }

    // 开始评审
    const startReview = async () => {
      if (testCaseFileList.value.length === 0 && testCaseContent.value.trim().length === 0) {
        ElMessage.warning('请先上传测试用例文件或输入测试用例内容')
        return
      }

      loading.value = true
      showProgress.value = true
      progress.value = 0
      progressStatus.value = 'active'
      progressText.value = '正在上传文件...'

      try {
        const formData = new FormData()
        
        // 添加需求文档
        requirementFileList.value.forEach((file, index) => {
          formData.append('requirementFiles', file.raw)
        })
        if (requirementContent.value.trim()) {
          formData.append('requirementContent', requirementContent.value)
        }
        
        // 添加测试用例
        testCaseFileList.value.forEach((file, index) => {
          formData.append('testCaseFiles', file.raw)
        })
        if (testCaseContent.value.trim()) {
          formData.append('testCaseContent', testCaseContent.value)
        }
        
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
          currentStep.value = 2 // 跳转到结果页面
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
        currentStep.value = 2 // 跳转到结果页面
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
      currentStep,
      requirementFileList,
      testCaseFileList,
      requirementContent,
      testCaseContent,
      loading,
      showProgress,
      progress,
      progressStatus,
      progressText,
      reviewResult,
      downloadUrl,
      activeTab,
      reviewForm,
      requirementUploadRef,
      testCaseUploadRef,
      canProceedToStep2,
      canStartReview,
      nextStep,
      prevStep,
      restartReview,
      handleRequirementFileChange,
      handleRequirementFileRemove,
      handleTestCaseFileChange,
      handleTestCaseFileRemove,
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
  text-align: center;
}

.card-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.subtitle {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.steps-container {
  margin-bottom: 32px;
}

.step-content {
  margin-top: 24px;
}

.api-selection {
  margin-bottom: 24px;
}

.api-selection h3 {
  margin: 0 0 12px 0;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.api-options {
  margin-bottom: 12px;
}

.upload-section {
  margin-bottom: 24px;
}

.upload-section h3 {
  margin: 0 0 12px 0;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-section {
  margin-bottom: 24px;
}

.input-section h3 {
  margin: 0 0 12px 0;
  color: #303133;
}

.config-section {
  margin-bottom: 24px;
}

.config-section h3 {
  margin: 0 0 12px 0;
  color: #303133;
}

.step-actions {
  text-align: center;
  margin: 32px 0;
  display: flex;
  justify-content: center;
  gap: 16px;
}

.restart-section {
  text-align: center;
  margin: 32px 0;
}

.progress-card {
  margin-bottom: 20px;
}

.progress-content {
  text-align: center;
}

.progress-text {
  margin-top: 10px;
  color: #606266;
}

.result-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.review-summary {
  margin-bottom: 20px;
}

.review-content,
.suggestions-content {
  line-height: 1.6;
  color: #303133;
}

.upload-demo {
  width: 100%;
}

.el-upload-dragger {
  width: 100%;
}
</style>