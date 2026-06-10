import http from 'http';
http.get('http://localhost:3001/api/health', (res) => {
  let body = '';
  res.on('data', (c) => body += c);
  res.on('end', () => { console.log('HEALTH:', body); process.exit(0); });
}).on('error', (e) => { console.error('ERR', e.message); process.exit(1); });
