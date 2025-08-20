const { exec } = require('child_process');

// Change to the project directory
process.chdir('folderflow-backend');

// Run migrate-to-cold.js every hour
setInterval(() => {
  exec('node migrate-to-cold.js', (err, stdout, stderr) => {
    if (err) {
      console.error('Migration error:', err);
      return;
    }
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  });
}, 60 * 60 * 1000); // 1 hour

console.log('Automatic hot-to-cold migration scheduled every hour.');

// Keep process alive for PM2
process.stdin.resume();
exec('pm2 start migrate-to-cold-cron.js --name folderflow-migration', (err, stdout, stderr) => {
  if (err) {
    console.error('Error starting migration with pm2:', err);
    return;
  }
  if (stdout) console.log('pm2 output:', stdout);
  if (stderr) console.error('pm2 error:', stderr);
});
