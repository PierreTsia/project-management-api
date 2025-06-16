import { CustomLogger } from '../../common/services/logger.service';

export class MockCustomLogger extends CustomLogger {
  setContext = jest.fn();
  log = jest.fn();
  error = jest.fn();
  warn = jest.fn();
  debug = jest.fn();
  verbose = jest.fn();
}
