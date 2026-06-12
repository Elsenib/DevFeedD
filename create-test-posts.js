// Test Posts Oluştur
const fetch = require('node-fetch');

const API_URL = 'http://localhost:4000';


const testPosts = [
  {
    title: 'GitHub Commit: DevFeed Release',
    caption: 'Yeni feature əlavə edildi',
    body: 'Authentication səhifəsi tamamlandı, login/register/onboarding flow işləyir.',
    post_type: 'GIT',
    metadata: { repo: 'github.com/user/devfeed', commit: 'abc1234' },
    tags: ['github', 'devfeed', 'release']
  },
  {
    title: 'Production Deploy: v1.0.0',
    caption: 'Live deployment completed',
    body: 'DevFeed v1.0.0 production-a deploy edildi. Database migrations tamamlandı.',
    post_type: 'DEPLOY',
    metadata: { status: 'success', environment: 'production' },
    tags: ['deploy', 'production']
  },
  {
    title: 'New Feature: FeedScreen',
    caption: 'Post kartları, like, bookmark, comment',
    body: 'FeedScreen component React Native-də quruldu. Real-time updates hazırdır.',
    post_type: 'TEXT',
    tags: ['feature', 'feedscreen', 'react-native']
  },
  {
    title: 'Senior Developer Vacancies',
    caption: '3+ years experience required',
    body: 'DevFeed platformasının genişləndirilməsi üçün experinced developer tələb olunur.',
    post_type: 'JOB',
    metadata: { title: 'Senior Full Stack Developer', company: 'TechCorp AZ', salary: '5000-7000 AZN' },
    tags: ['jobs', 'fullstack', 'senior']
  }
];

(async () => {
  try {
    // Əvvəl login et
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test+ui@local.test', password: 'pass1234' })
    });

    if (!loginRes.ok) {
      console.error('Login failed:', loginRes.status);
      return;
    }

    const { token } = await loginRes.json();
    console.log('✅ Login successful');

    // Post-ları yarat
    for (const post of testPosts) {
      const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(post)
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`✅ Post created: ${post.title} (ID: ${data.id})`);
      } else {
        console.error(`❌ Failed to create post: ${post.title}`, res.status);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
