// service-worker.js - Versão 2.2
const CACHE_NAME = 'ciente-hrv-cache-v6';
const APP_VERSION = '2.2';
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './service-worker.js',
  './icon-192.png',
  './icon-512.png'
];

// ===== INSTALAÇÃO =====
self.addEventListener('install', event => {
  console.log(`[SW v${APP_VERSION}] Inst
