import { defineConfig } from 'vite'
import obfuscatorPlugin from 'rollup-plugin-obfuscator'

export default defineConfig({
  base: '/pinguinocracia2/',
  server: {
    port: 3000
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      plugins: [
        obfuscatorPlugin({
          options: {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.5,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.2,
            stringArray: true,
            stringArrayThreshold: 0.5,
            stringArrayEncoding: ['base64'],
            renameGlobals: false,
            selfDefending: false,
            identifierNamesGenerator: 'hexadecimal'
          }
        })
      ]
    }
  }
})
