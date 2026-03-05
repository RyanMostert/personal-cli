
async function run() {
  const url = 'https://music.youtube.com/watch?v=RXT5OvdtTT0&list=RDAMVMRXT5OvdtTT0';
  console.log('Fetching ' + url);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const res = await fetch(url, {
      headers: { 
        'User-Agent': 'personal-cli/0.1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Length:', text.length);
    console.log('Preview:', text.slice(0, 200));
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
