import path from 'node:path';
import { createLocalPanelHttpServer } from './server.js';
import { LocalPanelMvpService } from './service.js';

const port = Number(process.env.PORT ?? 4100);
const host = process.env.HOST ?? '127.0.0.1';
const dataDir =
  process.env.GARVIX_DATA_DIR ??
  (process.platform === 'linux'
    ? '/var/lib/garvix-panel'
    : path.join(process.cwd(), '.garvix-data'));

const service = new LocalPanelMvpService({
  cleanSlate: true,
  stateFilePath: path.join(dataDir, 'panel-state.json'),
});

const { server } = createLocalPanelHttpServer(service, {
  cleanSlate: true,
  dataDir,
});

server.listen(port, host, () => {
  console.log(
    JSON.stringify({
      level: 'info',
      service: 'garvix-local-panel-api',
      version: '1.0.0',
      url: `http://${host}:${port}`,
      whmUrl: `http://${host}:${port}/whm`,
      dataDir,
      healthEndpoint: `http://${host}:${port}/api/v1/health`,
      isMockData: false,
      message: 'Garvix Control Panel Software API & Web Portal listening.',
    })
  );
});

