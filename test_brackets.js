const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('./node_modules/ws');

const chromeProcess = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless',
  '--remote-debugging-port=9223',
  '--disable-gpu',
  'http://localhost:3000/'
]);

setTimeout(() => {
  http.get('http://127.0.0.1:9223/json/list', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const targets = JSON.parse(data);
      const target = targets.find(t => t.url.includes('localhost:3000'));
      if (!target) {
        chromeProcess.kill();
        process.exit(1);
      }
      
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      ws.on('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 4, method: 'Page.enable' }));
        ws.send(JSON.stringify({ id: 10, method: 'Runtime.evaluate', params: { expression: '1' } }));
      });
      
      ws.on('message', (message) => {
        const msg = JSON.parse(message);
        
        if (msg.id === 10) {
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 30,
              method: 'Runtime.evaluate',
              params: {
                expression: `
                  (function() {
                    const supportSelect = document.getElementById('select-support');
                    if (supportSelect) {
                      supportSelect.value = 'TH';
                      supportSelect.dispatchEvent(new Event('change'));
                      
                      setTimeout(() => {
                        const cuvesSelect = document.getElementById('select-cuves');
                        cuvesSelect.value = '3';
                        cuvesSelect.dispatchEvent(new Event('change'));
                      }, 1000);
                      
                      return 'TRIGGERED';
                    }
                    return 'WAIT';
                  })()
                `
              }
            }));
          }, 500);
        }
        
        if (msg.id === 30) {
          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 50,
              method: 'Runtime.evaluate',
              params: {
                expression: `
                  (function() {
                    let output = '';
                    if (!window.extraBrackets) return 'NO BRACKETS';
                    output += 'Brackets after setting 3 cuves: ' + window.extraBrackets.length + '\\n';
                    
                    // Force slider input
                    const slider = document.getElementById('slider-length');
                    if(slider) {
                        slider.value = 237;
                        slider.dispatchEvent(new Event('input'));
                        output += 'Triggered slider length\\n';
                    }
                    
                    output += 'Brackets after slider move: ' + window.extraBrackets.length + '\\n';
                    return output;
                  })()
                `
              }
            }));
          }, 2500);
        }
        
        if (msg.id === 50) {
          const val = msg.result?.result?.value;
          console.log("Console result:", val, msg);
          ws.close();
          chromeProcess.kill();
          process.exit(0);
        }
      });
    });
  });
}, 2000);
