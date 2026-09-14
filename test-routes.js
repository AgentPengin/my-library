const http = require('http');

async function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, length: data.length });
      });
    }).on('error', reject);
  });
}

async function runTests() {
  const routes = [
    '/',
    '/shelves',
    '/shelves/shelf-1',
    '/books/book_google_9780743273565',
    '/movies/movie_tmdb_157336',
    '/search',
    '/search?q=gatsby',
    '/login',
    '/register'
  ];

  console.log('--- BẮT ĐẦU KIỂM TRA TẤT CẢ CÁC TRANG EJS ---');
  let allPassed = true;

  for (const route of routes) {
    try {
      const res = await testEndpoint(route);
      if (res.status === 200) {
        console.log(`✅ [200 OK] ${route} (${res.length} bytes)`);
      } else {
        console.error(`❌ [${res.status}] ${route}`);
        allPassed = false;
      }
    } catch (err) {
      console.error(`❌ [ERROR] ${route}:`, err.message);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('\n🎉 TẤT CẢ CÁC TRANG ĐÃ ĐƯỢC RENDER HOÀN HẢO!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Chạy test sau 1.5 giây khi server đã khởi động
setTimeout(runTests, 1500);
