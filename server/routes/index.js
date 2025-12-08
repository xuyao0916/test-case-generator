/**
 * 路由汇总模块
 */

module.exports = function(app) {
  // 加载各个路由模块
  require('./common')(app);
  require('./generate')(app);
  require('./api-test')(app);
  require('./step-by-step')(app);
  require('./review')(app);
  require('./wss')(app);
  require('./history')(app);
};

