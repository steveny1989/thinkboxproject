// 从 localStorage 获取 JWT Token
const token = localStorage.getItem('jwtToken');

// 检查 token 是否存在
if (!token) {
    alert('请先登录');
    window.location.href = '../html/adminAuth.html';
} else {
    // 初始化 DataTable
    const table = $('#usersTable').DataTable({
        responsive: true,
        language: {
            "url": "//cdn.datatables.net/plug-ins/1.10.25/i18n/Chinese.json"
        },
        columns: [
            { data: 'id' },
            { data: 'username' },
            { data: 'email' },
            { 
                data: 'created_at',
                render: function(data) {
                    return new Date(data).toLocaleString();
                }
            },
            { 
                data: 'last_login',
                render: function(data) {
                    return data ? new Date(data).toLocaleString() : '从未登录';
                }
            },
            { 
                data: 'notes_count',
                title: '笔记数量'
            }
        ]
    });

    // 获取活动统计数据
    fetch('https://api.thinkboxs.com/activity/activity-stats', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('获取统计数据失败');
        }
        return response.json();
    })
    .then(data => {
        // 更新统计卡片
        document.getElementById('totalUsers').textContent = data.totalNotes || 0;
        document.getElementById('activeUsers').textContent = data.activeUsers || 0;
        document.getElementById('newUsers').textContent = 
            Math.round(data.avgNotesPerUser * 100) / 100 || 0; // 保留两位小数

        // 如果有Chart.js，可以添加趋势图
        if (data.userLoginTrend) {
            createLoginTrendChart(data.userLoginTrend);
        }
    })
    .catch(error => {
        console.error('Error fetching activity stats:', error);
    });

    // 获取用户列表数据
    fetch('https://api.thinkboxs.com/users/list', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('获取用户列表失败');
        }
        return response.json();
    })
    .then(data => {
        // 更新表格数据
        table.clear().rows.add(data).draw();
    })
    .catch(error => {
        console.error('Error fetching user list:', error);
        alert('加载用户数据失败，请稍后重试');
    });
}

// 创建登录趋势图表
function createLoginTrendChart(trendData) {
    const ctx = document.getElementById('loginTrendChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.map(item => item.login_date),
            datasets: [{
                label: '每日登录用户数',
                data: trendData.map(item => item.login_count),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
} 
