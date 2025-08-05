<template>
  <div id="app">
    <el-container>
      <el-header class="header">
        <h1>测试用例自动生成平台</h1>
      </el-header>
      <el-container>
        <el-aside width="200px" class="sidebar">
          <el-menu
            :default-active="$route.path"
            router
            class="sidebar-menu"
            background-color="#f5f7fa"
            text-color="#606266"
            active-text-color="#409EFF"
          >
            <el-menu-item index="/">
              <el-icon><DocumentAdd /></el-icon>
              <span>用例生成</span>
            </el-menu-item>
            <el-menu-item index="/history">
              <el-icon><Clock /></el-icon>
              <span>生成记录</span>
            </el-menu-item>
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
import { DocumentAdd, Clock } from '@element-plus/icons-vue'

export default {
  name: 'App',
  components: {
    DocumentAdd,
    Clock
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
  height: 50px;
  line-height: 50px;
  margin: 5px 10px;
  border-radius: 8px;
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

</style>