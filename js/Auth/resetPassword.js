document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('resetPasswordForm');
    const errorDiv = document.getElementById('errorMessage');

    // 从 URL 获取 token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        errorDiv.textContent = '无效的重置链接';
        errorDiv.classList.remove('hidden');
        form.style.display = 'none';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            errorDiv.textContent = '两次输入的密码不匹配';
            errorDiv.classList.remove('hidden');
            return;
        }

        try {
            const response = await fetch('https://api.thinkboxs.com/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    newPassword
                })
            });

            if (!response.ok) {
                throw new Error('密码重置失败');
            }

            // 重置成功
            errorDiv.textContent = '密码重置成功！正在跳转到登录页面...';
            errorDiv.style.color = 'green';
            errorDiv.classList.remove('hidden');

            // 3秒后跳转到登录页面
            setTimeout(() => {
                window.location.href = '/html/newAuth.html';
            }, 3000);

        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
        }
    });
});
