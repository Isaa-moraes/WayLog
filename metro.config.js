const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 1. Permite que o resolvedor web reconheça arquivos WebAssembly (.wasm)
config.resolver.webextensions = [
  ...(config.resolver.webextensions || []),
  'wasm',
];

// 2. ADICIONA .wasm AOS ASSETS PRESILHANDO AS EXTENSÕES PADRÕES (Resolve o erro do Worker)
config.resolver.assetExts = [
  ...(config.resolver.assetExts || []),
  'wasm'
];

// 3. OBRIGATÓRIO PARA EXPO-SQLITE WEB: Define as políticas de segurança Cross-Origin exigidas pela Web
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  };
};

module.exports = config;