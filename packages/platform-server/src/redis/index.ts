/*
Copyright 2022 ByteDance and/or its affiliates.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import RedisImpl from '@infra-node/redis'
import { Global, Module, FactoryProvider } from '@nestjs/common'
import Redis from 'ioredis'
import Redlock from 'redlock'

import { Config } from '../config'

const RedisProvider: FactoryProvider = {
  provide: Redis,
  useFactory: (config: Config) => {
    return new RedisImpl({
      ...config.redis,
      enableReadyCheck: false,
      kconfEnv: config.dev ? 'staging' : 'prod',
    })
  },
  inject: [Config],
}

const RedlockProvider: FactoryProvider = {
  provide: Redlock,
  useFactory: (redis: Redis) => {
    // see https://github.com/mike-marcacci/node-redlock
    // @ts-expect-error
    return new Redlock([redis])
  },
  inject: [Redis],
}

@Global()
@Module({
  providers: [RedisProvider, RedlockProvider],
  exports: [Redis, Redlock],
})
export class RedisModule {}

export { Redis }

export { Redlock }
