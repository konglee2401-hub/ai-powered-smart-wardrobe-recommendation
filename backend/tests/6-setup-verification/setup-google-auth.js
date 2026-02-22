#!/usr/bin/env node

/**
 * Setup Google Authentication Data
 * Adds Google account cookies/localStorage to ensure labs.google login works
 * These credentials from your manual Google login
 */

import fs from 'fs';
import path from 'path';

const authDir = path.join(process.cwd(), '.sessions');
const googleAuthFile = path.join(authDir, 'google-auth.json');

// Google account authentication data
// These are the credentials you provided for your google.com account
const googleAuthData = {
  timestamp: new Date().toISOString(),
  description: 'Google account authentication data for labs.google access',
  localStorage: {
    'rc::f': '0aADtQnsd1etEJDSGSOU3t98AR12nVRwTrQLF5biYsu2E6RXQh6FLnyRm-cC9QJSyDxMfblG8',
    'rc::a': 'MXZuMW10OTI0NTM4bQ=='
  },
  cookies: [
    {
      name: '__Secure-1PAPISID',
      value: 'vkwtoHjSKLjX7q1O/A5u2ssIfgAACTABz6',
      domain: '.google.com',
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'None',
      expires: Math.floor(new Date('2027-03-24T14:12:13.329Z').getTime() / 1000)
    },
    {
      name: '__Secure-1PSID',
      value: 'g.a0006wi8qlySJLYolA4R0dENkVgjgwW_LLbAPTlL3gOWHgOLU4W_Apjhk728grMX9sde9XFgbgACgYKATYSARYSFQHGX2Mi6AyCh-G9Ra0QbBZNBFiwGhoVAUF8yKoVyOToEDG9Mw2zcSgAhcrb0076',
      domain: '.google.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'None',
      expires: Math.floor(new Date('2027-03-24T14:12:13.332Z').getTime() / 1000)
    },
    {
      name: '__Secure-1PSIDCC',
      value: 'AKEyXzUh9tJPnz7c36WVLfvtWAFEEaIg5gtF2ICivXRW1rZ2xFXxOa8qjaVTI7_eoTxgFXEu8biH',
      domain: '.google.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
      expires: Math.floor(new Date('2027-02-21T00:18:54.578Z').getTime() / 1000)
    },
    {
      name: '__Secure-1PSIDTS',
      value: 'sidts-CjIBBj1CYhvvpXUuu5xMrBcE5-9ctaIXpvcBRPLDfP4GxzgVzwRkq8SA4kpSx0kUlSN6XhAA',
      domain: '.google.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'None',
      expires: Math.floor(new Date('2027-02-20T23:10:31.195Z').getTime() / 1000)
    },
    {
      name: '__Secure-3PAPISID',
      value: 'vkwtoHjSKLjX7q1O/A5u2ssIfgAACTABz6',
      domain: '.google.com',
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'None',
      expires: Math.floor(new Date('2027-03-24T14:12:13.329Z').getTime() / 1000)
    },
    {
      name: '__Secure-3PSID',
      value: 'g.a0006wi8qlySJLYolA4R0dENkVgjgwW_LLbAPTlL3gOWHgOLU4W_S4ZpYgnu3-AOCKRtnH8HDAACgYKARMSARYSFQHGX2MisgFgyjV7XLujKfF0s1hp3RoVAUF8yKqMnTUPTDkEgPx6Ii1rdQTW0076',
      domain: '.google.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'None',
      expires: Math.floor(new Date('2027-03-24T14:12:13.333Z').getTime() / 1000)
    },
    {
      name: '__Secure-3PSIDCC',
      value: 'AKEyXzWRai4taPja6iC1DcO_a8j1GN57eX3Twn0AWKtRoZxrfpdH8e_ZxxSACPMASmx8N_UKdfg',
      domain: '.google.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'None',
      expires: Math.floor(new Date('2027-02-21T00:44:07.406Z').getTime() / 1000)
    },
    {
      name: '__Secure-3PSIDTS',
      value: 'sidts-CjIBBj1CYhvvpXUuu5xMrBcE5-9ctaIXpvcBRPLDfP4GxzgVzwRkq8SA4kpSx0kUlSN6XhAA',
      domain: '.google.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'None',
      expires: Math.floor(new Date('2027-02-20T23:10:31.195Z').getTime() / 1000)
    },
    {
      name: '__Secure-BUCKET',
      value: 'CDo',
      domain: '.google.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
      expires: Math.floor(new Date('2026-08-09T04:46:47.159Z').getTime() / 1000)
    },
    {
      name: 'AEC',
      value: 'AaJma5uhQ2Hqidf8Y9UCTRgow_QEwtSp1RAbv-EhHrUAnN_d4BgikZw9Lw',
      domain: '.google.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
      expires: Math.floor(new Date('2026-08-09T11:27:12.283Z').getTime() / 1000)
    },
    {
      name: 'APISID',
      value: 'i3Ck0A-VKv7QsXQE/AI5JvvNFusTLywvIv',
      domain: '.google.com',
      path: '/',
      secure: false,
      httpOnly: false,
      sameSite: 'None',
      expires: Math.floor(new Date('2027-03-24T14:12:13.329Z').getTime() / 1000)
    },
    {
      name: 'HSID',
      value: 'A1OUV2Min5-cFut8d',
      domain: '.google.com',
      path: '/',
      secure: false,
      httpOnly: true,
      sameSite: 'None',
      expires: Math.floor(new Date('2027-03-24T14:12:13.328Z').getTime() / 1000)
    },
    {
      name: 'SAPISID',
      value: 'vkwtoHjSKLjX7q1O/A5u2ssIfgAACTABz6',
      domain: '.google.com',
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'None',
      expires: Math.floor(new Date('2027-03-24T14:12:13.329Z').getTime() / 1000)
    },
    {
      name: 'SEARCH_SAMESITE',
      value: 'CgQIkaAB',
      domain: '.google.com',
      path: '/',
      secure: false,
      httpOnly: false,
      sameSite: 'Strict',
      expires: Math.floor(new Date('2026-08-12T09:49:55.139Z').getTime() / 1000)
    },
    {
      name: 'SID',
      value: 'g.a0006wi8qlySJLYolA4R0dENkVgjgwW_LLbAPTlL3gOWHgOLU4W_dMTKPWDbZVzyzyrRljE7XQACgYKAV8SARYSFQHGX2MiOIhRF-qLW0BPnEE1rbGblxoVAUF8yKqMgxwIqanzs4uHYESq9aSs0076',
      domain: '.google.com',
      path: '/',
      secure: false,
      httpOnly: false,
      sameSite: 'None',
      expires: Math.floor(new Date('2027-03-24T14:12:13.332Z').getTime() / 1000)
    },
    {
      name: 'SIDCC',
      value: 'AKEyXzV-YTIm5Fuv4DCKoIunsxrb2WqtJaS4sHVRClv902AZhOMfVV4EVGTibg8Oeik6uMwCj-s',
      domain: '.google.com',
      path: '/',
      secure: false,
      httpOnly: false,
      sameSite: 'None',
      expires: Math.floor(new Date('2027-02-21T00:18:54.578Z').getTime() / 1000)
    },
    {
      name: 'SSID',
      value: 'AL2QxxKWK9_cRs7Ss',
      domain: '.google.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'None',
      expires: Math.floor(new Date('2027-03-24T14:12:13.328Z').getTime() / 1000)
    }
  ]
};

// Ensure directory exists
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

// Save to file
fs.writeFileSync(googleAuthFile, JSON.stringify(googleAuthData, null, 2));

console.log('✅ Google authentication data saved!');
console.log(`📁 File: ${googleAuthFile}`);
console.log(`\nContents:`);
console.log(`   • localStorage items: ${Object.keys(googleAuthData.localStorage).length}`);
console.log(`   • Cookies: ${googleAuthData.cookies.length}`);
console.log(`\nThis can be used to pre-fill Google authentication when needed.`);
console.log(`Note: These credentials expire around 2027-03-24`);
