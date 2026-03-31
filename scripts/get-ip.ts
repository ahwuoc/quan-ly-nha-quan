import { networkInterfaces } from 'os';

function getLocalIp() {
  const interfaces = networkInterfaces();
  const results: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        results.push(iface.address);
      }
    }
  }

  return results;
}

const ips = getLocalIp();

if (ips.length === 0) {
  console.log('No local IP address found.');
} else {
  console.log('\n🚀 Local Network IPs:');
  ips.forEach((ip) => {
    console.log(`- http://${ip}:3000`);
  });
  console.log('\nUse these to access the app from other devices (mobile, tablet, etc.)\n');
}
