// activity.js

// 从 localStorage 获取 JWT Token
const token = localStorage.getItem('jwtToken');

// 检查 token 是否存在，如果不存在，提示用户登录
if (!token) {
    alert('Please log in first.');
    window.location.href = '../html/adminAuth.html';  // 跳转到登录页面
} else {
    // 发送请求时附加 Authorization 头
    fetch('https://api.thinkboxs.com/activity/activity-stats', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`  // 传递 Token
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch activity stats');
        }
        return response.json();
    })
    .then(data => {
        console.log('Activity Stats:', data);
        // 在这里处理返回的数据，更新页面的内容
    })
    .catch(error => {
        console.error('Error fetching activity stats:', error);
    });
}
