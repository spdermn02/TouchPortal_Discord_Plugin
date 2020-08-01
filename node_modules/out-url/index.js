const { exec } = require('child_process');

const commands = (url) => {
  const { platform } = process;
  switch (platform) {
    case 'android':
    case 'linux':
      return `xdg-open ${url}`;
    case 'darwin':
      return `open ${url}`;
    case 'win32':
      return `cmd /c start ${url}`;
    default:
      throw new Error(`Platform ${platform} isn't supported.`);
  }
};

const open = url => new Promise((resolve, reject) => {
  exec(commands(url), (error, stdout, stderr) => {
    if (error) return reject(error);
    /* eslint-disable no-console */
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    return resolve('Done!');
  });
});

module.exports = { open };
