export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/transaction/index',
    'pages/commission/index',
    'pages/reconciliation/index',
    'pages/box-detail/index',
    'pages/match-records/index',
    'pages/transaction-detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2563EB',
    navigationBarTitleText: '盲盒寄售平台',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F8FAFC'
  },
  tabBar: {
    color: '#64748B',
    selectedColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '撮合大厅'
      },
      {
        pagePath: 'pages/transaction/index',
        text: '流水登记'
      },
      {
        pagePath: 'pages/commission/index',
        text: '阶梯抽成'
      },
      {
        pagePath: 'pages/reconciliation/index',
        text: '对账中心'
      }
    ]
  }
})
