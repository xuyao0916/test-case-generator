<template>
  <div class="step-by-step-generator">
    <el-card class="main-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>分步骤测试用例生成</span>
          <el-icon><DocumentAdd /></el-icon>
        </div>
      </template>

      <!-- 步骤指示器 -->
      <el-steps :active="currentStep" align-center class="steps-indicator">
        <el-step title="需求分析" description="上传文件或输入需求内容" />
        <el-step title="需求补充" description="补充额外需求信息（可选）" />
        <el-step title="测试点确认" description="确认和编辑测试点" />
        <el-step title="生成测试用例" description="基于前面内容生成最终测试用例" />
      </el-steps>

      <!-- 步骤内容 -->
      <div class="step-content">
        <!-- 步骤1：需求分析 -->
        <div v-if="currentStep === 0" class="step-panel">
          <h3>步骤1：需求分析</h3>
          <p class="step-description">请上传需求文档或直接输入需求描述，系统将分析并提取关键信息。</p>
          
          <!-- API选择 -->
          <div class="api-selection">
            <h4>选择AI服务</h4>
            <el-radio-group v-model="selectedApi" class="api-radio-group">
              <el-radio-button label="cybotstar">Cybotstar AI</el-radio-button>
              <el-radio-button label="deepseek">DeepSeek AI</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 输入方式选择 -->
          <div class="input-mode-selection">
            <h4>输入方式</h4>
            <el-radio-group v-model="step1InputMode" class="mode-radio-group">
              <el-radio-button label="text">文本输入</el-radio-button>
              <el-radio-button label="file">文件上传</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 文本输入 -->
          <div v-if="step1InputMode === 'text'" class="text-input-area">
            <h4>需求描述</h4>
            <el-input
              v-model="step1TextInput"
              type="textarea"
              :rows="8"
              placeholder="请详细描述您的功能需求，包括：\n1. 功能概述\n2. 具体业务流程\n3. 输入输出要求\n4. 特殊约束条件\n\n例如：\n用户登录功能：\n- 支持用户名/邮箱登录\n- 密码长度6-20位\n- 登录失败3次锁定账户\n- 支持记住登录状态"
              class="text-input"
            />
          </div>

          <!-- 文件上传 -->
          <div v-if="step1InputMode === 'file'" class="file-upload-area">
            <h4>上传需求文档</h4>
            <el-upload
              ref="step1UploadRef"
              class="upload-demo"
              drag
              :auto-upload="false"
              :on-change="handleStep1FileChange"
              :on-remove="handleStep1FileRemove"
              :file-list="step1FileList"
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
                  支持格式：.txt, .md, .docx, .doc, .pdf, .xlsx, .xls, .json, .xml, .csv（最大10MB）
                </div>
              </template>
            </el-upload>
            
            <!-- 文件内容预览 -->
            <div v-if="step1FileContents.length > 0" class="file-contents-preview">
              <h4>文件内容预览</h4>
              <el-collapse v-model="step1ActiveFileNames">
                <el-collapse-item v-for="(fileContent, index) in step1FileContents" :key="index" :title="fileContent.fileName" :name="fileContent.fileName">
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
          </div>

          <!-- 需求分析结果 -->
          <div v-if="step1Result" class="analysis-result">
            <h4>需求分析结果</h4>
            <el-input
              v-model="step1Result"
              type="textarea"
              :rows="10"
              placeholder="需求分析结果将在这里显示，您可以编辑修改..."
              class="result-textarea"
            />
          </div>

          <!-- 步骤1操作按钮 -->
          <div class="step-actions">
            <el-button
              type="primary"
              :loading="step1Loading"
              @click="analyzeRequirements"
              :disabled="!canAnalyze"
            >
              <el-icon v-if="!step1Loading"><Magic /></el-icon>
              {{ step1Loading ? '分析中...' : '开始需求分析' }}
            </el-button>
            <el-button
              type="warning"
              :loading="step1Loading"
              @click="retryStep1"
              v-if="step1Failed"
            >
              <el-icon v-if="!step1Loading"><Refresh /></el-icon>
              {{ step1Loading ? '重试中...' : '重试' }}
            </el-button>
            <el-button
              type="success"
              @click="nextStep"
              :disabled="!step1Result"
            >
              下一步
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 步骤2：需求补充 -->
        <div v-if="currentStep === 1" class="step-panel">
          <h3>步骤2：需求补充（可选）</h3>
          <p class="step-description">您可以上传额外的文档或输入补充信息来完善需求分析。</p>
          
          <!-- 输入方式选择 -->
          <div class="input-mode-selection">
            <h4>补充方式</h4>
            <el-radio-group v-model="step2InputMode" class="mode-radio-group">
              <el-radio-button label="text">文本补充</el-radio-button>
              <el-radio-button label="file">文档补充</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 文本补充 -->
          <div v-if="step2InputMode === 'text'" class="text-input-area">
            <h4>补充说明</h4>
            <el-input
              v-model="step2TextInput"
              type="textarea"
              :rows="6"
              placeholder="请输入需要补充的需求信息，例如：\n- 特殊业务规则\n- 异常处理要求\n- 性能指标\n- 安全要求等"
              class="text-input"
            />
          </div>

          <!-- 文件补充 -->
          <div v-if="step2InputMode === 'file'" class="file-upload-area">
            <h4>上传补充文档</h4>
            <el-upload
              ref="step2UploadRef"
              class="upload-demo"
              drag
              :auto-upload="false"
              :on-change="handleStep2FileChange"
              :on-remove="handleStep2FileRemove"
              :file-list="step2FileList"
              accept=".txt,.md,.docx,.doc,.pdf,.xlsx,.xls,.json,.xml,.csv"
              :limit="10"
              multiple
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将补充文档拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持格式：.txt, .md, .docx, .doc, .pdf, .xlsx, .xls, .json, .xml, .csv（最大10MB）
                </div>
              </template>
            </el-upload>
            
            <!-- 文件内容预览 -->
            <div v-if="step2FileContents.length > 0" class="file-contents-preview">
              <h4>文件内容预览</h4>
              <el-collapse v-model="step2ActiveFileNames">
                <el-collapse-item v-for="(fileContent, index) in step2FileContents" :key="index" :title="fileContent.fileName" :name="fileContent.fileName">
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
          </div>

          <!-- 补充结果 -->
          <div v-if="step2Result" class="supplement-result">
            <h4>需求补充结果</h4>
            <el-input
              v-model="step2Result"
              type="textarea"
              :rows="8"
              placeholder="补充分析结果将在这里显示，您可以编辑修改..."
              class="result-textarea"
            />
          </div>

          <!-- 步骤2操作按钮 -->
          <div class="step-actions">
            <el-button @click="prevStep">
              <el-icon><ArrowLeft /></el-icon>
              上一步
            </el-button>
            <el-button
              type="primary"
              :loading="step2Loading"
              @click="supplementRequirements"
              :disabled="!canSupplement"
              v-if="hasSupplementContent"
            >
              <el-icon v-if="!step2Loading"><Magic /></el-icon>
              {{ step2Loading ? '分析中...' : '分析补充内容' }}
            </el-button>
            <el-button
              type="warning"
              :loading="step2Loading"
              @click="retryStep2"
              v-if="step2Failed && hasSupplementContent"
            >
              <el-icon v-if="!step2Loading"><Refresh /></el-icon>
              {{ step2Loading ? '重试中...' : '重试' }}
            </el-button>
            <el-button
              type="success"
              @click="nextStep"
            >
              下一步
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 步骤3：测试点确认 -->
        <div v-if="currentStep === 2" class="step-panel">
          <h3>步骤3：测试点确认</h3>
          <p class="step-description">基于需求分析结果，系统将生成测试点，您可以查看、编辑和补充。</p>
          
          <!-- 生成测试点 -->
          <div v-if="!step3Result" class="generate-test-points">
            <el-button
              type="primary"
              :loading="step3Loading"
              @click="generateTestPoints"
              size="large"
            >
              <el-icon v-if="!step3Loading"><Magic /></el-icon>
              {{ step3Loading ? '生成中...' : '生成测试点' }}
            </el-button>
          </div>

          <!-- 测试点编辑 -->
          <div v-if="step3Result" class="test-points-editor">
            <h4>测试点列表</h4>
            <p class="editor-tip">请检查并编辑测试点，确保覆盖所有重要的测试场景：</p>
            <el-input
              v-model="step3Result"
              type="textarea"
              :rows="12"
              placeholder="测试点将在这里显示，您可以编辑、添加或删除测试点..."
              class="test-points-textarea"
            />
          </div>

          <!-- 步骤3操作按钮 -->
          <div class="step-actions">
            <el-button @click="prevStep">
              <el-icon><ArrowLeft /></el-icon>
              上一步
            </el-button>
            <el-button
              type="primary"
              :loading="step3Loading"
              @click="generateTestPoints"
              v-if="!step3Result"
            >
              <el-icon v-if="!step3Loading"><Magic /></el-icon>
              {{ step3Loading ? '生成中...' : '重新生成测试点' }}
            </el-button>
            <el-button
              type="warning"
              :loading="step3Loading"
              @click="retryStep3"
              v-if="step3Failed"
            >
              <el-icon v-if="!step3Loading"><Refresh /></el-icon>
              {{ step3Loading ? '重试中...' : '重试' }}
            </el-button>
            <el-button
              type="success"
              @click="nextStep"
              :disabled="!step3Result"
            >
              下一步
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 步骤4：生成测试用例 -->
        <div v-if="currentStep === 3" class="step-panel">
          <h3>步骤4：生成测试用例</h3>
          <p class="step-description">基于前面的需求分析和测试点，生成完整的测试用例。</p>
          
          <!-- 生成测试用例 -->
          <div v-if="!finalResult" class="generate-test-cases">
            <el-button
              type="primary"
              :loading="finalLoading"
              @click="generateFinalTestCases"
              size="large"
            >
              <el-icon v-if="!finalLoading"><Magic /></el-icon>
              {{ finalLoading ? '生成中...' : '生成最终测试用例' }}
            </el-button>
          </div>

          <!-- 最终结果 -->
          <div v-if="finalResult" class="final-result">
            <div class="result-header">
              <h4>测试用例生成完成</h4>
              <div class="result-actions">
                <el-button
                  type="success"
                  @click="downloadResult"
                  :disabled="!downloadUrl"
                >
                  <el-icon><Download /></el-icon>
                  下载XMind文件
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
              <pre>{{ finalResult }}</pre>
            </div>
          </div>

          <!-- 步骤4操作按钮 -->
          <div class="step-actions">
            <el-button @click="prevStep">
              <el-icon><ArrowLeft /></el-icon>
              上一步
            </el-button>
            <el-button
              type="warning"
              :loading="finalLoading"
              @click="retryStep4"
              v-if="step4Failed"
            >
              <el-icon v-if="!finalLoading"><Refresh /></el-icon>
              {{ finalLoading ? '重试中...' : '重试' }}
            </el-button>
            <el-button
              type="primary"
              @click="resetAll"
            >
              <el-icon><Refresh /></el-icon>
              重新开始
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { UploadFilled, DocumentAdd, Magic, ArrowRight, ArrowLeft, Download, DocumentCopy, Refresh } from '@element-plus/icons-vue'

export default {
  name: 'StepByStepGenerator',
  components: {
    UploadFilled,
    DocumentAdd,
    Magic,
    ArrowRight,
    ArrowLeft,
    Download,
    DocumentCopy,
    Refresh
  },
  data() {
    return {
      currentStep: 0,
      selectedApi: 'cybotstar',
      
      // 步骤1数据
      step1InputMode: 'text',
      step1TextInput: '',
      step1FileList: [],
      step1UploadedFiles: [],
      step1FileContents: [],
      step1ActiveFileNames: [],
      step1Result: '',
      step1Loading: false,
      step1Failed: false,
      
      // 步骤2数据
      step2InputMode: 'text',
      step2TextInput: '',
      step2FileList: [],
      step2UploadedFiles: [],
      step2FileContents: [],
      step2ActiveFileNames: [],
      step2Result: '',
      step2Loading: false,
      step2Failed: false,
      
      // 步骤3数据
      step3Result: '',
      step3Loading: false,
      step3Failed: false,
      
      // 步骤4数据
      finalResult: '',
      finalLoading: false,
      step4Failed: false,
      downloadUrl: ''
    }
  },

  computed: {
    canAnalyze() {
      if (this.step1InputMode === 'text') {
        return this.step1TextInput.trim().length > 0
      } else {
        return this.step1UploadedFiles.length > 0
      }
    },
    canSupplement() {
      if (this.step2InputMode === 'text') {
        return this.step2TextInput.trim().length > 0
      } else {
        return this.step2UploadedFiles.length > 0
      }
    },
    hasSupplementContent() {
      return (this.step2InputMode === 'text' && this.step2TextInput.trim().length > 0) ||
             (this.step2InputMode === 'file' && this.step2UploadedFiles.length > 0)
    }
  },
  methods: {
    // 步骤导航
    nextStep() {
      if (this.currentStep < 3) {
        this.currentStep++
      }
    },
    prevStep() {
      if (this.currentStep > 0) {
        this.currentStep--
      }
    },
    
    // 步骤1：文件处理
    handleStep1FileChange(file) {
      this.step1UploadedFiles.push(file.raw)
      // 读取文件内容
      const reader = new FileReader()
      reader.onload = (e) => {
        const fileContent = {
          fileName: file.name,
          content: e.target.result
        }
        this.step1FileContents.push(fileContent)
        if (!this.step1ActiveFileNames.includes(file.name)) {
          this.step1ActiveFileNames.push(file.name)
        }
      }
      reader.readAsText(file.raw)
    },
    handleStep1FileRemove(file) {
      const index = this.step1UploadedFiles.findIndex(f => f.name === file.name)
      if (index > -1) {
        this.step1UploadedFiles.splice(index, 1)
      }
      // 移除文件内容
      const contentIndex = this.step1FileContents.findIndex(f => f.fileName === file.name)
      if (contentIndex > -1) {
        this.step1FileContents.splice(contentIndex, 1)
      }
      // 移除激活状态
      const nameIndex = this.step1ActiveFileNames.indexOf(file.name)
      if (nameIndex > -1) {
        this.step1ActiveFileNames.splice(nameIndex, 1)
      }
    },
    
    // 步骤2：文件处理
    handleStep2FileChange(file) {
      this.step2UploadedFiles.push(file.raw)
      // 读取文件内容
      const reader = new FileReader()
      reader.onload = (e) => {
        const fileContent = {
          fileName: file.name,
          content: e.target.result
        }
        this.step2FileContents.push(fileContent)
        if (!this.step2ActiveFileNames.includes(file.name)) {
          this.step2ActiveFileNames.push(file.name)
        }
      }
      reader.readAsText(file.raw)
    },
    handleStep2FileRemove(file) {
      const index = this.step2UploadedFiles.findIndex(f => f.name === file.name)
      if (index > -1) {
        this.step2UploadedFiles.splice(index, 1)
      }
      // 移除文件内容
      const contentIndex = this.step2FileContents.findIndex(f => f.fileName === file.name)
      if (contentIndex > -1) {
        this.step2FileContents.splice(contentIndex, 1)
      }
      // 移除激活状态
      const nameIndex = this.step2ActiveFileNames.indexOf(file.name)
      if (nameIndex > -1) {
        this.step2ActiveFileNames.splice(nameIndex, 1)
      }
    },
    
    // 步骤1：需求分析
    async analyzeRequirements() {
      this.step1Loading = true
      this.step1Failed = false
      try {
        const formData = new FormData()
        
        if (this.step1InputMode === 'text') {
          formData.append('textInput', this.step1TextInput)
        } else if (this.step1UploadedFiles.length > 0) {
          this.step1UploadedFiles.forEach(file => {
            formData.append('files', file)
          })
        }
        
        formData.append('apiProvider', this.selectedApi)
        formData.append('step', 'requirements_analysis')
        
        const response = await axios.post('/api/step-by-step/analyze', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        if (response.data.success) {
          this.step1Result = response.data.analysis
          this.step1Failed = false
          ElMessage.success('需求分析完成')
        } else {
          throw new Error(response.data.error || '需求分析失败')
        }
      } catch (error) {
        console.error('需求分析失败:', error)
        this.step1Failed = true
        // 显示服务器返回的具体错误信息
        const errorMessage = error.response?.data?.error || error.message || '生成失败，请重新尝试生成'
        ElMessage.error(errorMessage)
        // 不再设置兜底数据，保持step1Result为空
      } finally {
        this.step1Loading = false
      }
    },
    
    // 步骤2：需求补充
    async supplementRequirements() {
      this.step2Loading = true
      this.step2Failed = false
      try {
        const formData = new FormData()
        
        if (this.step2InputMode === 'text') {
          formData.append('supplementText', this.step2TextInput)
        } else if (this.step2UploadedFiles.length > 0) {
          this.step2UploadedFiles.forEach(file => {
            formData.append('files', file)
          })
        }
        
        formData.append('apiProvider', this.selectedApi)
        formData.append('originalAnalysis', this.step1Result)
        
        const response = await axios.post('/api/step-by-step/supplement', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        if (response.data.success) {
          this.step2Result = response.data.updatedAnalysis
          this.step2Failed = false
          ElMessage.success('需求补充完成')
        } else {
          throw new Error(response.data.error || '需求补充失败')
        }
      } catch (error) {
        console.error('需求补充失败:', error)
        this.step2Failed = true
        // 显示服务器返回的具体错误信息
        const errorMessage = error.response?.data?.error || error.message || '生成失败，请重新尝试生成'
        ElMessage.error(errorMessage)
        // 不再设置兜底数据，保持step2Result为空
      } finally {
        this.step2Loading = false
      }
    },
    
    // 步骤3：生成测试点
    async generateTestPoints() {
      this.step3Loading = true
      this.step3Failed = false
      try {
        const allRequirements = this.step1Result + (this.step2Result ? '\n\n' + this.step2Result : '')
        
        const response = await axios.post('/api/step-by-step/test-points', {
          analysisContent: allRequirements,
          apiProvider: this.selectedApi
        })
        
        if (response.data.success) {
          this.step3Result = response.data.testPoints
          this.step3Failed = false
          ElMessage.success('测试点生成完成')
        } else {
          throw new Error(response.data.error || '测试点生成失败')
        }
      } catch (error) {
        console.error('测试点生成失败:', error)
        this.step3Failed = true
        // 显示服务器返回的具体错误信息
        const errorMessage = error.response?.data?.error || error.message || '生成失败，请重新尝试生成'
        ElMessage.error(errorMessage)
        // 不再设置兜底数据，保持step3Result为空
      } finally {
        this.step3Loading = false
      }
    },
    
    // 步骤4：生成最终测试用例
    async generateFinalTestCases() {
      this.finalLoading = true
      this.step4Failed = false
      try {
        const allRequirements = this.step1Result + (this.step2Result ? '\n\n' + this.step2Result : '')
        
        const response = await axios.post('/api/step-by-step/generate-final', {
          analysisContent: allRequirements,
          testPoints: this.step3Result,
          apiProvider: this.selectedApi
        })
        
        if (response.data.success) {
          this.finalResult = response.data.content
          this.downloadUrl = `/api/download/${response.data.filename}`
          this.step4Failed = false
          ElMessage.success('测试用例生成完成')
        } else {
          throw new Error(response.data.error || '测试用例生成失败')
        }
      } catch (error) {
        console.error('测试用例生成失败:', error)
        this.step4Failed = true
        // 显示服务器返回的具体错误信息
        const errorMessage = error.response?.data?.error || error.message || '生成失败，请重新尝试生成'
        ElMessage.error(errorMessage)
        // 不再设置兜底数据，保持finalResult为空
      } finally {
        this.finalLoading = false
      }
    },
    
    // 下载结果
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
        link.download = `test-cases-${new Date().getTime()}.xmind`
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
    
    // 复制到剪贴板
    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.finalResult)
        ElMessage.success('内容已复制到剪贴板')
      } catch (error) {
        console.error('复制失败:', error)
        ElMessage.error('复制失败，请手动复制')
      }
    },
    
    // 重置所有数据
    resetAll() {
      this.currentStep = 0
      this.step1TextInput = ''
      this.step1FileList = []
      this.step1UploadedFiles = []
      this.step1FileContents = []
      this.step1ActiveFileNames = []
      this.step1Result = ''
      this.step1Failed = false
      this.step2TextInput = ''
      this.step2FileList = []
      this.step2UploadedFiles = []
      this.step2FileContents = []
      this.step2ActiveFileNames = []
      this.step2Result = ''
      this.step2Failed = false
      this.step3Result = ''
      this.step3Failed = false
      this.finalResult = ''
      this.step4Failed = false
      this.downloadUrl = ''
      ElMessage.success('已重置所有内容')
    },

    // 重试方法
    retryStep1() {
      this.analyzeRequirements()
    },

    retryStep2() {
      this.supplementRequirements()
    },

    retryStep3() {
      this.generateTestPoints()
    },

    retryStep4() {
      this.generateFinalTestCases()
    }
  }
}
</script>

<style scoped>
.step-by-step-generator {
  padding: 20px;
}

.main-card {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
}

.steps-indicator {
  margin: 30px 0;
}

.step-content {
  min-height: 500px;
  padding: 20px 0;
}

.step-panel {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.step-description {
  color: #666;
  margin-bottom: 20px;
  line-height: 1.6;
}

.api-selection,
.input-mode-selection {
  margin-bottom: 20px;
}

.api-selection h4,
.input-mode-selection h4 {
  margin-bottom: 10px;
  color: #333;
}

.api-radio-group,
.mode-radio-group {
  margin-bottom: 10px;
}

.api-notice {
  margin-top: 10px;
}

.api-notice .el-alert {
  border-radius: 6px;
}

.text-input-area,
.file-upload-area {
  margin-bottom: 20px;
}

.text-input,
.result-textarea,
.test-points-textarea {
  margin-top: 10px;
}

.upload-demo {
  margin-top: 10px;
}

.analysis-result,
.supplement-result,
.test-points-editor {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.generate-test-points,
.generate-test-cases {
  text-align: center;
  padding: 40px 0;
}

.final-result {
  margin-top: 20px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e9ecef;
}

.result-actions {
  display: flex;
  gap: 10px;
}

.result-content {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  max-height: 500px;
  overflow-y: auto;
}

.result-content pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.step-actions {
  margin-top: 30px;
  text-align: center;
  display: flex;
  justify-content: center;
  gap: 15px;
}

.editor-tip {
  color: #666;
  font-size: 14px;
  margin-bottom: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .step-by-step-generator {
    padding: 10px;
  }
  
  .result-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .result-actions {
    width: 100%;
    justify-content: flex-start;
  }
  
  .step-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
