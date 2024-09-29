const fs = require('fs');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const readline = require('readline');

function displayWelcomeMessage() {
    const welcomeMessage = `#### ##  ### ###  ### ##   ##   ##    ####   ###  ##  #### ##   ## ##   ### ##   
# ## ##   ##  ##   ##  ##   ## ##      ##      ## ##  # ## ##  ##   ##   ##  ##  
  ##      ##       ##  ##  # ### #     ##     # ## #    ##     ##   ##   ##  ##  
  ##      ## ##    ## ##   ## # ##     ##     ## ##     ##     ##   ##   ## ##   
  ##      ##       ## ##   ##   ##     ##     ##  ##    ##     ##   ##   ## ##   
  ##      ##  ##   ##  ##  ##   ##     ##     ##  ##    ##     ##   ##   ##  ##  
 ####    ### ###  #### ##  ##   ##    ####   ###  ##   ####     ## ##   #### ##  
                                                                                 
`;
    console.log('\x1b[31m%s\x1b[0m', welcomeMessage);
    console.log('\x1b[36m%s\x1b[0m', 'Created By Terminator');
}

async function askToCheckProxies() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('Do you want to check proxies? (yes/no): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase());
        });
    });
}

function maskProxy(proxy) {
    const parts = proxy.split(/[:@]/);
    const maskedParts = [];
    if (parts.length === 4) {
        maskedParts.push(parts[0] + '://');
        maskedParts.push('*****:*****@');
        maskedParts.push(parts[2]);
        maskedParts.push(parts[3]);
    } else if (parts.length === 3) {
        maskedParts.push(parts[0] + '://');
        maskedParts.push(parts[1]);
        maskedParts.push(parts[2]);
    }
    return maskedParts.join('');
}

function ensureFilesExist() {
    const proxyFilePath = 'proxy.txt';
    const aliveFilePath = 'alive.txt';
    const deadFilePath = 'dead.txt';

    if (!fs.existsSync(proxyFilePath)) {
        console.log('Proxy file not found. Creating proxy.txt...');
        fs.writeFileSync(proxyFilePath, '');
        console.log('Created proxy.txt');
    }

    if (!fs.existsSync(aliveFilePath)) {
        fs.writeFileSync(aliveFilePath, '');
    }

    if (!fs.existsSync(deadFilePath)) {
        fs.writeFileSync(deadFilePath, '');
    }
}

function countdownTimer(seconds) {
    const interval = setInterval(() => {
        console.log(`Exiting in ${seconds} seconds...`);
        seconds -= 1;
        if (seconds < 0) {
            clearInterval(interval);
            process.exit();
        }
    }, 1000);
}

async function main() {
    ensureFilesExist();

    fs.readFile('proxy.txt', 'utf8', async (err, data) => {
        if (err) {
            console.error('Error reading proxies.txt:', err);
            return;
        }

        const proxies = data.split('\n').filter(proxy => proxy.trim() !== '');
        
        if (proxies.length === 0) {
            console.log('No proxies found in proxies.txt. Exiting...');
            countdownTimer(10);
            return;
        }

        const aliveProxies = [];
        const deadProxies = [];

        async function checkProxy(proxy) {
            const agent = new HttpsProxyAgent('http://' + proxy);
            try {
                const response = await axios.get('https://httpbin.org/ip', {
                    httpsAgent: agent,
                    timeout: 5000,
                });
                console.log(`Alive: ${maskProxy(proxy)}`);
                return proxy;
            } catch (error) {
                console.error(`Dead: ${maskProxy(proxy)} - ${error.message}`);
                return null;
            }
        }

        const userResponse = await askToCheckProxies();
        if (userResponse === 'no') {
            console.log('Exiting the program. Goodbye!');
            return;
        }

        const checkPromises = proxies.map(checkProxy);
        
        const results = await Promise.all(checkPromises);
        
        results.forEach(proxy => {
            if (proxy) {
                aliveProxies.push(proxy);
            } else {
                deadProxies.push(proxy);
            }
        });

        fs.writeFile('alive.txt', aliveProxies.join('\n'), (err) => {
            if (err) {
                console.error('Error writing alive.txt:', err);
            } else {
                console.log('Alive proxies saved to alive.txt');
            }
        });

        fs.writeFile('dead.txt', deadProxies.filter(p => p !== null).join('\n'), (err) => {
            if (err) {
                console.error('Error writing dead.txt:', err);
            } else {
                console.log('Dead proxies saved to dead.txt');
            }
        });
    });
}

displayWelcomeMessage();
main();
