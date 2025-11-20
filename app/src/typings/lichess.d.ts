declare module 'passport-lichess' {
  import { Strategy } from 'passport-oauth2';
  
  class LichessStrategy extends Strategy {
    constructor(options: any, verify: any);

    authenticate(req: express.Request, options?: object): void;
  }
  
  export default LichessStrategy;
}