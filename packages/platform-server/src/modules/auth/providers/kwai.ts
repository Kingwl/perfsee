import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import fetch from 'node-fetch'
import qs from 'query-string'

import { Config } from '@perfsee/platform-server/config'

import { ExternalAccountUser, OAuthProvider } from './provider'

export interface UserInfo {
  mail: string
  avatar: string
  name: string
  id: string
  displayName: string
}

@Injectable()
export class KwaiOAuthProvider extends OAuthProvider {
  constructor(protected readonly globalConfig: Config) {
    super()
  }

  get config() {
    return this.globalConfig.auth.oauthProviders.kwai!
  }

  getAuthUrl(state?: string): string {
    return `${this.config.authorizationUri || 'https://sso.corp.kuaishou.com/cas/oauth2.0/authorize'}?${qs.stringify(
      {
        client_id: this.config.clientId,
        redirect_uri: this.redirectUri,
        state: state,
        ...this.config.args,
      },
      { encode: true },
    )}`
  }
  async getToken(code: string): Promise<string> {
    const url = qs.stringifyUrl({
      url: this.config.accessTokenUri || 'https://sso.corp.kuaishou.com/cas/oauth2.0/accessToken',
      query: {
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      },
    })

    const body = qs.stringify({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    })

    try {
      const response = await fetch(url, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      if (response.ok) {
        const text = await response.text()
        const searchParams = new URLSearchParams(text)
        const accessToken = searchParams.get('access_token')
        if (!accessToken) {
          throw new Error(`Failed to get access_token, text: ${text}`)
        }

        return accessToken
      } else {
        throw new Error(
          `Server responded with non-success code ${response.status}, ${JSON.stringify(await response.json())}`,
        )
      }
    } catch (e) {
      throw new HttpException(`Failed to get access_token, err: ${(e as Error).message}`, HttpStatus.BAD_REQUEST)
    }
  }
  async getUser(token: string): Promise<ExternalAccountUser> {
    try {
      const url = qs.stringifyUrl({
        url: this.config.userInfoUri || 'https://sso.corp.kuaishou.com/cas/oauth2.0/profile',
        query: {
          access_token: token,
        },
      })

      const response = await fetch(url, {
        method: 'GET',
      })
      if (response.ok) {
        const user = (await response.json()) as UserInfo

        return {
          username: user.name,
          avatarUrl: user.avatar,
          email: user.mail,
        }
      } else {
        throw new Error(`Server responded with non-success code ${response.status} ${await response.text()}`)
      }
    } catch (e) {
      throw new HttpException(`Failed to get user information, err: ${(e as Error).stack}`, HttpStatus.BAD_REQUEST)
    }
  }
}
