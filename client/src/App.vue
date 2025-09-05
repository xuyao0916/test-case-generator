<template>
  <div id="app">
    <el-container>
      <el-header class="header">
        <h1>测试用例自动生成平台</h1>
      </el-header>
      <el-container>
        <el-aside width="220px" class="sidebar">
          <el-menu
            :default-active="$route.path"
            router
            class="sidebar-menu"
            background-color="#f5f7fa"
            text-color="#606266"
            active-text-color="#409EFF"
            :default-openeds="['functional', 'review', 'converter', 'api']"
          >
            <el-sub-menu index="functional">
              <template #title>
                <el-icon><Tools /></el-icon>
                <span>功能测试</span>
              </template>
              <el-menu-item index="/functional/generate">
                <el-icon><DocumentAdd /></el-icon>
                <span>快速生成</span>
              </el-menu-item>
              <el-menu-item index="/functional/step-by-step">
                <el-icon><Operation /></el-icon>
                <span>分步骤生成</span>
              </el-menu-item>
              <el-menu-item index="/functional/history">
                <el-icon><Clock /></el-icon>
                <span>生成记录</span>
              </el-menu-item>
            </el-sub-menu>
            
            <el-sub-menu index="review">
              <template #title>
                <el-icon><Search /></el-icon>
                <span>评审模块</span>
              </template>
              <el-menu-item index="/review/testcase">
                <el-icon><DocumentCheck /></el-icon>
                <span>用例评审</span>
              </el-menu-item>
              <el-menu-item index="/review/requirement">
                <el-icon><Document /></el-icon>
                <span>需求评审</span>
              </el-menu-item>
            </el-sub-menu>
            
            <el-sub-menu index="converter">
               <template #title>
                 <el-icon><SwitchIcon /></el-icon>
                 <span>格式转换</span>
               </template>
              <el-menu-item index="/converter/format">
                <el-icon><Upload /></el-icon>
                <span>格式转换</span>
              </el-menu-item>
            </el-sub-menu>
            
            <el-sub-menu index="api">
              <template #title>
                <el-icon><Connection /></el-icon>
                <span>接口测试</span>
              </template>
              <el-menu-item index="/api/test">
                <el-icon><Position /></el-icon>
                <span>接口测试</span>
              </el-menu-item>
              <el-menu-item index="/api/generate">
                <el-icon><Magic /></el-icon>
                <span>用例生成</span>
              </el-menu-item>
              <el-menu-item index="/api/docs">
                <el-icon><Document /></el-icon>
                <span>API文档</span>
              </el-menu-item>
            </el-sub-menu>
          </el-menu>
        </el-aside>
        <el-main>
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script>
import { DocumentAdd, Clock, Tools, Connection, Position, Document, Magic, Switch as SwitchIcon, Upload, Operation, Search, DocumentCheck } from '@element-plus/icons-vue'

export default {
  name: 'App',
  components: {
    DocumentAdd,
    Clock,
    Tools,
    Connection,
    Position,
    Document,
    Magic,
    SwitchIcon,
    Upload,
    Operation,
    Search,
    DocumentCheck
  }
}
</script>

<style>
#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

body {
  margin: 0;
  padding: 0;
  background: #f5f7fa;
}

.sidebar {
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
}

.sidebar-menu {
  border-right: none;
  height: 100%;
}

.sidebar-menu .el-menu-item {
  height: 45px;
  line-height: 45px;
  margin: 2px 8px;
  border-radius: 6px;
}

.sidebar-menu .el-sub-menu .el-menu-item {
  height: 40px;
  line-height: 40px;
  margin: 2px 12px;
  padding-left: 40px !important;
}

.sidebar-menu .el-menu-item:hover {
  background-color: #ecf5ff;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: #409EFF;
  color: white;
}

.sidebar-menu .el-menu-item.is-active .el-icon {
  color: white;
}

.sidebar-menu .el-sub-menu__title {
  height: 50px;
  line-height: 50px;
  margin: 5px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.sidebar-menu .el-sub-menu__title:hover {
  background-color: #ecf5ff;
}

.sidebar-menu .el-sub-menu.is-opened .el-sub-menu__title {
  background-color: #e6f7ff;
}

</style>