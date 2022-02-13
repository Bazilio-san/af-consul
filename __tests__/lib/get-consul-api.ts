import 'dotenv/config';
import * as _ from 'lodash';
import { logger } from './logger';
import { getAPI } from '../../src';
import { IAFConsulAPI } from '../../src/interfaces';

const config = require('../config');

export default async ({ instanceSuffix, agentHost, serviceName }: {
  instanceSuffix?: string, agentHost?: string, serviceName?: string
} = {}): Promise<IAFConsulAPI> => {
  const config_ = _.cloneDeep(config);
  if (instanceSuffix) {
    config_.consul.service.instance += instanceSuffix;
  } else {
    config_.consul.service.instance = config.consul.service.instance;
  }
  if (agentHost) {
    config_.consul.agent.reg.host = agentHost;
  }
  if (serviceName) {
    config_.consul.service.name = serviceName;
  }
  return getAPI(
    {
      config: config_,
      logger,
      projectId: process.env.PROJECT_ID || 'proj',
    },
  );
};
